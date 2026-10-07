package com.weiran.system.infrastructure.identity;

import com.fasterxml.jackson.databind.JsonNode;
import com.weiran.system.domain.identity.ExternalIdentity;
import com.weiran.system.domain.identity.ExternalIdentityProvider;
import com.weiran.system.domain.identity.SsoState;
import de.thetaphi.forbiddenapis.SuppressForbidden;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.security.Jwk;
import io.jsonwebtoken.security.JwkSet;
import io.jsonwebtoken.security.Jwks;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;

/**
 * OIDC 提供方：授权码流程 + PKCE（S256）+ state + nonce；id_token 用提供方 JWKS 验签。
 *
 * <p>端点从 {@code <issuer>/.well-known/openid-configuration} 取，首次使用时加载并缓存；JWKS 也缓存，
 * 按 {@code kid} 找不到时刷新一次（提供方轮换密钥）。任何失败都返回空，由调用方统一按 40102 处理；
 * 日志只记提供方与原因，不记授权码、令牌与密钥（宪法 CP-9）。
 */
@Slf4j
final class OidcIdentityProvider implements ExternalIdentityProvider {

    private static final long CLOCK_SKEW_SECONDS = 60;

    private final String id;

    private final String name;

    private final String issuer;

    private final String clientId;

    private final @Nullable String clientSecret;

    private final String scopes;

    private final boolean autoProvision;

    private final Set<String> defaultRoleCodes;

    private final boolean logout;

    private final HttpJson http;

    private final Clock clock;

    private volatile @Nullable Discovery discovery;

    private final Map<String, Key> keys = new ConcurrentHashMap<>();

    /** OIDC discovery 里用到的端点。 */
    private record Discovery(
            String issuer,
            String authorizationEndpoint,
            String tokenEndpoint,
            String jwksUri,
            @Nullable String endSessionEndpoint) {}

    @SuppressWarnings("checkstyle:ParameterNumber")
    OidcIdentityProvider(
            final String id,
            final String name,
            final String issuer,
            final String clientId,
            final @Nullable String clientSecret,
            final String scopes,
            final boolean autoProvision,
            final Set<String> defaultRoleCodes,
            final boolean logout,
            final HttpJson http,
            final Clock clock) {
        this.id = id;
        this.name = name;
        this.issuer = issuer.endsWith("/") ? issuer.substring(0, issuer.length() - 1) : issuer;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.scopes = scopes;
        this.autoProvision = autoProvision;
        this.defaultRoleCodes = Set.copyOf(defaultRoleCodes);
        this.logout = logout;
        this.http = http;
        this.clock = clock;
    }

    @Override
    public String id() {
        return this.id;
    }

    @Override
    public String type() {
        return "oidc";
    }

    @Override
    public String name() {
        return this.name;
    }

    @Override
    public boolean autoProvision() {
        return this.autoProvision;
    }

    @Override
    public Set<String> defaultRoleCodes() {
        return this.defaultRoleCodes;
    }

    @Override
    public String authorizeUrl(final SsoState state, final String callbackUrl) {
        final Map<String, String> query = new LinkedHashMap<>();
        query.put("response_type", "code");
        query.put("client_id", this.clientId);
        query.put("redirect_uri", callbackUrl);
        query.put("scope", this.scopes);
        query.put("state", state.state());
        query.put("nonce", state.nonce());
        query.put("code_challenge", OidcIdentityProvider.codeChallenge(state.codeVerifier()));
        query.put("code_challenge_method", "S256");
        return this.discovery().authorizationEndpoint() + "?" + OidcIdentityProvider.query(query);
    }

    @Override
    public Optional<ExternalIdentity> complete(
            final Map<String, String> params, final SsoState state, final String callbackUrl) {
        if (params.containsKey("error")) {
            OidcIdentityProvider.log.warn("OIDC 授权被拒绝: provider={} error={}", this.id, params.get("error"));
            return Optional.empty();
        }
        final String code = params.get("code");
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        try {
            final Map<String, String> form = new LinkedHashMap<>();
            form.put("grant_type", "authorization_code");
            form.put("code", code);
            form.put("redirect_uri", callbackUrl);
            form.put("client_id", this.clientId);
            form.put("code_verifier", state.codeVerifier());
            final String secret = this.clientSecret;
            if (secret != null && !secret.isBlank()) {
                form.put("client_secret", secret);
            }
            final String idToken = this.http
                    .postForm(this.discovery().tokenEndpoint(), form)
                    .path("id_token")
                    .asText("");
            if (idToken.isBlank()) {
                OidcIdentityProvider.log.warn("OIDC 令牌响应缺少 id_token: provider={}", this.id);
                return Optional.empty();
            }
            return this.verifyIdToken(idToken, state.nonce());
        } catch (final IOException | IllegalStateException ex) {
            OidcIdentityProvider.log.warn("OIDC 换码失败: provider={} - {}", this.id, ex.getMessage());
            return Optional.empty();
        } catch (final InterruptedException ex) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

    // jjwt 的 Clock 只接受 java.util.Date；这里是唯一的转换边界（同 JwtTokenCodec）。
    @SuppressForbidden
    Optional<ExternalIdentity> verifyIdToken(final String idToken, final String expectedNonce) {
        try {
            final Claims claims = Jwts.parser()
                    .keyLocator(new LocatorAdapter<Key>() {
                        @Override
                        protected Key locate(final JwsHeader header) {
                            return OidcIdentityProvider.this.key(header.getKeyId());
                        }
                    })
                    .requireIssuer(this.discovery().issuer())
                    .requireAudience(this.clientId)
                    .clockSkewSeconds(CLOCK_SKEW_SECONDS)
                    .clock(() -> Date.from(this.clock.instant()))
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();
            if (!expectedNonce.equals(claims.get("nonce", String.class))) {
                OidcIdentityProvider.log.warn("OIDC nonce 不符: provider={}", this.id);
                return Optional.empty();
            }
            final String subject = claims.getSubject();
            if (subject == null || subject.isBlank()) {
                return Optional.empty();
            }
            final boolean emailVerified = Boolean.TRUE.equals(claims.get("email_verified", Boolean.class));
            return Optional.of(new ExternalIdentity(
                    this.id,
                    subject,
                    claims.get("preferred_username", String.class),
                    claims.get("name", String.class),
                    emailVerified ? claims.get("email", String.class) : null));
        } catch (final JwtException | IllegalArgumentException | IllegalStateException ex) {
            OidcIdentityProvider.log.warn(
                    "OIDC id_token 校验失败: provider={} - {}",
                    this.id,
                    ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    @Override
    public Optional<String> logoutUrl(final String postLogoutRedirect) {
        if (!this.logout) {
            return Optional.empty();
        }
        final String endpoint;
        try {
            endpoint = this.discovery().endSessionEndpoint();
        } catch (final IllegalStateException ex) {
            return Optional.empty();
        }
        if (endpoint == null) {
            return Optional.empty();
        }
        final Map<String, String> query = new LinkedHashMap<>();
        query.put("client_id", this.clientId);
        query.put("post_logout_redirect_uri", postLogoutRedirect);
        return Optional.of(endpoint + "?" + OidcIdentityProvider.query(query));
    }

    private Discovery discovery() {
        Discovery current = this.discovery;
        if (current == null) {
            synchronized (this) {
                current = this.discovery;
                if (current == null) {
                    current = this.loadDiscovery();
                    this.discovery = current;
                }
            }
        }
        return current;
    }

    private Discovery loadDiscovery() {
        try {
            final JsonNode json = this.http.get(this.issuer + "/.well-known/openid-configuration");
            final String endSession = json.path("end_session_endpoint").asText("");
            return new Discovery(
                    OidcIdentityProvider.required(json, "issuer"),
                    OidcIdentityProvider.required(json, "authorization_endpoint"),
                    OidcIdentityProvider.required(json, "token_endpoint"),
                    OidcIdentityProvider.required(json, "jwks_uri"),
                    endSession.isBlank() ? null : endSession);
        } catch (final IOException ex) {
            OidcIdentityProvider.log.error("OIDC discovery 加载失败: provider={} - {}", this.id, ex.getMessage());
            throw new IllegalStateException("OIDC discovery 加载失败: " + this.id, ex);
        } catch (final InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("OIDC discovery 被中断: " + this.id, ex);
        }
    }

    /** 按 kid 取验签公钥；缓存里没有时刷新一次 JWKS（提供方轮换密钥）。 */
    private Key key(final @Nullable String kid) {
        if (kid != null) {
            final Key cached = this.keys.get(kid);
            if (cached != null) {
                return cached;
            }
        }
        this.refreshKeys();
        if (kid == null && this.keys.size() == 1) {
            return this.keys.values().iterator().next();
        }
        final Key key = kid == null ? null : this.keys.get(kid);
        if (key == null) {
            throw new IllegalStateException("JWKS 里找不到 kid");
        }
        return key;
    }

    private void refreshKeys() {
        try {
            final JsonNode json = this.http.get(this.discovery().jwksUri());
            final JwkSet set = Jwks.setParser()
                    .ignoreUnsupported(true)
                    .build()
                    .parse(this.http.objectMapper().writeValueAsString(json));
            final Map<String, Key> fresh = new ConcurrentHashMap<>();
            for (final Jwk<?> jwk : set) {
                final String use = jwk.get("use") instanceof String value ? value : "sig";
                final String keyId = jwk.getId();
                if ("sig".equals(use) && keyId != null) {
                    fresh.put(keyId, jwk.toKey());
                }
            }
            this.keys.clear();
            this.keys.putAll(fresh);
        } catch (final IOException ex) {
            throw new IllegalStateException("JWKS 加载失败: " + ex.getMessage(), ex);
        } catch (final InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("JWKS 加载被中断", ex);
        }
    }

    static String codeChallenge(final String verifier) {
        try {
            final byte[] digest =
                    MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (final NoSuchAlgorithmException ex) {
            throw new IllegalStateException("JDK 缺少 SHA-256", ex);
        }
    }

    private static String required(final JsonNode json, final String field) throws IOException {
        final String value = json.path(field).asText("");
        if (value.isBlank()) {
            throw new IOException("discovery 缺少 " + field);
        }
        return value;
    }

    private static String query(final Map<String, String> params) {
        final StringBuilder builder = new StringBuilder();
        params.forEach((key, value) -> {
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(HttpJson.encode(key)).append('=').append(HttpJson.encode(value));
        });
        return builder.toString();
    }
}

package com.weiran.system.infrastructure.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.weiran.system.domain.identity.ExternalIdentity;
import com.weiran.system.domain.identity.SsoMode;
import com.weiran.system.domain.identity.SsoState;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Jwks;
import io.jsonwebtoken.security.RsaPrivateJwk;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 流程状态签名、CAS 验票解析、OIDC id_token 校验（本地 JDK HttpServer 模拟提供方）。 */
class IdentityInfrastructureTest {

    private static final String SECRET = "unit-test-secret-key-at-least-32-bytes!";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final List<String> requests = new ArrayList<>();

    private HttpServer server;

    private String base;

    private String casResponse = "{}";

    private String jwks = "{\"keys\":[]}";

    @BeforeEach
    void startServer() throws IOException {
        this.server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        this.base = "http://" + InetAddress.getLoopbackAddress().getHostAddress() + ":"
                + this.server.getAddress().getPort();
        this.server.createContext("/", exchange -> {
            this.requests.add(exchange.getRequestURI().toString());
            final String path = exchange.getRequestURI().getPath();
            final String body;
            if (path.endsWith("/p3/serviceValidate")) {
                body = this.casResponse;
            } else if (path.endsWith("/.well-known/openid-configuration")) {
                body = "{\"issuer\":\"" + this.base + "/realm\",\"authorization_endpoint\":\"" + this.base
                        + "/auth\",\"token_endpoint\":\"" + this.base + "/token\",\"jwks_uri\":\"" + this.base
                        + "/jwks\",\"end_session_endpoint\":\"" + this.base + "/logout\"}";
            } else if (path.endsWith("/jwks")) {
                body = this.jwks;
            } else {
                body = "{}";
            }
            final byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        });
        this.server.start();
    }

    @AfterEach
    void stopServer() {
        this.server.stop(0);
    }

    private HttpJson http() {
        return new HttpJson(HttpClient.newHttpClient(), this.objectMapper);
    }

    private static SsoState state(final Instant expiresAt) {
        return new SsoState("kc", "st-1", "nonce-1", "verifier-1", "/x", SsoMode.BIND, 7L, expiresAt);
    }

    @Test
    @DisplayName("流程状态签名：往返一致；篡改、过期、格式错误都校验失败")
    void signsAndVerifiesState() {
        final HmacSsoStateSigner signer = new HmacSsoStateSigner(SECRET, this.objectMapper);
        final Instant now = Instant.parse("2026-10-06T00:00:00Z");
        final SsoState state = IdentityInfrastructureTest.state(now.plusSeconds(600));
        final String signed = signer.sign(state);

        assertThat(signer.verify(signed, now)).contains(state);
        assertThat(signer.verify(signed, now.plusSeconds(600))).isEmpty();
        assertThat(signer.verify(signed.substring(0, signed.length() - 2) + "AA", now))
                .isEmpty();
        assertThat(signer.verify("x" + signed, now)).isEmpty();
        assertThat(signer.verify("garbage", now)).isEmpty();
        assertThat(new HmacSsoStateSigner("another-secret-key-at-least-32-bytes!!", this.objectMapper)
                        .verify(signed, now))
                .isEmpty();
    }

    @Test
    @DisplayName("CAS：跳转与验票用同一个带 state 的 service；成功解析 user 与属性，失败返回空")
    void validatesCasTicket() {
        final CasIdentityProvider cas =
                new CasIdentityProvider("cas", "CAS", this.base + "/cas/", false, Set.of(), true, this.http());
        final SsoState state = IdentityInfrastructureTest.state(Instant.MAX);
        final String callback = "https://admin.example.com/api/auth/sso/cas/callback";
        assertThat(cas.authorizeUrl(state, callback))
                .startsWith(this.base + "/cas/login?service=")
                .contains("state%3Dst-1");

        this.casResponse = "{\"serviceResponse\":{\"authenticationSuccess\":{\"user\":\"zhangsan\","
                + "\"attributes\":{\"displayName\":[\"张三\"],\"mail\":\"z@example.com\"}}}}";
        assertThat(cas.complete(Map.of("ticket", "ST-1", "state", "st-1"), state, callback))
                .contains(new ExternalIdentity("cas", "zhangsan", "zhangsan", "张三", "z@example.com"));
        assertThat(this.requests.get(this.requests.size() - 1))
                .contains("format=JSON")
                .contains("ticket=ST-1")
                .contains("callback%3Fstate%3Dst-1");

        this.casResponse = "{\"serviceResponse\":{\"authenticationFailure\":{\"code\":\"INVALID_TICKET\"}}}";
        assertThat(cas.complete(Map.of("ticket", "ST-2"), state, callback)).isEmpty();
        assertThat(cas.complete(Map.of(), state, callback)).isEmpty();
        assertThat(cas.logoutUrl("https://admin.example.com/login"))
                .contains(this.base + "/cas/logout?service=https%3A%2F%2Fadmin.example.com%2Flogin");
    }

    @Test
    @DisplayName("OIDC：id_token 用 JWKS 验签，校验 iss / aud / nonce；签名、受众、nonce 错误都返回空")
    void verifiesOidcIdToken() {
        final KeyPair keys = Jwts.SIG.RS256.keyPair().build();
        final RsaPrivateJwk jwk = Jwks.builder().rsaKeyPair(keys).id("k1").build();
        this.jwks = "{\"keys\":[" + IdentityInfrastructureTest.publicJwkJson(jwk) + "]}";
        final OidcIdentityProvider oidc = new OidcIdentityProvider(
                "kc",
                "KC",
                this.base + "/realm",
                "weiran4j",
                null,
                "openid",
                false,
                Set.of(),
                true,
                this.http(),
                Clock.systemUTC());

        final String good = Jwts.builder()
                .header()
                .keyId("k1")
                .and()
                .issuer(this.base + "/realm")
                .audience()
                .add("weiran4j")
                .and()
                .subject("sub-1")
                .claim("nonce", "n1")
                .claim("preferred_username", "zhangsan")
                .claim("email", "z@example.com")
                .claim("email_verified", true)
                .claim("exp", Instant.now().plusSeconds(300).getEpochSecond())
                .signWith(keys.getPrivate())
                .compact();
        assertThat(oidc.verifyIdToken(good, "n1"))
                .contains(new ExternalIdentity("kc", "sub-1", "zhangsan", null, "z@example.com"));
        assertThat(oidc.verifyIdToken(good, "other-nonce")).isEmpty();

        final String wrongAudience = Jwts.builder()
                .header()
                .keyId("k1")
                .and()
                .issuer(this.base + "/realm")
                .audience()
                .add("someone-else")
                .and()
                .subject("sub-1")
                .claim("nonce", "n1")
                .claim("exp", Instant.now().plusSeconds(300).getEpochSecond())
                .signWith(keys.getPrivate())
                .compact();
        assertThat(oidc.verifyIdToken(wrongAudience, "n1")).isEmpty();

        final KeyPair attacker = Jwts.SIG.RS256.keyPair().build();
        final String forged = Jwts.builder()
                .header()
                .keyId("k1")
                .and()
                .issuer(this.base + "/realm")
                .audience()
                .add("weiran4j")
                .and()
                .subject("sub-1")
                .claim("nonce", "n1")
                .claim("exp", Instant.now().plusSeconds(300).getEpochSecond())
                .signWith(attacker.getPrivate())
                .compact();
        assertThat(oidc.verifyIdToken(forged, "n1")).isEmpty();

        assertThat(oidc.authorizeUrl(IdentityInfrastructureTest.state(Instant.MAX), "https://a/cb"))
                .startsWith(this.base + "/auth?response_type=code&client_id=weiran4j")
                .contains("code_challenge_method=S256")
                .contains("state=st-1")
                .contains("nonce=nonce-1")
                .doesNotContain("verifier-1");
        assertThat(oidc.logoutUrl("https://a/login"))
                .contains(this.base + "/logout?client_id=weiran4j&post_logout_redirect_uri=https%3A%2F%2Fa%2Flogin");
        assertThat(oidc.complete(
                        Map.of("error", "access_denied"),
                        IdentityInfrastructureTest.state(Instant.MAX),
                        "https://a/cb"))
                .isEqualTo(Optional.empty());
    }

    @Test
    @DisplayName("提供方配置：id 不合法、类型不认识、缺少必填项时启动失败")
    void rejectsInvalidConfiguration() {
        final AuthProvidersProperties.Provider oidcWithoutIssuer = new AuthProvidersProperties.Provider(
                "oidc", null, true, null, "c", null, "openid", null, false, List.of(), true);
        assertThatThrownBy(() -> new ConfiguredExternalIdentityProviders(
                        new AuthProvidersProperties(
                                "https://a",
                                new AuthProvidersProperties.PasswordLogin(true),
                                Map.of("kc", oidcWithoutIssuer)),
                        this.objectMapper,
                        Clock.systemUTC()))
                .hasMessageContaining("issuer");
        final AuthProvidersProperties.Provider cas = new AuthProvidersProperties.Provider(
                "cas", null, true, null, null, null, "openid", this.base, false, List.of(), true);
        assertThatThrownBy(() -> new ConfiguredExternalIdentityProviders(
                        new AuthProvidersProperties(
                                "https://a", new AuthProvidersProperties.PasswordLogin(true), Map.of("Bad_Id", cas)),
                        this.objectMapper,
                        Clock.systemUTC()))
                .hasMessageContaining("Bad_Id");
        final ConfiguredExternalIdentityProviders ok = new ConfiguredExternalIdentityProviders(
                new AuthProvidersProperties(
                        "https://a/", new AuthProvidersProperties.PasswordLogin(false), Map.of("cas", cas)),
                this.objectMapper,
                Clock.systemUTC());
        assertThat(ok.publicBaseUrl()).isEqualTo("https://a");
        assertThat(ok.passwordLoginEnabled()).isFalse();
        assertThat(ok.find("cas")).isPresent();
        assertThat(ok.all()).hasSize(1);
    }

    private static String publicJwkJson(final RsaPrivateJwk jwk) {
        final StringBuilder json = new StringBuilder("{");
        jwk.toPublicJwk().forEach((key, value) -> {
            if (json.length() > 1) {
                json.append(',');
            }
            json.append('"').append(key).append("\":\"").append(value).append('"');
        });
        return json.append(",\"use\":\"sig\"}").toString();
    }
}

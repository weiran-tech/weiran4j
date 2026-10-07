package com.weiran.system.infrastructure.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.system.domain.identity.ExternalIdentityProvider;
import com.weiran.system.domain.identity.ExternalIdentityProviders;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * 从 {@code weiran.auth.providers.*} 构建提供方注册表；配置不完整时启动失败，而不是等到有人点登录才报错。
 */
public final class ConfiguredExternalIdentityProviders implements ExternalIdentityProviders {

    /** 提供方 id 会出现在回调路径里：只允许小写字母、数字与横线，字母开头，2–32 位。 */
    private static final Pattern VALID_ID = Pattern.compile("[a-z][a-z0-9-]{1,31}");

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);

    private final Map<String, ExternalIdentityProvider> providers;

    private final boolean passwordLoginEnabled;

    private final String publicBaseUrl;

    /** 构造注册表。 */
    public ConfiguredExternalIdentityProviders(
            final AuthProvidersProperties properties, final ObjectMapper objectMapper, final Clock clock) {
        final HttpJson http = new HttpJson(
                HttpClient.newBuilder()
                        .connectTimeout(CONNECT_TIMEOUT)
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build(),
                objectMapper);
        final Map<String, ExternalIdentityProvider> built = new TreeMap<>();
        properties.providers().forEach((id, config) -> {
            if (config.enabled()) {
                built.put(id, ConfiguredExternalIdentityProviders.build(id, config, http, clock));
            }
        });
        this.providers = Map.copyOf(built);
        this.passwordLoginEnabled = properties.passwordLogin().enabled();
        final String base = properties.publicBaseUrl().strip();
        this.publicBaseUrl = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    private static ExternalIdentityProvider build(
            final String id, final AuthProvidersProperties.Provider config, final HttpJson http, final Clock clock) {
        if (!VALID_ID.matcher(id).matches()) {
            throw new IllegalStateException("weiran.auth.providers 的 id「" + id + "」不合法：小写字母开头，2–32 位小写字母、数字或横线");
        }
        final String name = config.name() == null || config.name().isBlank() ? id : config.name();
        final Set<String> roles = Set.copyOf(config.defaultRoles());
        return switch (config.type().strip().toLowerCase(Locale.ROOT)) {
            case "oidc" ->
                new OidcIdentityProvider(
                        id,
                        name,
                        ConfiguredExternalIdentityProviders.require(id, "issuer", config.issuer()),
                        ConfiguredExternalIdentityProviders.require(id, "client-id", config.clientId()),
                        config.clientSecret(),
                        config.scopes(),
                        config.autoProvision(),
                        roles,
                        config.logout(),
                        http,
                        clock);
            case "cas" ->
                new CasIdentityProvider(
                        id,
                        name,
                        ConfiguredExternalIdentityProviders.require(id, "server-url", config.serverUrl()),
                        config.autoProvision(),
                        roles,
                        config.logout(),
                        http);
            default ->
                throw new IllegalStateException(
                        "weiran.auth.providers." + id + ".type 只能是 oidc 或 cas，当前为「" + config.type() + "」");
        };
    }

    private static String require(final String id, final String field, final @Nullable String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("weiran.auth.providers." + id + "." + field + " 未配置");
        }
        return value.strip();
    }

    @Override
    public List<ExternalIdentityProvider> all() {
        return new ArrayList<>(new TreeMap<>(this.providers).values());
    }

    @Override
    public Optional<ExternalIdentityProvider> find(final String id) {
        return Optional.ofNullable(this.providers.get(id));
    }

    @Override
    public boolean passwordLoginEnabled() {
        return this.passwordLoginEnabled;
    }

    @Override
    public String publicBaseUrl() {
        return this.publicBaseUrl;
    }
}

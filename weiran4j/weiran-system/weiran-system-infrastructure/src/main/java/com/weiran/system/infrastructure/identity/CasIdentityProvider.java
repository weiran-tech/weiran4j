package com.weiran.system.infrastructure.identity;

import com.fasterxml.jackson.databind.JsonNode;
import com.weiran.system.domain.identity.ExternalIdentity;
import com.weiran.system.domain.identity.ExternalIdentityProvider;
import com.weiran.system.domain.identity.SsoState;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;

/**
 * CAS 3.0 提供方：{@code /login?service=…} 跳转，{@code /p3/serviceValidate?format=JSON} 验票。
 *
 * <p>{@code service} = 回调地址 + {@code ?state=…}：CAS 把 ticket 追加在它后面回调，验票时必须用完全相同的
 * {@code service}；state 因此也能在回调里核对，防登录 CSRF。
 */
@Slf4j
final class CasIdentityProvider implements ExternalIdentityProvider {

    private final String id;

    private final String name;

    private final String serverUrl;

    private final boolean autoProvision;

    private final Set<String> defaultRoleCodes;

    private final boolean logout;

    private final HttpJson http;

    CasIdentityProvider(
            final String id,
            final String name,
            final String serverUrl,
            final boolean autoProvision,
            final Set<String> defaultRoleCodes,
            final boolean logout,
            final HttpJson http) {
        this.id = id;
        this.name = name;
        this.serverUrl = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
        this.autoProvision = autoProvision;
        this.defaultRoleCodes = Set.copyOf(defaultRoleCodes);
        this.logout = logout;
        this.http = http;
    }

    @Override
    public String id() {
        return this.id;
    }

    @Override
    public String type() {
        return "cas";
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
        return this.serverUrl + "/login?service=" + HttpJson.encode(CasIdentityProvider.service(callbackUrl, state));
    }

    @Override
    public Optional<ExternalIdentity> complete(
            final Map<String, String> params, final SsoState state, final String callbackUrl) {
        final String ticket = params.get("ticket");
        if (ticket == null || ticket.isBlank()) {
            return Optional.empty();
        }
        final String url = this.serverUrl + "/p3/serviceValidate?format=JSON&service="
                + HttpJson.encode(CasIdentityProvider.service(callbackUrl, state)) + "&ticket="
                + HttpJson.encode(ticket);
        try {
            final JsonNode success = this.http.get(url).path("serviceResponse").path("authenticationSuccess");
            final String user = success.path("user").asText("");
            if (user.isBlank()) {
                CasIdentityProvider.log.warn("CAS 验票未通过: provider={}", this.id);
                return Optional.empty();
            }
            final JsonNode attributes = success.path("attributes");
            return Optional.of(new ExternalIdentity(
                    this.id,
                    user,
                    user,
                    CasIdentityProvider.firstText(attributes, "displayName", "name", "cn"),
                    CasIdentityProvider.firstText(attributes, "mail", "email")));
        } catch (final IOException ex) {
            // 只记状态与主机，不记 ticket（宪法 CP-9）。
            CasIdentityProvider.log.warn("CAS 验票请求失败: provider={} - {}", this.id, ex.getMessage());
            return Optional.empty();
        } catch (final InterruptedException ex) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

    @Override
    public Optional<String> logoutUrl(final String postLogoutRedirect) {
        return this.logout
                ? Optional.of(this.serverUrl + "/logout?service=" + HttpJson.encode(postLogoutRedirect))
                : Optional.empty();
    }

    static String service(final String callbackUrl, final SsoState state) {
        return callbackUrl + "?state=" + HttpJson.encode(state.state());
    }

    /** CAS 属性的值可能是字符串也可能是数组，取第一个非空文本。 */
    private static @Nullable String firstText(final JsonNode attributes, final String... names) {
        for (final String name : names) {
            final JsonNode node = attributes.path(name);
            final JsonNode value = node.isArray() && !node.isEmpty() ? node.get(0) : node;
            if (value.isTextual() && !value.asText().isBlank()) {
                return value.asText();
            }
        }
        return null;
    }
}

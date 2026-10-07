package com.weiran.system.infrastructure.identity;

import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * {@code weiran.auth.*} 里与外部登录相关的配置（{@code jwt} / {@code cookie} 由各自的配置类读取）。
 *
 * <p>提供方用环境变量配置，例如 {@code WEIRAN_AUTH_PROVIDERS_KEYCLOAK_TYPE=oidc}（见 docs/02-部署.md）。
 *
 * @param publicBaseUrl 对外访问地址（不带结尾斜杠），拼回调与登出回跳；不从请求头推断，防 Host 头注入
 * @param passwordLogin 密码登录开关
 * @param providers 提供方，键为提供方 id
 */
@ConfigurationProperties("weiran.auth")
public record AuthProvidersProperties(
        @DefaultValue("http://localhost:5373") String publicBaseUrl,
        @DefaultValue PasswordLogin passwordLogin,
        @DefaultValue Map<String, Provider> providers) {

    /**
     * 密码登录。
     *
     * @param enabled 关闭后只有内置超管能用密码登录（应急入口）
     */
    public record PasswordLogin(@DefaultValue("true") boolean enabled) {}

    /**
     * 一个外部身份提供方。
     *
     * @param type {@code oidc} 或 {@code cas}
     * @param name 登录页显示名称，默认用 id
     * @param enabled 是否启用
     * @param issuer OIDC issuer（用它的 discovery 文档找各端点）
     * @param clientId OIDC client_id
     * @param clientSecret OIDC client_secret（只走环境变量）
     * @param scopes OIDC scope
     * @param serverUrl CAS 服务前缀，如 {@code https://cas.example.com/cas}
     * @param autoProvision 未绑定时是否自动开通本地用户
     * @param defaultRoles 自动开通时赋予的角色编码
     * @param logout 登出本系统时是否跳到提供方一并登出
     */
    public record Provider(
            String type,
            @Nullable String name,
            @DefaultValue("true") boolean enabled,
            @Nullable String issuer,
            @Nullable String clientId,
            @Nullable String clientSecret,
            @DefaultValue("openid profile email") String scopes,
            @Nullable String serverUrl,
            @DefaultValue("false") boolean autoProvision,
            @DefaultValue List<String> defaultRoles,
            @DefaultValue("true") boolean logout) {}
}

package com.weiran.system.domain.identity;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 外部身份提供方端口：一个配置项一个实例（CAS / OIDC 各有实现）。
 *
 * <p>实现负责协议细节（跳转地址、换码 / 验票、签名校验）；映射到本地用户、开通、签发令牌都不在这里。
 */
public interface ExternalIdentityProvider {

    /** 提供方 id（配置键，出现在回调路径里）。 */
    String id();

    /** {@code oidc} 或 {@code cas}。 */
    String type();

    /** 登录页上显示的名称。 */
    String name();

    /** 未绑定的外部身份是否自动开通本地用户。 */
    boolean autoProvision();

    /** 自动开通时赋予的角色编码。 */
    Set<String> defaultRoleCodes();

    /** 跳往提供方的地址。 */
    String authorizeUrl(SsoState state, String callbackUrl);

    /**
     * 处理回调：换码 / 验票并校验。任何校验失败都返回空（调用方统一按 40102 处理），不抛异常。
     *
     * @param params 回调的查询参数
     * @param state 已验签的流程状态
     * @param callbackUrl 与 {@link #authorizeUrl} 时相同的回调地址
     */
    Optional<ExternalIdentity> complete(Map<String, String> params, SsoState state, String callbackUrl);

    /** 提供方的登出地址；未配置登出时为空。 */
    Optional<String> logoutUrl(String postLogoutRedirect);
}

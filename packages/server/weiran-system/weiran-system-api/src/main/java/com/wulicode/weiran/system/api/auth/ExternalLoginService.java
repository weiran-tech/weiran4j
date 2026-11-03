package com.wulicode.weiran.system.api.auth;

import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * 外部身份登录与绑定（D-015）。
 *
 * <p>authorize / callback 是浏览器整页导航，结果一律表达为跳转（{@link SsoRedirect}），失败时跳到
 * {@code /login?ssoError=<code>}（绑定模式为 {@code /profile?ssoError=<code>}），不抛异常。
 */
public interface ExternalLoginService {

    /** 登录页需要的认证方式。 */
    ProvidersView providers();

    /**
     * 发起外部登录。
     *
     * @param provider 提供方 id
     * @param redirect 成功后回到的站内路径（会被规范化）
     * @param mode {@code login} 或 {@code bind}
     * @param currentUserId 当前登录用户；绑定模式必须非空
     */
    SsoRedirect authorize(String provider, @Nullable String redirect, String mode, @Nullable Long currentUserId);

    /**
     * 处理回调。
     *
     * @param provider 路径里的提供方 id
     * @param params 回调查询参数
     * @param flowCookie 流程 Cookie 的值
     * @param client 客户端信息（写登录日志）
     */
    SsoRedirect callback(
            String provider, Map<String, String> params, @Nullable String flowCookie, ClientContext client);

    /** 本人的外部身份。 */
    List<UserIdentityView> identitiesOf(long userId);

    /**
     * 本人解绑；没有本地密码且只剩这一个外部身份时拒绝（100004）。
     *
     * @throws com.wulicode.weiran.framework.error.BizException 不存在或不属于本人（100002）、会锁死账号（100004）
     */
    void unbindOwn(long userId, long identityId);

    /**
     * 管理员手工绑定。
     *
     * @throws com.wulicode.weiran.framework.error.BizException 用户不存在（100002）、提供方未配置（100001）、外部身份已被绑定（100004）
     */
    long bind(long userId, BindIdentityCommand command);

    /** 管理员解绑（可以解绑最后一个）。 */
    void unbind(long userId, long identityId);
}

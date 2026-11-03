package com.wulicode.weiran.system.api.auth;

import org.jspecify.annotations.Nullable;

/**
 * 外部登录流程的一步结果：浏览器要去的地址，以及要写或要清的流程 Cookie。
 *
 * @param location 302 的目标地址
 * @param flowCookie 签名后的流程状态；authorize 成功时非空（写入 Cookie），其它情况为空（清除 Cookie）
 * @param login 已完成的登录结果；保留给直接完成会话的实现
 * @param candidate 外部身份已验证的用户；接口层完成手机验证后才签发令牌
 */
public record SsoRedirect(
        String location,
        @Nullable String flowCookie,
        @Nullable LoginResult login,
        @Nullable ExternalLoginCandidate candidate) {

    public SsoRedirect(final String location, final @Nullable String flowCookie, final @Nullable LoginResult login) {
        this(location, flowCookie, login, null);
    }
}

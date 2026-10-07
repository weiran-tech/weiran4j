package com.weiran.system.api.auth;

import org.jspecify.annotations.Nullable;

/**
 * 外部登录流程的一步结果：浏览器要去的地址，以及要写或要清的流程 Cookie。
 *
 * @param location 302 的目标地址
 * @param flowCookie 签名后的流程状态；authorize 成功时非空（写入 Cookie），其它情况为空（清除 Cookie）
 * @param login 回调完成登录时的令牌（接口层据此下发认证 Cookie）；其它情况为空
 */
public record SsoRedirect(
        String location,
        @Nullable String flowCookie,
        @Nullable LoginResult login) {}

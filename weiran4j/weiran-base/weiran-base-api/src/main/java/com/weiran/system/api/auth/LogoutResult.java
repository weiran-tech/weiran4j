package com.weiran.system.api.auth;

import org.jspecify.annotations.Nullable;

/**
 * 登出结果。
 *
 * @param ssoLogoutUrl 外部身份提供方的登出地址：会话来自配置了登出的提供方时非空，前端整页跳转过去；否则为 {@code null}
 */
public record LogoutResult(@Nullable String ssoLogoutUrl) {}

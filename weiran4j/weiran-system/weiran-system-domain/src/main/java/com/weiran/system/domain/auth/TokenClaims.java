package com.weiran.system.domain.auth;

import org.jspecify.annotations.Nullable;

/**
 * 访问令牌里携带的声明。
 *
 * @param userId 用户 ID（JWT {@code sub}）
 * @param username 用户名
 * @param version 签发时的令牌版本（JWT {@code ver}），与用户当前 token_version 不符即失效
 * @param idp 外部登录的提供方 id（JWT {@code idp}）；密码登录为 {@code null}
 */
public record TokenClaims(
        long userId, String username, int version, @Nullable String idp) {

    /** 密码登录的令牌（没有外部身份提供方）。 */
    public TokenClaims(final long userId, final String username, final int version) {
        this(userId, username, version, null);
    }
}

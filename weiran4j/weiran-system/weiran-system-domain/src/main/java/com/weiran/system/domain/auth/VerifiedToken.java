package com.weiran.system.domain.auth;

import org.jspecify.annotations.Nullable;

/**
 * 已通过签名、有效期、签发方与受众校验的令牌声明。
 *
 * @param issuer 签发方（JWT {@code iss}）
 * @param subject 主体（JWT {@code sub}）；本地令牌即用户 ID 的十进制文本
 * @param version 本地令牌的令牌版本（JWT {@code ver}）；外部签发方的令牌没有此项
 * @param idp 本地令牌由外部登录签发时的提供方 id（JWT {@code idp}，D-015）
 */
public record VerifiedToken(
        String issuer,
        String subject,
        @Nullable Integer version,
        @Nullable String idp) {

    /** 没有 {@code idp} 的令牌。 */
    public VerifiedToken(final String issuer, final String subject, final @Nullable Integer version) {
        this(issuer, subject, version, null);
    }
}

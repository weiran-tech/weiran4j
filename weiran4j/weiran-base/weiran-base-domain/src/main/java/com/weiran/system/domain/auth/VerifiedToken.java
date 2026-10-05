package com.weiran.system.domain.auth;

import org.jspecify.annotations.Nullable;

/**
 * 已通过签名、有效期、签发方与受众校验的令牌声明。
 *
 * @param issuer 签发方（JWT {@code iss}）
 * @param subject 主体（JWT {@code sub}）；本地令牌即用户 ID 的十进制文本
 * @param version 本地令牌的令牌版本（JWT {@code ver}）；外部签发方的令牌没有此项
 */
public record VerifiedToken(
        String issuer, String subject, @Nullable Integer version) {}

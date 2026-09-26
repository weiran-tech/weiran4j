package com.weiran.system.domain.auth;

/**
 * 访问令牌里携带的声明。
 *
 * @param userId 用户 ID（JWT {@code sub}）
 * @param username 用户名
 * @param version 签发时的令牌版本（JWT {@code ver}），与用户当前 token_version 不符即失效
 */
public record TokenClaims(long userId, String username, int version) {}

package com.weiran.system.api.auth;

/**
 * 登录结果。
 *
 * @param accessToken 访问令牌
 * @param tokenType 固定为 {@code Bearer}
 * @param expiresIn 有效期（秒）
 */
public record LoginResult(String accessToken, String tokenType, long expiresIn) {}

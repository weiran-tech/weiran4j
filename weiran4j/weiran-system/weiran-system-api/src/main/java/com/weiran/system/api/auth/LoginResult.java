package com.weiran.system.api.auth;

/**
 * 登录结果。
 *
 * @param accessToken 访问令牌；登录成功时总有值，由接口层决定放进响应体还是 Cookie（契约 §6.1）
 * @param tokenType 固定为 {@code Bearer}
 * @param expiresIn 有效期（秒）
 * @param userId 登录用户 ID
 */
public record LoginResult(String accessToken, String tokenType, long expiresIn, long userId) {}

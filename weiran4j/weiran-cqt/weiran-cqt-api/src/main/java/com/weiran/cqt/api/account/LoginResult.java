package com.weiran.cqt.api.account;

/**
 * 登录结果。
 *
 * @param accessToken 前台令牌
 * @param tokenType 固定 {@code bearer}
 * @param expiresIn 有效期（秒）
 */
public record LoginResult(String accessToken, String tokenType, long expiresIn) {}

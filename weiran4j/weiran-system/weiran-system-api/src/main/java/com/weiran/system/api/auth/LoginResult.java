package com.weiran.system.api.auth;

import java.util.Objects;

/**
 * 登录结果。
 *
 * <p>不返回密码哈希、盐值或权限明细——权限由 {@code /api/v1/auth/me} 单独取，
 * 让登录响应保持最小面。
 *
 * @param token 访问令牌
 * @param expiresInSeconds 令牌有效期秒数
 * @param accountType 账号类型
 */
public record LoginResult(String token, long expiresInSeconds, String accountType) {

    public LoginResult {
        Objects.requireNonNull(token, "token");
        Objects.requireNonNull(accountType, "accountType");
    }
}

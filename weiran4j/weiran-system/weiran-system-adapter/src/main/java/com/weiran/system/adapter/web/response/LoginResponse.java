package com.weiran.system.adapter.web.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.weiran.system.api.auth.LoginResult;
import org.jspecify.annotations.Nullable;

/**
 * 登录接口的响应体（契约 §6.1）。
 *
 * <p>浏览器模式下令牌走 HttpOnly Cookie，{@code accessToken} 为空且<b>不出现在 JSON 里</b>——
 * 字段干脆不存在，前端不会误以为能从响应体里拿到令牌；令牌模式（{@code X-Auth-Mode: token}）下才带上。
 *
 * @param accessToken 访问令牌；仅令牌模式有值
 * @param tokenType 固定为 {@code Bearer}
 * @param expiresIn 有效期（秒）
 * @param userId 登录用户 ID
 */
public record LoginResponse(
        @JsonInclude(JsonInclude.Include.NON_NULL) @Nullable String accessToken,
        String tokenType,
        long expiresIn,
        long userId) {

    /** 令牌模式：原样带上令牌。 */
    public static LoginResponse withToken(final LoginResult result) {
        return new LoginResponse(result.accessToken(), result.tokenType(), result.expiresIn(), result.userId());
    }

    /** Cookie 模式：令牌已写进 Cookie，响应体不再出现。 */
    public static LoginResponse withoutToken(final LoginResult result) {
        return new LoginResponse(null, result.tokenType(), result.expiresIn(), result.userId());
    }
}

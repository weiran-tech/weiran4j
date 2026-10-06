package com.weiran.system.domain.identity;

import java.time.Instant;
import org.jspecify.annotations.Nullable;

/**
 * authorize 与 callback 之间的流程状态，签名后放进 HttpOnly 的流程 Cookie。
 *
 * @param provider 提供方 id
 * @param state 防 CSRF 的随机值，回调时必须原样带回
 * @param nonce OIDC nonce（写进 id_token，防重放）
 * @param codeVerifier PKCE verifier
 * @param redirect 成功后回到的站内路径（已规范化）
 * @param mode 登录或绑定
 * @param bindUserId 绑定模式下发起绑定的本地用户
 * @param expiresAt 过期时间
 */
public record SsoState(
        String provider,
        String state,
        String nonce,
        String codeVerifier,
        String redirect,
        SsoMode mode,
        @Nullable Long bindUserId,
        Instant expiresAt) {}

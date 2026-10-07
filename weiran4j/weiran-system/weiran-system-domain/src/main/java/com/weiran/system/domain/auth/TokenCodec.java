package com.weiran.system.domain.auth;

import java.time.Duration;

/**
 * 本地访问令牌的签发端口（实现为 JWT HS256，带 {@code iss} / {@code aud}）。
 *
 * <p>校验不在这里：由同一实现另以 {@link TokenVerifier} 的身份注册，经认证分发器按签发方选用。
 */
public interface TokenCodec {

    /** 签发令牌。 */
    String issue(TokenClaims claims);

    /** 令牌有效期。 */
    Duration ttl();
}

package com.weiran.system.domain.auth;

import java.util.Optional;

/**
 * 令牌校验端口：一个签发方一个实现，由认证分发器按 {@link #issuer()} 选用。
 *
 * <p>宪法 CP-8：联邦校验的 change 落地前，只允许注册本地签发方的实现。
 */
public interface TokenVerifier {

    /** 本实现负责的签发方（与令牌 {@code iss} 逐字比较）。 */
    String issuer();

    /** 校验签名、有效期、签发方与受众；任何不合法都返回空，不抛异常。 */
    Optional<VerifiedToken> verify(String token);
}

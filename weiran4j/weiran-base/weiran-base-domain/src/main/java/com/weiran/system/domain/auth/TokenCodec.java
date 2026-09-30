package com.weiran.system.domain.auth;

import java.time.Duration;
import java.util.Optional;

/** 访问令牌编解码端口（实现为 JWT HS256）。 */
public interface TokenCodec {

    /** 签发令牌。 */
    String issue(TokenClaims claims);

    /** 校验签名与有效期并解析；任何不合法情况都返回空。 */
    Optional<TokenClaims> parse(String token);

    /** 令牌有效期。 */
    Duration ttl();
}

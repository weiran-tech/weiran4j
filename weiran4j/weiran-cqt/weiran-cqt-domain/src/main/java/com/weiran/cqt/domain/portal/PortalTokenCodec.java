package com.weiran.cqt.domain.portal;

import java.time.Duration;
import java.util.Optional;

/** 前台账号令牌的签发与解析。 */
public interface PortalTokenCodec {

    /**
     * 为前台账号签发令牌。
     *
     * @param accountId 账号 ID
     * @param version 账号当前的令牌版本
     * @return 令牌原文
     */
    String issue(long accountId, int version);

    /**
     * 解析令牌；签名不符、已过期、缺少声明或不是前台令牌时返回空。只校验令牌本身，不比对库中版本。
     *
     * @param token 令牌原文
     * @return 载荷
     */
    Optional<PortalTokenClaims> parse(String token);

    /** 令牌有效期。 */
    Duration ttl();
}

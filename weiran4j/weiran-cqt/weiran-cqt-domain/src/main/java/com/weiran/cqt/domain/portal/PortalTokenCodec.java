package com.weiran.cqt.domain.portal;

import java.util.Optional;

/** 前台账号令牌的签发与解析。 */
public interface PortalTokenCodec {

    /**
     * 为前台账号签发令牌。
     *
     * @param accountId 账号 ID
     * @return 令牌原文
     */
    String issue(long accountId);

    /**
     * 解析令牌；签名不符、已过期或不是前台令牌时返回空。
     *
     * @param token 令牌原文
     * @return 账号 ID
     */
    Optional<Long> parse(String token);
}

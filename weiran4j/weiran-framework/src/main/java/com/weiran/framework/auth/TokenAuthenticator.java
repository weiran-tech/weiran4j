package com.weiran.framework.auth;

import java.util.Optional;

/**
 * 令牌校验 SPI：由身份模块（weiran-system）实现。
 *
 * <p>实现需要自行处理签名、过期与吊销（token_version）；任何「令牌不可用」的情况都返回空，
 * 由拦截器统一转换成 401，不要在这里抛业务异常。
 */
public interface TokenAuthenticator {

    /**
     * 校验令牌并返回对应的登录用户。
     *
     * @param bearerToken {@code Authorization: Bearer} 之后的令牌原文
     * @return 令牌有效时返回用户快照，否则为空
     */
    Optional<LoginUser> authenticate(String bearerToken);
}

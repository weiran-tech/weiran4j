package com.weiran.cqt.api.portal;

import java.util.OptionalLong;

/** 前台认证：解析令牌并比对账号当前的令牌版本。 */
public interface PortalAuthService {

    /**
     * 认证令牌。
     *
     * @param token 令牌原文
     * @return 账号 ID；令牌无效、账号不存在或版本已过时则为空
     */
    OptionalLong authenticate(String token);
}

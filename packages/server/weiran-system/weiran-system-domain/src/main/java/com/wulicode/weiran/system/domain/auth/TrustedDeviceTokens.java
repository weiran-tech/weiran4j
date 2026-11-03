package com.wulicode.weiran.system.domain.auth;

import org.jspecify.annotations.Nullable;

/** 同一浏览器在有效期内免于重复手机验证的签名凭据。 */
public interface TrustedDeviceTokens {

    String issue(long userId, int tokenVersion, long settingsRevision);

    boolean verify(@Nullable String token, long userId, int tokenVersion, long settingsRevision, int rememberDays);
}

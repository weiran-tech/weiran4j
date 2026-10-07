package com.weiran.system.domain.identity;

import java.time.Instant;
import java.util.Optional;

/** 流程状态的签名与校验端口。被篡改、格式不对或已过期一律返回空。 */
public interface SsoStateSigner {

    /** 签名后的字符串（可直接作为 Cookie 值）。 */
    String sign(SsoState state);

    /** 校验签名与过期时间。 */
    Optional<SsoState> verify(String signed, Instant now);
}

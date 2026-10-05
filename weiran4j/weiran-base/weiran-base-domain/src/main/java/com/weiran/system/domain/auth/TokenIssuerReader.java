package com.weiran.system.domain.auth;

import java.util.Optional;

/**
 * 读出令牌声明的签发方，<b>不验签</b>：只用来决定交给哪个 {@link TokenVerifier}，结论绝不能当作可信。
 */
public interface TokenIssuerReader {

    /** 令牌格式不对或没有 {@code iss} 时返回空。 */
    Optional<String> issuerOf(String token);
}

package com.weiran.system.infrastructure.security;

import java.time.Duration;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * JWT 签发配置。
 *
 * <p>{@code secret} 没有默认值，且必须至少 32 字节：HMAC-SHA256 的密钥短于摘要长度时，
 * 安全性不会因为「能跑起来」而成立。生产环境从环境变量或 Jasypt 加密配置注入，
 * 不要写进仓库里的 yml。
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "weiran.system.jwt")
@Validated
public class JwtProperties {

    /** HMAC 密钥，至少 32 字节。 */
    private String secret = "";

    /** 令牌签发方标识，写入 {@code iss}。 */
    private String issuer = "weiran4j";

    /** 令牌有效期。 */
    private Duration ttl = Duration.ofDays(7);
}

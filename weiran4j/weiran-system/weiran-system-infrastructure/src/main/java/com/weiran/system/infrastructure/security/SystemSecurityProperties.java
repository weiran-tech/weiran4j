package com.weiran.system.infrastructure.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * {@code weiran.system.*} 安全相关配置。
 *
 * @param jwt JWT 配置
 * @param bcryptStrength BCrypt 强度（4–31），默认 10；测试可调低以加速
 */
@ConfigurationProperties("weiran.system")
public record SystemSecurityProperties(
        @DefaultValue Jwt jwt, @DefaultValue("10") int bcryptStrength) {

    /**
     * JWT 配置。
     *
     * @param secret HS256 密钥，至少 32 字节；生产由环境变量 {@code WEIRAN_JWT_SECRET} 注入
     * @param ttl 有效期，默认 12 小时
     */
    public record Jwt(
            @DefaultValue("") String secret,
            @DefaultValue("12h") Duration ttl) {}
}

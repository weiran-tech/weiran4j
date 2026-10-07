package com.weiran.system.infrastructure.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * {@code weiran.auth.jwt.*}：本地签发令牌的配置（2026-10-05 由 {@code weiran.system.jwt.*} 改名，D-014）。
 *
 * @param secret HS256 密钥，至少 32 字节；生产由环境变量 {@code WEIRAN_JWT_SECRET} 注入
 * @param ttl 有效期，默认 12 小时
 * @param issuer 签发方（JWT {@code iss}），默认 {@code weiran4j}
 * @param audience 受众（JWT {@code aud}），默认 {@code weiran4j}
 */
@ConfigurationProperties("weiran.auth.jwt")
public record AuthJwtProperties(
        @DefaultValue("") String secret,
        @DefaultValue("12h") Duration ttl,
        @DefaultValue("weiran4j") String issuer,
        @DefaultValue("weiran4j") String audience) {}

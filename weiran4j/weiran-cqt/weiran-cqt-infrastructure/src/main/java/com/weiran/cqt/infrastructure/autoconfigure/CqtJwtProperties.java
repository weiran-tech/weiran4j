package com.weiran.cqt.infrastructure.autoconfigure;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * {@code weiran.cqt.jwt.*}：前台账号令牌配置。
 *
 * @param secret HS256 密钥，至少 32 字节；生产由环境变量 {@code WEIRAN_CQT_JWT_SECRET} 注入
 * @param ttl 有效期，默认 7 天
 */
@ConfigurationProperties("weiran.cqt.jwt")
public record CqtJwtProperties(
        @DefaultValue("") String secret, @DefaultValue("7d") Duration ttl) {}

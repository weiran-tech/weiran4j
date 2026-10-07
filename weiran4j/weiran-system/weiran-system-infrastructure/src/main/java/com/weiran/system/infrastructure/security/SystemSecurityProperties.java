package com.weiran.system.infrastructure.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * {@code weiran.system.*} 安全相关配置。JWT 配置在 {@link AuthJwtProperties}（{@code weiran.auth.jwt.*}）。
 *
 * @param bcryptStrength BCrypt 强度（4–31），默认 10；测试可调低以加速
 */
@ConfigurationProperties("weiran.system")
public record SystemSecurityProperties(@DefaultValue("10") int bcryptStrength) {}

package com.wulicode.weiran.system.infrastructure.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** 密码尝试窗口与共享键容量，所有实例使用相同配置。 */
@ConfigurationProperties("weiran.auth.throttle")
public record AuthThrottleProperties(
        @DefaultValue("10") int accountLimit,
        @DefaultValue("100") int ipLimit,
        @DefaultValue("15m") Duration loginWindow,
        @DefaultValue("5") int lockLimit,
        @DefaultValue("5m") Duration lockWindow,
        @DefaultValue("10000") int maxKeys) {
    public AuthThrottleProperties {
        if (accountLimit <= 0
                || ipLimit <= 0
                || lockLimit <= 0
                || maxKeys < 2
                || loginWindow.isNegative()
                || loginWindow.isZero()
                || loginWindow.compareTo(Duration.ofDays(1)) > 0
                || lockWindow.isNegative()
                || lockWindow.isZero()
                || lockWindow.compareTo(Duration.ofDays(1)) > 0
                || loginWindow.toSeconds() < 1
                || lockWindow.toSeconds() < 1) {
            throw new IllegalArgumentException("密码节流配置必须为正值，窗口为 1 秒至 1 天，容量至少 2");
        }
    }
}

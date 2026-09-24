package com.weiran.system.infrastructure.autoconfigure;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** weiran-system 基础设施配置。 */
@Getter
@Setter
@ConfigurationProperties(prefix = "weiran.system")
@Validated
public class SystemInfrastructureProperties {

    /**
     * BCrypt 工作因子。
     *
     * <p>10 约 50ms/次（M 系列芯片）。调高会线性增加登录耗时，同时也线性增加爆破成本；
     * 改这个值不影响已有哈希——BCrypt 把工作因子编码在哈希串里，旧哈希仍按旧因子校验。
     */
    private int bcryptStrength = 10;
}

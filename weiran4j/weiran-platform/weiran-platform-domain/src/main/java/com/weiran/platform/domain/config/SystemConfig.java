package com.weiran.platform.domain.config;

import com.weiran.common.error.BizException;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/** 系统配置聚合根（不可变）。 */
@Getter
@Builder(toBuilder = true)
public final class SystemConfig {

    /** 允许匿名读取的配置键前缀。 */
    public static final String PUBLIC_PREFIX = "sys.site.";

    private final @Nullable Long id;

    private final String configKey;

    private final String configValue;

    private final ConfigType configType;

    private final @Nullable String description;

    private final boolean builtin;

    private final @Nullable LocalDateTime createdAt;

    private final @Nullable LocalDateTime updatedAt;

    /** 已持久化配置的 ID。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("配置尚未持久化");
        }
        return this.id;
    }

    /** 键是否在公开前缀下。 */
    public static boolean isPublicKey(final String configKey) {
        return configKey.startsWith(SystemConfig.PUBLIC_PREFIX);
    }

    /** 按类型校验当前值。 */
    public SystemConfig validated(final JsonSyntax jsonSyntax) {
        this.configType.validate(this.configValue, jsonSyntax);
        return this;
    }

    /** 修改配置：内置项的键不可改；新值按新类型校验。 */
    public SystemConfig withDetails(
            final String configKey,
            final String configValue,
            final ConfigType configType,
            final @Nullable String description,
            final JsonSyntax jsonSyntax) {
        if (this.builtin && !this.configKey.equals(configKey)) {
            throw BizException.conflict("内置配置的键不可修改");
        }
        return this.toBuilder()
                .configKey(configKey)
                .configValue(configValue)
                .configType(configType)
                .description(description)
                .build()
                .validated(jsonSyntax);
    }

    /** 校验能否删除：内置配置不可删。 */
    public void ensureDeletable() {
        if (this.builtin) {
            throw BizException.conflict("内置配置不可删除");
        }
    }
}

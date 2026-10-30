package com.wulicode.weiran.platform.domain.config;

import com.wulicode.weiran.framework.error.BizException;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/** 系统配置聚合根（不可变）。 */
@Getter
@Builder(toBuilder = true)
public final class SystemConfig {

    /** 允许匿名读取的配置键。 */
    public static final String PUBLIC_KEY = "system.general.title";

    /** 配置值对外约定的最大长度。 */
    public static final int MAX_VALUE_LENGTH = 65535;

    private final @Nullable Long id;

    private final String configKey;

    private final String configValue;

    private final ConfigType configType;

    private final String groupKey;

    private final String fieldType;

    private final @Nullable String fieldOptions;

    private final boolean required;

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

    /** 键是否允许公开读取。 */
    public static boolean isPublicKey(final String configKey) {
        return SystemConfig.PUBLIC_KEY.equals(configKey);
    }

    /** 新建配置及变更键或分组时，键须与所属分组保持一致。 */
    public static void requireKeyConvention(final String configKey, final String groupKey) {
        final String[] segments = configKey.split("\\.", -1);
        if (segments.length != 3
                || (!"system".equals(segments[0]) && !"sms".equals(segments[0]))
                || !groupKey.equals(segments[1])
                || !segments[2].matches("[a-z][a-z0-9_-]*")) {
            throw BizException.badRequest("configKey: 必须遵循 {range}.{group}.{value}，且 group 与配置分组一致");
        }
    }

    /** 按类型校验当前值。 */
    public SystemConfig validated(final JsonSyntax jsonSyntax) {
        this.validatedValue(jsonSyntax);
        if (!this.configKey.startsWith("system.") && !this.configKey.startsWith("sms.")) {
            throw BizException.badRequest("configKey: 必须使用 system. 或 sms. 前缀");
        }
        return this;
    }

    /** 只修改已有配置的值，保留键、分组与字段定义，并复用完整值校验。 */
    public SystemConfig withValue(final String value, final JsonSyntax jsonSyntax) {
        return this.toBuilder().configValue(value).build().validatedValue(jsonSyntax);
    }

    /** 业务配置创建时只校验通用的值与字段定义；命名空间由应用服务校验。 */
    public SystemConfig validatedBusiness(final JsonSyntax jsonSyntax) {
        return this.validatedValue(jsonSyntax);
    }

    private SystemConfig validatedValue(final JsonSyntax jsonSyntax) {
        if (this.configValue.length() > SystemConfig.MAX_VALUE_LENGTH) {
            throw BizException.badRequest("configValue: 最多 65535 个字符");
        }
        this.configType.validate(this.configValue, jsonSyntax);
        if (this.required && this.configValue.isBlank()) {
            throw BizException.badRequest("该配置项不能为空");
        }
        final boolean fieldMatches =
                switch (this.fieldType) {
                    case "input", "textarea", "select", "file", "image", "richtext" ->
                        this.configType == ConfigType.STRING;
                    case "number" -> this.configType == ConfigType.NUMBER;
                    case "switch" -> this.configType == ConfigType.BOOLEAN;
                    case "json", "files" -> this.configType == ConfigType.JSON;
                    default -> false;
                };
        if (!fieldMatches) {
            throw BizException.badRequest("表单字段类型与配置值类型不匹配");
        }
        if (this.fieldOptions != null && !jsonSyntax.isValid(this.fieldOptions)) {
            throw BizException.badRequest("fieldOptions: 必须是合法 JSON");
        }
        if ("select".equals(this.fieldType)) {
            if (this.fieldOptions == null || !jsonSyntax.hasOptions(this.fieldOptions)) {
                throw BizException.badRequest("下拉选择必须配置 JSON 选项");
            }
            if (!this.configValue.isEmpty() && !jsonSyntax.hasChoice(this.fieldOptions, this.configValue)) {
                throw BizException.badRequest("配置值必须属于下拉选项");
            }
        }
        return this;
    }

    /** 修改配置：内置项的键不可改；新值按新类型校验。 */
    public SystemConfig withDetails(
            final String configKey,
            final String configValue,
            final ConfigType configType,
            final String groupKey,
            final String fieldType,
            final @Nullable String fieldOptions,
            final boolean required,
            final @Nullable String description,
            final JsonSyntax jsonSyntax) {
        if (this.builtin && !this.configKey.equals(configKey)) {
            throw BizException.conflict("内置配置的键不可修改");
        }
        return this.toBuilder()
                .configKey(configKey)
                .configValue(configValue)
                .configType(configType)
                .groupKey(groupKey)
                .fieldType(fieldType)
                .fieldOptions(fieldOptions)
                .required(required)
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

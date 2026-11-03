package com.wulicode.weiran.platform.api.config;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 系统配置视图。
 *
 * @param id ID
 * @param configKey 键
 * @param configValue 值
 * @param configType 类型
 * @param groupKey 分组编码
 * @param fieldType 表单字段类型
 * @param fieldOptions 表单选项 JSON
 * @param required 是否必填
 * @param description 描述
 * @param isBuiltin 是否内置
 * @param createdAt 创建时间
 * @param updatedAt 更新时间
 */
public record ConfigView(
        long id,
        String configKey,
        String configValue,
        String configType,
        String groupKey,
        String fieldType,
        @Nullable String fieldOptions,
        boolean required,
        @Nullable String description,
        boolean isBuiltin,
        @Nullable LocalDateTime createdAt,
        @Nullable LocalDateTime updatedAt) {}

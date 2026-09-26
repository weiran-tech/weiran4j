package com.weiran.platform.api.config;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 系统配置视图。
 *
 * @param id ID
 * @param configKey 键
 * @param configValue 值
 * @param configType 类型
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
        @Nullable String description,
        boolean isBuiltin,
        @Nullable LocalDateTime createdAt,
        @Nullable LocalDateTime updatedAt) {}

package com.wulicode.weiran.platform.api.config;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/** 系统配置分组。 */
public record ConfigGroupView(
        String groupKey,
        String key,
        String label,
        boolean isBuiltin,
        boolean canDelete,
        @Nullable LocalDateTime createdAt) {}

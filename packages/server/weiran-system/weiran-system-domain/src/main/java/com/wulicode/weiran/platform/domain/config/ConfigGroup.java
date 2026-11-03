package com.wulicode.weiran.platform.domain.config;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/** 可用于系统配置的分组。 */
public record ConfigGroup(
        String groupKey,
        String key,
        String label,
        int sort,
        boolean builtin,
        @Nullable LocalDateTime createdAt) {}

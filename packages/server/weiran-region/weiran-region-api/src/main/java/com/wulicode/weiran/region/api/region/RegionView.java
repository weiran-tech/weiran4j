package com.wulicode.weiran.region.api.region;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/** 行政区划视图。 */
public record RegionView(
        long id,
        String code,
        String name,
        String level,
        @Nullable String parentCode,
        int sort,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}

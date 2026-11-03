package com.wulicode.weiran.region.application.region;

import org.jspecify.annotations.Nullable;

/** 地区列表筛选条件。 */
public record RegionFilter(
        @Nullable String keyword,
        @Nullable String level,
        @Nullable String status) {}

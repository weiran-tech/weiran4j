package com.wulicode.weiran.region.application.region;

import org.jspecify.annotations.Nullable;

/** 新建地区命令。 */
public record CreateRegionCommand(
        String code,
        String name,
        String level,
        @Nullable String parentCode,
        @Nullable Integer sort,
        @Nullable String status) {}

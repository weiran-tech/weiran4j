package com.wulicode.weiran.region.application.region;

import org.jspecify.annotations.Nullable;

/** 更新地区命令；空值表示保留原字段，区划代码不允许修改。 */
public record UpdateRegionCommand(
        @Nullable String code,
        @Nullable String name,
        @Nullable String level,
        @Nullable String parentCode,
        boolean parentCodeProvided,
        @Nullable Integer sort,
        @Nullable String status) {}

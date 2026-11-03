package com.wulicode.weiran.region.api.region;

import java.time.LocalDateTime;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** 行政区划树节点。 */
public record RegionNode(
        long id,
        String code,
        String name,
        String level,
        @Nullable String parentCode,
        int sort,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<RegionNode> children) {}

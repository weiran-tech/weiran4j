package com.wulicode.weiran.system.api.batch;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/** 任务状态和进度；逐项结果通过明细分页查询。 */
public record BatchJobView(
        long id,
        String kind,
        String sourceName,
        String status,
        String phase,
        @Nullable Long total,
        @Nullable Long selectedCount,
        long processed,
        long succeeded,
        long failed,
        @Nullable String errorMessage,
        @Nullable LocalDateTime decidedAt,
        LocalDateTime createdAt,
        @Nullable LocalDateTime finishedAt) {}

package com.wulicode.weiran.system.domain.batch;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/** 数据库中的批处理任务快照。 */
public record BatchJob(
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

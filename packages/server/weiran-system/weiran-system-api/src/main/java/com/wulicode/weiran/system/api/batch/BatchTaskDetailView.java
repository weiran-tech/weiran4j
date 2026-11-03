package com.wulicode.weiran.system.api.batch;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/** 批处理逐项结果。 */
public record BatchTaskDetailView(
        long id,
        long itemNo,
        String itemName,
        String stage,
        String status,
        @Nullable String message,
        @Nullable String sourceLocation,
        @Nullable String idempotencyKey,
        @Nullable String displayData,
        @Nullable String resultType,
        @Nullable String resultId,
        LocalDateTime createdAt) {}

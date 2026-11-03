package com.wulicode.weiran.system.domain.batch;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/** 数据库中的逐项处理结果。 */
public record BatchTaskDetail(
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

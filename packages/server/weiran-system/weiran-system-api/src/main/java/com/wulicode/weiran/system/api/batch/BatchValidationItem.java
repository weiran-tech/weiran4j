package com.wulicode.weiran.system.api.batch;

import org.jspecify.annotations.Nullable;

/** 展示字段必须经处理器脱敏；不能用它们重建权威输入。 */
public record BatchValidationItem(
        long itemNo,
        String itemName,
        String sourceLocation,
        String idempotencyKey,
        boolean passed,
        @Nullable String message,
        @Nullable String displayData) {}

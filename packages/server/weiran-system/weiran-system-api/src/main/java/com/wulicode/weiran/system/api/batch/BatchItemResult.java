package com.wulicode.weiran.system.api.batch;

import org.jspecify.annotations.Nullable;

/** 成功入库后的通用结果引用。失败应抛出安全的 BatchFileException 或其他异常。 */
public record BatchItemResult(
        @Nullable String resultType, @Nullable String resultId) {
    public static BatchItemResult withoutReference() {
        return new BatchItemResult(null, null);
    }
}

package com.weiran.platform.domain.dict;

import com.weiran.common.status.EnableStatus;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/** 字典项（不可变）。同一字典内 value 唯一。 */
@Getter
@Builder(toBuilder = true)
public final class DictItem {

    private final @Nullable Long id;

    private final long dictId;

    private final String label;

    private final String value;

    private final @Nullable String color;

    private final int sort;

    private final EnableStatus status;

    private final @Nullable String remark;

    /** 已持久化字典项的 ID。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("字典项尚未持久化");
        }
        return this.id;
    }
}

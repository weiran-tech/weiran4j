package com.weiran.platform.domain.dict;

import com.weiran.common.error.BizException;
import com.weiran.common.status.EnableStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/** 字典聚合根（不可变）。内置字典的编码被前端直接引用，不可修改、不可删除。 */
@Getter
@Builder(toBuilder = true)
public final class Dict {

    private final @Nullable Long id;

    private final String name;

    private final String code;

    private final @Nullable String description;

    private final EnableStatus status;

    private final boolean builtin;

    private final @Nullable LocalDateTime createdAt;

    private final @Nullable LocalDateTime updatedAt;

    /** 已持久化字典的 ID。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("字典尚未持久化");
        }
        return this.id;
    }

    /** 是否启用。 */
    public boolean isEnabled() {
        return this.status == EnableStatus.ENABLED;
    }

    /** 修改字典信息：内置字典编码不可改、不可禁用（前端的性别、状态等标签依赖它们）。 */
    public Dict withDetails(
            final String name, final String code, final @Nullable String description, final EnableStatus status) {
        if (this.builtin && !this.code.equals(code)) {
            throw BizException.conflict("内置字典的编码不可修改");
        }
        if (this.builtin && status == EnableStatus.DISABLED) {
            throw BizException.conflict("内置字典不可禁用");
        }
        return this.toBuilder()
                .name(name)
                .code(code)
                .description(description)
                .status(status)
                .build();
    }

    /** 校验能否删除：内置字典不可删。 */
    public void ensureDeletable() {
        if (this.builtin) {
            throw BizException.conflict("内置字典不可删除");
        }
    }
}

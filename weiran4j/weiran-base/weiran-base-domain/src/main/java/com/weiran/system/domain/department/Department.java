package com.weiran.system.domain.department;

import com.weiran.common.error.BizException;
import com.weiran.common.status.EnableStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/** 部门聚合根（不可变）。 */
@Getter
@Builder(toBuilder = true)
public final class Department {

    private final @Nullable Long id;

    private final long parentId;

    private final String name;

    private final String code;

    private final @Nullable Long leaderId;

    private final @Nullable String phone;

    private final int sort;

    private final EnableStatus status;

    private final @Nullable LocalDateTime createdAt;

    private final @Nullable LocalDateTime updatedAt;

    /** 已持久化部门的 ID。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("部门尚未持久化");
        }
        return this.id;
    }

    /** 校验能否删除：有子部门或仍有用户时不可删。 */
    public static void ensureDeletable(final boolean hasChildren, final long userCount) {
        if (hasChildren) {
            throw BizException.conflict("请先删除下级部门");
        }
        if (userCount > 0) {
            throw BizException.conflict("部门下仍有 " + userCount + " 个用户，请先调整用户部门");
        }
    }
}

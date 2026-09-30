package com.weiran.system.domain.menu;

import com.weiran.common.error.BizException;
import com.weiran.common.status.EnableStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/** 菜单聚合根（不可变）：目录、菜单页面与按钮权限点共用一张表。 */
@Getter
@Builder(toBuilder = true)
public final class Menu {

    private final @Nullable Long id;

    private final long parentId;

    private final String title;

    private final MenuType type;

    private final @Nullable String path;

    private final @Nullable String component;

    private final @Nullable String icon;

    private final @Nullable String permission;

    private final int sort;

    private final boolean visible;

    private final boolean keepAlive;

    private final boolean external;

    private final EnableStatus status;

    private final @Nullable LocalDateTime createdAt;

    private final @Nullable LocalDateTime updatedAt;

    /** 已持久化菜单的 ID。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("菜单尚未持久化");
        }
        return this.id;
    }

    /** 是否启用。 */
    public boolean isEnabled() {
        return this.status == EnableStatus.ENABLED;
    }

    /** 是否出现在导航里（目录或菜单）。 */
    public boolean isNavigable() {
        return this.type != MenuType.BUTTON;
    }

    /** 是否带权限码。 */
    public boolean hasPermission() {
        return this.permission != null && !this.permission.isBlank();
    }

    /**
     * 校验字段组合：菜单必须有路由路径，按钮必须有权限码，按钮下不能再挂节点。
     *
     * @param parent 父节点，挂在根下时为空
     */
    public void validate(final @Nullable Menu parent) {
        if (this.type == MenuType.MENU && (this.path == null || this.path.isBlank())) {
            throw BizException.badRequest("path: 菜单类型必须填写路由路径");
        }
        if (this.type == MenuType.BUTTON && !this.hasPermission()) {
            throw BizException.badRequest("permission: 按钮类型必须填写权限码");
        }
        if (parent != null && parent.type == MenuType.BUTTON) {
            throw BizException.badRequest("parentId: 按钮下不能再添加子节点");
        }
    }
}

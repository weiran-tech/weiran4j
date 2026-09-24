package com.weiran.system.api.rbac;

import java.util.List;
import java.util.Objects;

/**
 * 角色权限分配命令。
 *
 * <p>语义是整体替换：保存后该角色实际持有的权限集合精确等于 {@link #permissionIds}，
 * 不是增量合并（见 {@code rbac-role-management} spec FR-004）。
 *
 * @param permissionIds 该角色应持有的权限 ID 完整集合
 */
public record AssignPermissionsCommand(List<Long> permissionIds) {

    public AssignPermissionsCommand {
        permissionIds = List.copyOf(Objects.requireNonNull(permissionIds, "permissionIds"));
    }
}

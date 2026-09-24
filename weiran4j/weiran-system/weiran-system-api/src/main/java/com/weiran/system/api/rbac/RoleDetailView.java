package com.weiran.system.api.rbac;

import java.util.List;
import java.util.Objects;

/**
 * 角色详情视图，附带已绑定的权限 ID 集合，供权限树回显勾选状态。
 *
 * @param role 角色基本信息
 * @param permissionIds 已绑定的权限 ID 集合
 */
public record RoleDetailView(RoleView role, List<Long> permissionIds) {

    public RoleDetailView {
        Objects.requireNonNull(role, "role");
        permissionIds = List.copyOf(Objects.requireNonNull(permissionIds, "permissionIds"));
    }
}

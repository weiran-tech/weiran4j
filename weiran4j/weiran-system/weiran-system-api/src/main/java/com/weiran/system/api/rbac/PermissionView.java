package com.weiran.system.api.rbac;

import java.util.Objects;

/**
 * 权限点视图，供角色管理页面渲染权限树。
 *
 * <p>{@link #name} 是权限判定唯一依据；{@link #group}/{@link #module} 仅用于界面分组展示。
 *
 * @param id 权限点 ID
 * @param name 权限标识，如 {@code weiran-system:role.manage}
 * @param title 显示名
 * @param group 界面分组
 * @param module 声明该权限的模块名
 */
public record PermissionView(long id, String name, String title, String group, String module) {

    public PermissionView {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(title, "title");
        Objects.requireNonNull(group, "group");
        Objects.requireNonNull(module, "module");
    }
}

package com.weiran.system.api.rbac;

import java.util.Objects;

/**
 * 角色列表/详情视图。
 *
 * @param id 角色 ID
 * @param name 角色标识
 * @param title 角色显示名
 * @param description 描述
 * @param accountType 适用账号类型
 * @param enabled 是否启用
 * @param system 是否系统内置角色
 */
public record RoleView(
        long id, String name, String title, String description, String accountType, boolean enabled, boolean system) {

    public RoleView {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(title, "title");
        Objects.requireNonNull(description, "description");
        Objects.requireNonNull(accountType, "accountType");
    }
}

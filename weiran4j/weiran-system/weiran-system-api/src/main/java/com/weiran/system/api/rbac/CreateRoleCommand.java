package com.weiran.system.api.rbac;

import java.util.Objects;

/**
 * 新增角色命令。
 *
 * @param name 角色标识，全局唯一，代码可能引用
 * @param title 显示名
 * @param description 描述
 * @param accountType 适用账号类型
 */
public record CreateRoleCommand(String name, String title, String description, String accountType) {

    public CreateRoleCommand {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(title, "title");
        Objects.requireNonNull(description, "description");
        Objects.requireNonNull(accountType, "accountType");
    }
}

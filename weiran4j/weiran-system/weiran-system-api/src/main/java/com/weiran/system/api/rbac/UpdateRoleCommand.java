package com.weiran.system.api.rbac;

import java.util.Objects;

/**
 * 编辑角色命令。
 *
 * <p>不包含 {@code name}：系统内置角色（{@code system=true}）的 {@code name} 不可修改，
 * 非系统角色的改名需求本次不开放（见 {@code rbac-role-management} spec FR-002），
 * 从命令类型层面直接不提供该字段，而不是在应用层做条件校验。
 *
 * @param title 显示名
 * @param description 描述
 * @param enabled 是否启用
 */
public record UpdateRoleCommand(String title, String description, boolean enabled) {

    public UpdateRoleCommand {
        Objects.requireNonNull(title, "title");
        Objects.requireNonNull(description, "description");
    }
}

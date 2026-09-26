package com.weiran.framework.auth;

import java.util.Arrays;
import java.util.Set;

/**
 * 已认证的当前用户快照。
 *
 * @param id 用户 ID
 * @param username 用户名
 * @param nickname 昵称
 * @param roles 角色编码
 * @param permissions 权限码
 */
public record LoginUser(long id, String username, String nickname, Set<String> roles, Set<String> permissions) {

    /** 超级管理员角色编码：拥有全部权限。 */
    public static final String SUPER_ADMIN_ROLE = "super_admin";

    /** 防御性复制，保证快照不可变。 */
    public LoginUser {
        roles = Set.copyOf(roles);
        permissions = Set.copyOf(permissions);
    }

    /** 是否超级管理员。 */
    public boolean isSuperAdmin() {
        return this.roles.contains(LoginUser.SUPER_ADMIN_ROLE);
    }

    /** 是否拥有某个权限码（超级管理员恒为真）。 */
    public boolean hasPermission(final String permission) {
        return this.isSuperAdmin() || this.permissions.contains(permission);
    }

    /** 按组合方式判断是否拥有一组权限码；空数组视为无要求。 */
    public boolean hasPermissions(final String[] required, final Logical logical) {
        if (required.length == 0 || this.isSuperAdmin()) {
            return true;
        }
        return logical == Logical.ALL
                ? Arrays.stream(required).allMatch(this::hasPermission)
                : Arrays.stream(required).anyMatch(this::hasPermission);
    }
}

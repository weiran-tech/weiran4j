package com.weiran.system.api.auth;

import java.util.List;
import java.util.Objects;

/**
 * 当前登录账号视图。
 *
 * <p>角色与权限一次性下发，前端据此做菜单与按钮级控制，避免每个页面各自问一次权限。
 *
 * @param accountId 账号 ID
 * @param displayName 展示名
 * @param accountType 账号类型
 * @param roles 角色标识
 * @param permissions 权限标识
 */
public record CurrentAccountView(
        long accountId, String displayName, String accountType, List<String> roles, List<String> permissions) {

    public CurrentAccountView {
        Objects.requireNonNull(displayName, "displayName");
        Objects.requireNonNull(accountType, "accountType");
        roles = List.copyOf(Objects.requireNonNull(roles, "roles"));
        permissions = List.copyOf(Objects.requireNonNull(permissions, "permissions"));
    }
}

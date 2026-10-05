package com.weiran.system.domain.auth;

import java.util.Set;

/**
 * 已认证用户的身份与授权快照。
 *
 * @param username 用户名
 * @param nickname 昵称
 * @param roles 生效的角色编码
 * @param permissions 权限码
 */
public record PrincipalSnapshot(String username, String nickname, Set<String> roles, Set<String> permissions) {

    /** 防御性复制，保证快照不可变。 */
    public PrincipalSnapshot {
        roles = Set.copyOf(roles);
        permissions = Set.copyOf(permissions);
    }
}

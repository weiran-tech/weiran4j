package com.weiran.system.domain.rbac;

import java.util.Objects;
import java.util.Set;

/**
 * 已认证主体及其授权快照。
 *
 * <p>「快照」是关键语义：角色与权限在认证那一刻取定，本次请求内不再回查数据库。
 * 权限变更在下次登录或令牌刷新时生效，这个延迟是有意的取舍——否则每个权限判定点
 * 都要打一次库。
 *
 * @param accountId 账号 ID
 * @param accountType 账号类型落库取值
 * @param displayName 展示名
 * @param roleNames 角色标识集合
 * @param permissionNames 权限标识集合
 */
public record AuthorizedPrincipal(
        long accountId, String accountType, String displayName, Set<String> roleNames, Set<String> permissionNames) {

    public AuthorizedPrincipal {
        Objects.requireNonNull(accountType, "accountType");
        Objects.requireNonNull(displayName, "displayName");
        roleNames = Set.copyOf(Objects.requireNonNull(roleNames, "roleNames"));
        permissionNames = Set.copyOf(Objects.requireNonNull(permissionNames, "permissionNames"));
    }

    /** 判断是否拥有指定权限。 */
    public boolean has(final String required) {
        return PermissionChecker.has(this.roleNames, this.permissionNames, required);
    }

    /** 不满足指定权限时抛出业务异常。 */
    public void ensure(final String required) {
        PermissionChecker.ensure(this.roleNames, this.permissionNames, required);
    }
}

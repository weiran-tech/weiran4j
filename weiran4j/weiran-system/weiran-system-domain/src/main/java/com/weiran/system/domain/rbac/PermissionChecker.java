package com.weiran.system.domain.rbac;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.system.domain.error.SystemErrors;
import java.util.Collection;
import java.util.Objects;
import java.util.Set;

/**
 * 权限判定。
 *
 * <p>纯函数式，不碰持久化——权限集合由调用方（应用层）先取好再传进来。
 * 这样权限规则的单测不需要数据库，也避免在判定过程中触发 N+1 查询。
 *
 * <p>{@link #SUPER_ROLE} 是唯一的判定短路：持有该角色视为拥有全部权限。
 * PHP 项目里这条规则散落在 {@code RbacHelper} 与多个中间件中，这里收敛成一处。
 */
public final class PermissionChecker {

    /** 超级管理员角色标识，持有它即视为拥有全部权限。 */
    public static final String SUPER_ROLE = "super";

    private PermissionChecker() {}

    /** 判断给定角色与权限集合是否覆盖所需权限。 */
    public static boolean has(
            final Collection<String> roleNames, final Collection<String> permissionNames, final String required) {
        Objects.requireNonNull(roleNames, "roleNames");
        Objects.requireNonNull(permissionNames, "permissionNames");
        Objects.requireNonNull(required, "required");
        if (roleNames.contains(PermissionChecker.SUPER_ROLE)) {
            return true;
        }
        return permissionNames.contains(required);
    }

    /** 判断是否覆盖所需权限中的任意一个。空集合视为不需要权限，直接通过。 */
    public static boolean hasAny(
            final Collection<String> roleNames,
            final Collection<String> permissionNames,
            final Set<String> requiredAnyOf) {
        Objects.requireNonNull(requiredAnyOf, "requiredAnyOf");
        if (requiredAnyOf.isEmpty()) {
            return true;
        }
        return requiredAnyOf.stream().anyMatch(required -> PermissionChecker.has(roleNames, permissionNames, required));
    }

    /** 不满足所需权限时抛出业务异常，供应用层直接调用。 */
    public static void ensure(
            final Collection<String> roleNames, final Collection<String> permissionNames, final String required) {
        if (!PermissionChecker.has(roleNames, permissionNames, required)) {
            throw new ErrorCodeException(SystemErrors.PERMISSION_DENIED, "缺少权限: " + required);
        }
    }
}

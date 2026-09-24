package com.weiran.system.domain.rbac;

import lombok.Builder;
import lombok.Getter;

/**
 * 角色。对应 {@code pam_role} 表。
 *
 * <p>{@code system} 标记的角色不允许被业务侧删除或改名——它们的 {@code name} 被代码引用。
 */
@Getter
@Builder(toBuilder = true)
public final class Role {

    private final long id;

    /** 角色标识，代码里引用的就是它，全局唯一。 */
    private final String name;

    /** 角色显示名。 */
    private final String title;

    private final String description;

    /** 该角色适用的账号类型，与 {@code pam_account.type} 同域。 */
    private final String accountType;

    private final boolean enabled;

    /** 系统内置角色，不可被业务侧删除或改名。 */
    private final boolean system;
}

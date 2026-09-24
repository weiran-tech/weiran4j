package com.weiran.system.domain.rbac;

import lombok.Builder;
import lombok.Getter;

/**
 * 权限点只读引用，供角色管理页面渲染权限树。对应 {@code pam_permission} 表。
 *
 * <p>权限点本身在本次 change 中不提供新增/编辑入口——PHP 侧权限点是代码级声明，
 * 不是运营可编辑的资源，本类型只做读取展示，因此不像 {@link RoleAggregate} 那样
 * 建模成可编辑聚合根。
 *
 * <p>{@link #name} 是权限判定唯一依据；{@link #group}/{@link #module} 仅用于界面分组展示。
 */
@Getter
@Builder
public final class PermissionRef {

    private final long id;

    /** 权限标识，全局唯一，权限判定只看这一个字段。 */
    private final String name;

    private final String title;

    /** 界面分组。 */
    private final String group;

    /** 声明该权限的模块名。 */
    private final String module;
}

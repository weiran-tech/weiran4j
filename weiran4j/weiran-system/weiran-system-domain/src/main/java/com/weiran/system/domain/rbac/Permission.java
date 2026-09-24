package com.weiran.system.domain.rbac;

import lombok.Builder;
import lombok.Getter;

/**
 * 权限点。对应 {@code pam_permission} 表。
 *
 * <p>{@link #name} 是权限判定的唯一依据，形如 {@code weiran-system:account.index}；
 * {@code group} / {@code root} / {@code module} 仅用于后台界面分组展示，不参与判定。
 */
@Getter
@Builder(toBuilder = true)
public final class Permission {

    private final long id;

    /** 权限标识，全局唯一，权限判定只看这一个字段。 */
    private final String name;

    private final String title;

    private final String description;

    /** 界面分组。 */
    private final String group;

    /** 顶级归类。 */
    private final String root;

    /** 声明该权限的模块名。 */
    private final String module;
}

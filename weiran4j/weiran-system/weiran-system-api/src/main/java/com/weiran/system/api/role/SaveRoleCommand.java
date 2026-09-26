package com.weiran.system.api.role;

import org.jspecify.annotations.Nullable;

/**
 * 新增或修改角色。
 *
 * @param name 名称
 * @param code 编码（{@code ^[a-z][a-z0-9_]{1,63}$}）
 * @param description 描述
 * @param sort 排序，空为 0
 * @param status 状态，空为 enabled
 */
public record SaveRoleCommand(
        String name,
        String code,
        @Nullable String description,
        @Nullable Integer sort,
        @Nullable String status) {}

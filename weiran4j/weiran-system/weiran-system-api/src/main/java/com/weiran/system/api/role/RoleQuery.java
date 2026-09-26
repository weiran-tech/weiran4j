package com.weiran.system.api.role;

import org.jspecify.annotations.Nullable;

/**
 * 角色分页查询条件，字段为空表示不过滤。
 *
 * @param keyword 名称 / 编码
 * @param status 状态
 */
public record RoleQuery(@Nullable String keyword, @Nullable String status) {}

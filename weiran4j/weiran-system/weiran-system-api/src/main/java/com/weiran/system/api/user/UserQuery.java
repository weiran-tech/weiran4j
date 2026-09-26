package com.weiran.system.api.user;

import org.jspecify.annotations.Nullable;

/**
 * 用户分页查询条件，字段为空表示不过滤。
 *
 * @param keyword 用户名 / 昵称 / 手机号
 * @param status 状态
 * @param departmentId 部门 ID（含子部门）
 */
public record UserQuery(
        @Nullable String keyword,
        @Nullable String status,
        @Nullable Long departmentId) {}

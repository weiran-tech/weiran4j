package com.weiran.system.api.user;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 用户分页查询条件，字段为空表示不过滤，全部条件取交集。
 *
 * <p>{@code keyword} 是三列模糊的快速搜索；其余字段是高级筛选的单字段条件，各查各的列。
 *
 * @param keyword 用户名 / 昵称 / 手机号模糊
 * @param status 状态
 * @param departmentId 部门 ID（含子部门）
 * @param username 用户名，精确匹配
 * @param userId 用户 ID
 * @param phone 手机号，精确匹配
 * @param email 邮箱，精确匹配
 * @param roleId 拥有该角色
 * @param gender 性别：male / female / unknown
 * @param createdStartTime 创建时间下界（含）
 * @param createdEndTime 创建时间上界（含）
 * @param lastLoginStartTime 最后登录时间下界（含）
 * @param lastLoginEndTime 最后登录时间上界（含）
 */
public record UserQuery(
        @Nullable String keyword,
        @Nullable String status,
        @Nullable Long departmentId,
        @Nullable String username,
        @Nullable Long userId,
        @Nullable String phone,
        @Nullable String email,
        @Nullable Long roleId,
        @Nullable String gender,
        @Nullable LocalDateTime createdStartTime,
        @Nullable LocalDateTime createdEndTime,
        @Nullable LocalDateTime lastLoginStartTime,
        @Nullable LocalDateTime lastLoginEndTime) {}

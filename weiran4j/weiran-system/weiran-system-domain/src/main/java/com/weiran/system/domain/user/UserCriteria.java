package com.weiran.system.domain.user;

import com.weiran.framework.status.EnableStatus;
import java.time.LocalDateTime;
import java.util.Set;
import org.jspecify.annotations.Nullable;

/**
 * 用户分页查询条件（已规范化），字段为空表示不过滤，全部条件取交集。
 *
 * @param keyword 匹配用户名 / 昵称 / 手机号
 * @param status 状态
 * @param departmentIds 部门 ID 集合（已展开子部门）
 * @param username 用户名，精确匹配
 * @param userId 用户 ID
 * @param phone 手机号，精确匹配
 * @param email 邮箱，精确匹配
 * @param roleId 拥有该角色
 * @param gender 性别
 * @param createdFrom 创建时间下界（含）
 * @param createdTo 创建时间上界（含）
 * @param lastLoginFrom 最后登录时间下界（含）
 * @param lastLoginTo 最后登录时间上界（含）
 */
public record UserCriteria(
        @Nullable String keyword,
        @Nullable EnableStatus status,
        @Nullable Set<Long> departmentIds,
        @Nullable String username,
        @Nullable Long userId,
        @Nullable String phone,
        @Nullable String email,
        @Nullable Long roleId,
        @Nullable Gender gender,
        @Nullable LocalDateTime createdFrom,
        @Nullable LocalDateTime createdTo,
        @Nullable LocalDateTime lastLoginFrom,
        @Nullable LocalDateTime lastLoginTo) {}

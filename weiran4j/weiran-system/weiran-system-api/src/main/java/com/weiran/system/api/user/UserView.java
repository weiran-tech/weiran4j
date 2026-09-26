package com.weiran.system.api.user;

import java.time.LocalDateTime;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 用户视图。刻意不含 password 与 tokenVersion。
 *
 * @param id ID
 * @param username 用户名
 * @param nickname 昵称
 * @param email 邮箱
 * @param phone 手机号
 * @param avatar 头像
 * @param gender 性别
 * @param departmentId 部门 ID
 * @param departmentName 部门名称
 * @param status 状态
 * @param isBuiltin 是否内置
 * @param roleIds 角色 ID
 * @param roleNames 角色名称
 * @param lastLoginAt 最近登录时间
 * @param lastLoginIp 最近登录 IP
 * @param createdAt 创建时间
 * @param updatedAt 更新时间
 */
public record UserView(
        long id,
        String username,
        String nickname,
        @Nullable String email,
        @Nullable String phone,
        @Nullable String avatar,
        String gender,
        @Nullable Long departmentId,
        @Nullable String departmentName,
        String status,
        boolean isBuiltin,
        List<Long> roleIds,
        List<String> roleNames,
        @Nullable LocalDateTime lastLoginAt,
        @Nullable String lastLoginIp,
        @Nullable LocalDateTime createdAt,
        @Nullable LocalDateTime updatedAt) {}

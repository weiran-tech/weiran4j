package com.weiran.system.api.auth;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 当前登录用户。
 *
 * @param id 用户 ID
 * @param username 用户名
 * @param nickname 昵称
 * @param email 邮箱
 * @param phone 手机号
 * @param avatar 头像地址
 * @param gender 性别
 * @param departmentId 部门 ID
 * @param departmentName 部门名称
 * @param roles 生效的角色编码
 * @param permissions 权限码；超级管理员为 {@code ["*"]}
 */
public record CurrentUserView(
        long id,
        String username,
        String nickname,
        @Nullable String email,
        @Nullable String phone,
        @Nullable String avatar,
        String gender,
        @Nullable Long departmentId,
        @Nullable String departmentName,
        List<String> roles,
        List<String> permissions) {}

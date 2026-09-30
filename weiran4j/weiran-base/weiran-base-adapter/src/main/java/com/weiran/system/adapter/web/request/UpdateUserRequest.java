package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 修改用户请求（不含用户名与密码）。
 *
 * @param nickname 昵称
 * @param email 邮箱
 * @param phone 手机号
 * @param gender 性别
 * @param departmentId 部门 ID
 * @param status 状态
 * @param roleIds 角色 ID（全量覆盖），必填（可为空数组）
 */
public record UpdateUserRequest(
        @NotBlank @Size(max = 32) String nickname,
        @Nullable @Email @Size(max = 128) String email,
        @Nullable @Size(max = 20) String phone,
        @Nullable String gender,
        @Nullable Long departmentId,
        @Nullable String status,
        @NotNull List<Long> roleIds) {}

package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 新增用户请求。
 *
 * @param username 用户名（字母开头，字母、数字、下划线、点、横线）
 * @param nickname 昵称
 * @param password 初始密码
 * @param email 邮箱
 * @param phone 手机号
 * @param gender 性别
 * @param departmentId 部门 ID
 * @param status 状态
 * @param roleIds 角色 ID，必填（可为空数组）
 */
public record CreateUserRequest(
        @NotBlank
        @Size(min = 2, max = 32)
        @Pattern(regexp = "^[A-Za-z][A-Za-z0-9_.-]*$", message = "需以字母开头，只能包含字母、数字、下划线、点或横线")
        String username,

        @NotBlank @Size(max = 32) String nickname,
        @NotBlank String password,
        @Nullable @Email @Size(max = 128) String email,
        @Nullable @Size(max = 20) String phone,
        @Nullable String gender,
        @Nullable Long departmentId,
        @Nullable String status,
        @NotNull List<Long> roleIds) {}

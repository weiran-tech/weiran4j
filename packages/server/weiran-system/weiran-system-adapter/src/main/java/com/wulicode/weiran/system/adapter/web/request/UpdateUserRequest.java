package com.wulicode.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 修改用户请求（不含用户名与密码）。
 *
 * @param nickname 昵称
 * @param gender 性别
 * @param status 状态
 * @param roleIds 角色 ID（全量覆盖），必填（可为空数组）
 */
public record UpdateUserRequest(
        @NotBlank @Size(max = 32) String nickname,
        @Nullable String gender,
        @Nullable String status,
        @NotNull List<Long> roleIds) {}

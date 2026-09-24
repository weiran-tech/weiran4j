package com.weiran.system.adapter.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** 新增账号请求体。 */
public record CreateAccountRequest(
        @NotBlank(message = "用户名不能为空") @Size(max = 50, message = "用户名长度不能超过 50")
        String username,

        @NotBlank(message = "密码不能为空") @Size(min = 6, max = 64, message = "密码长度需在 6 到 64 之间")
        String password,

        @Nullable String mobile,

        @Nullable String email,

        @NotBlank(message = "账号类型不能为空") @Pattern(regexp = "user|backend", message = "账号类型只能是 user 或 backend")
        String accountType) {}

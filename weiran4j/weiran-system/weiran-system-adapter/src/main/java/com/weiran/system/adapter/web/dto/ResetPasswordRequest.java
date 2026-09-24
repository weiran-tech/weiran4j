package com.weiran.system.adapter.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 管理端重置密码请求体。 */
public record ResetPasswordRequest(
        @NotBlank(message = "新密码不能为空") @Size(min = 6, max = 64, message = "密码长度需在 6 到 64 之间")
        String newPassword) {}

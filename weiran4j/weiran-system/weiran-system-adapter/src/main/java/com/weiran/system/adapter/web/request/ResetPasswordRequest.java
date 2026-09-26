package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;

/**
 * 管理员重置密码请求。
 *
 * @param password 新密码
 */
public record ResetPasswordRequest(@NotBlank String password) {}

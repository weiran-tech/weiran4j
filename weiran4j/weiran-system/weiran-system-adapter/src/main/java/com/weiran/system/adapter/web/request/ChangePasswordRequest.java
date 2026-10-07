package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;

/**
 * 修改密码请求（强度规则在领域层 PasswordPolicy）。
 *
 * @param oldPassword 原密码
 * @param newPassword 新密码
 */
public record ChangePasswordRequest(
        @NotBlank String oldPassword, @NotBlank String newPassword) {}

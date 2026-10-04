package com.weiran.cqt.api.account;

import org.jspecify.annotations.Nullable;

/**
 * 重置密码。
 *
 * @param phone 手机号
 * @param code 短信验证码
 * @param password 新密码
 * @param passwordConfirmation 确认密码
 */
public record ResetPasswordCommand(
        @Nullable String phone,
        @Nullable String code,
        @Nullable String password,
        @Nullable String passwordConfirmation) {}

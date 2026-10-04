package com.weiran.cqt.adapter.portal.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.jspecify.annotations.Nullable;

/**
 * 重置密码（uniapp {@code pages/login/login.vue}）。
 *
 * @param phone 手机号
 * @param code 短信验证码
 * @param password 新密码
 * @param passwordConfirmation 确认密码
 */
public record ResetPasswordRequest(
        @Nullable String phone,
        @Nullable String code,
        @Nullable String password,
        @JsonProperty("password_confirmation") @Nullable String passwordConfirmation) {}

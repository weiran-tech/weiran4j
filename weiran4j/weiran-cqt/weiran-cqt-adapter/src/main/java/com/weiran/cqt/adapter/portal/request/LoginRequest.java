package com.weiran.cqt.adapter.portal.request;

import org.jspecify.annotations.Nullable;

/**
 * 登录 / 自动登录（{@code code} 只有验证码登录用）。
 *
 * @param phone 手机号
 * @param password 密码
 * @param code 短信验证码
 */
public record LoginRequest(
        @Nullable String phone,
        @Nullable String password,
        @Nullable String code) {}

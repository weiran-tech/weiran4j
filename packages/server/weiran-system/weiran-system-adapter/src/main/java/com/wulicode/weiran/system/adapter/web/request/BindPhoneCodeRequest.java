package com.wulicode.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** 向本人待绑定的新手机号发送验证码。 */
public record BindPhoneCodeRequest(
        @NotBlank @Pattern(regexp = "1[3-9]\\d{9}", message = "手机号格式不正确")
        String phone) {}

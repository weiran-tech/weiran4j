package com.wulicode.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** 验证新手机号并完成绑定。 */
public record BindPhoneRequest(
        @NotBlank @Pattern(regexp = "1[3-9]\\d{9}", message = "手机号格式不正确")
        String phone,

        @NotBlank @Pattern(regexp = "\\d{6}", message = "验证码必须是 6 位数字")
        String code) {}

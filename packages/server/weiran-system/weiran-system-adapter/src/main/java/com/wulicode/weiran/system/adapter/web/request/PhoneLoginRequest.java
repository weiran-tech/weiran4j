package com.wulicode.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 手机号验证码登录请求。 */
public record PhoneLoginRequest(
        @NotBlank @Size(max = 20) @Pattern(regexp = "1[3-9][0-9]{9}")
        String phone,

        @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {}

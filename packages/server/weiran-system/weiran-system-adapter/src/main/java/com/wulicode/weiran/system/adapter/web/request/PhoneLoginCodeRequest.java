package com.wulicode.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 发送手机号登录验证码请求。 */
public record PhoneLoginCodeRequest(
        @NotBlank @Size(max = 20) @Pattern(regexp = "1[3-9][0-9]{9}")
        String phone) {}

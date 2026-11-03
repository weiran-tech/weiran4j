package com.wulicode.weiran.platform.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 修改配置分组请求。 */
public record UpdateConfigGroupRequest(
        @NotBlank @Size(max = 64) String label) {}

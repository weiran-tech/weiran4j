package com.wulicode.weiran.platform.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** 新增配置分组请求。 */
public record CreateConfigGroupRequest(
        @Nullable String groupKey,

        @NotBlank @Size(max = 64) @Pattern(regexp = "[a-z][a-z0-9_-]*")
        String key,

        @NotBlank @Size(max = 64) String label) {}

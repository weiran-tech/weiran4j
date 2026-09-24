package com.weiran.system.adapter.web.dto;

import jakarta.validation.constraints.NotBlank;
import org.jspecify.annotations.Nullable;

/** 编辑封禁记录请求体。 */
public record UpdateBanRequest(
        @NotBlank(message = "封禁值不能为空") String value,
        long ipStart,
        long ipEnd,
        @Nullable String note) {}

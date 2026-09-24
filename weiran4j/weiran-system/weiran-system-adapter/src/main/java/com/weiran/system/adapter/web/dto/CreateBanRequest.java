package com.weiran.system.adapter.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.jspecify.annotations.Nullable;

/** 新增封禁记录请求体，字段对齐 {@code pam_ban} 表既有列。 */
public record CreateBanRequest(
        @NotBlank(message = "账号类型不能为空") @Pattern(regexp = "user|backend", message = "账号类型只能是 user 或 backend")
        String accountType,

        @NotBlank(message = "封禁类型不能为空") @Pattern(regexp = "ip|device", message = "封禁类型只能是 ip 或 device")
        String type,

        @NotBlank(message = "封禁值不能为空") String value,

        long ipStart,

        long ipEnd,

        @Nullable String note) {}

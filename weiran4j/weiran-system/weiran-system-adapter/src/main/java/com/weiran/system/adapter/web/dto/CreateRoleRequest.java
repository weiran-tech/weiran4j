package com.weiran.system.adapter.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 新增角色请求体。
 *
 * @param name 角色标识
 * @param title 显示名
 * @param description 描述
 * @param accountType 适用账号类型
 */
public record CreateRoleRequest(
        @NotBlank(message = "角色标识不能为空") @Size(max = 100, message = "角色标识长度不能超过 100")
        String name,

        @NotBlank(message = "显示名不能为空") @Size(max = 100, message = "显示名长度不能超过 100")
        String title,

        @Size(max = 100, message = "描述长度不能超过 100") String description,

        @NotBlank(message = "账号类型不能为空") @Pattern(regexp = "user|backend", message = "账号类型只能是 user 或 backend")
        String accountType) {}

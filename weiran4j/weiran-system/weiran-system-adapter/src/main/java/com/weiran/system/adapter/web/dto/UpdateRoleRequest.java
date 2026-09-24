package com.weiran.system.adapter.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 编辑角色请求体。
 *
 * <p>不含 {@code name} 字段：系统内置角色的改名保护从请求体形状上就直接消除，
 * 见 {@code RoleAggregate#updateProfile} 的类比设计。
 */
public record UpdateRoleRequest(
        @NotBlank(message = "显示名不能为空") @Size(max = 100, message = "显示名长度不能超过 100")
        String title,

        @Size(max = 100, message = "描述长度不能超过 100") String description,

        boolean enabled) {}

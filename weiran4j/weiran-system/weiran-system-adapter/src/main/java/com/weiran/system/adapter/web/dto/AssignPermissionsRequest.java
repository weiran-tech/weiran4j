package com.weiran.system.adapter.web.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/** 角色权限分配请求体，整体替换语义。 */
public record AssignPermissionsRequest(
        @NotNull(message = "权限 ID 集合不能为空") List<Long> permissionIds) {}

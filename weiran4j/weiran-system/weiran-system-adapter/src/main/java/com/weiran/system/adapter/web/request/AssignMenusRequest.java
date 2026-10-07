package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * 角色分配菜单请求（全量覆盖，可包含目录节点）。
 *
 * @param menuIds 菜单 ID
 */
public record AssignMenusRequest(@NotNull List<Long> menuIds) {}

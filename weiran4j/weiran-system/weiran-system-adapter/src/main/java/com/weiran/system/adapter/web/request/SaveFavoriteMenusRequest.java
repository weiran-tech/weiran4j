package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * 保存收藏菜单请求（全量覆盖，按收藏顺序）。
 *
 * @param menuIds 菜单 ID
 */
public record SaveFavoriteMenusRequest(@NotNull List<Long> menuIds) {}

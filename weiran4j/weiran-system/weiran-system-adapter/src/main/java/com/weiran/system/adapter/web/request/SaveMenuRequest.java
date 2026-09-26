package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改菜单请求。
 *
 * @param parentId 父 ID，0 为根
 * @param title 标题
 * @param type 类型
 * @param path 路由路径
 * @param component 组件
 * @param icon 图标
 * @param permission 权限码
 * @param sort 排序
 * @param visible 是否显示
 * @param keepAlive 是否缓存
 * @param isExternal 是否外链
 * @param status 状态
 */
public record SaveMenuRequest(
        @NotNull @PositiveOrZero Long parentId,
        @NotBlank @Size(max = 64) String title,
        @NotBlank String type,
        @Nullable @Size(max = 256) String path,
        @Nullable @Size(max = 256) String component,
        @Nullable @Size(max = 64) String icon,
        @Nullable @Size(max = 128) String permission,
        @Nullable Integer sort,
        @Nullable Boolean visible,
        @Nullable Boolean keepAlive,
        @Nullable Boolean isExternal,
        @Nullable String status) {}

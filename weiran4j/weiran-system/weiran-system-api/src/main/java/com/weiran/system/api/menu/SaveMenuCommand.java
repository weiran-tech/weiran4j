package com.weiran.system.api.menu;

import org.jspecify.annotations.Nullable;

/**
 * 新增或修改菜单。
 *
 * @param parentId 父 ID，0 为根
 * @param title 标题
 * @param type {@code directory / menu / button}
 * @param path 路由路径（menu 必填）
 * @param component 前端组件标识
 * @param icon 图标名
 * @param permission 权限码（button 必填）
 * @param sort 排序，空为 0
 * @param visible 是否显示，空为 true
 * @param keepAlive 是否缓存，空为 false
 * @param isExternal 是否外链，空为 false
 * @param status 状态，空为 enabled
 */
public record SaveMenuCommand(
        long parentId,
        String title,
        String type,
        @Nullable String path,
        @Nullable String component,
        @Nullable String icon,
        @Nullable String permission,
        @Nullable Integer sort,
        @Nullable Boolean visible,
        @Nullable Boolean keepAlive,
        @Nullable Boolean isExternal,
        @Nullable String status) {}

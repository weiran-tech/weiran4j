package com.weiran.system.api.menu;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 菜单树节点。
 *
 * @param id ID
 * @param parentId 父 ID，0 为根
 * @param title 标题
 * @param type {@code directory / menu / button}
 * @param path 路由路径
 * @param component 前端组件标识
 * @param icon 图标名
 * @param permission 权限码
 * @param sort 排序
 * @param visible 是否在导航中显示
 * @param keepAlive 是否缓存页面
 * @param isExternal 是否外链
 * @param status 状态
 * @param children 子节点
 */
public record MenuNode(
        long id,
        long parentId,
        String title,
        String type,
        @Nullable String path,
        @Nullable String component,
        @Nullable String icon,
        @Nullable String permission,
        int sort,
        boolean visible,
        boolean keepAlive,
        boolean isExternal,
        String status,
        List<MenuNode> children) {}

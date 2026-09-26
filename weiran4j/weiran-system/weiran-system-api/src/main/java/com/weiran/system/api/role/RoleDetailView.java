package com.weiran.system.api.role;

import java.time.LocalDateTime;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 角色详情：{@link RoleView} 的全部字段加上已授予的菜单 ID。
 *
 * @param id ID
 * @param name 名称
 * @param code 编码
 * @param description 描述
 * @param sort 排序
 * @param status 状态
 * @param isBuiltin 是否内置
 * @param userCount 绑定用户数
 * @param createdAt 创建时间
 * @param updatedAt 更新时间
 * @param menuIds 已授予的菜单 ID
 */
public record RoleDetailView(
        long id,
        String name,
        String code,
        @Nullable String description,
        int sort,
        String status,
        boolean isBuiltin,
        long userCount,
        @Nullable LocalDateTime createdAt,
        @Nullable LocalDateTime updatedAt,
        List<Long> menuIds) {

    /** 由列表视图与菜单 ID 组合。 */
    public static RoleDetailView of(final RoleView view, final List<Long> menuIds) {
        return new RoleDetailView(
                view.id(),
                view.name(),
                view.code(),
                view.description(),
                view.sort(),
                view.status(),
                view.isBuiltin(),
                view.userCount(),
                view.createdAt(),
                view.updatedAt(),
                List.copyOf(menuIds));
    }
}

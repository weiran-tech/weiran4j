package com.weiran.system.domain.user;

import com.weiran.framework.error.BizException;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 收藏菜单规则：按收藏顺序保存菜单 ID，去重后最多 {@link #MAX_SIZE} 个，且只能收藏当前用户可访问的菜单页面。
 *
 * <p>「可访问」由调用方按授权规则算好传入（启用、类型为 menu、当前用户有权限；超管为全部启用菜单）。
 */
public final class FavoriteMenus {

    /** 最多收藏的菜单数。 */
    public static final int MAX_SIZE = 50;

    private FavoriteMenus() {}

    /**
     * 校验并规整待保存的收藏：去重（保留首次出现的位置）、限制数量、逐个校验可访问。
     *
     * @param menuIds 前端提交的菜单 ID（按收藏顺序）
     * @param accessibleMenuIds 当前用户可收藏的菜单 ID
     * @return 去重后的菜单 ID
     */
    public static List<Long> normalize(final Collection<Long> menuIds, final Set<Long> accessibleMenuIds) {
        final Set<Long> distinct = new LinkedHashSet<>();
        for (final Long menuId : menuIds) {
            if (menuId == null) {
                throw BizException.badRequest("menuIds: 不能包含空值");
            }
            distinct.add(menuId);
        }
        if (distinct.size() > FavoriteMenus.MAX_SIZE) {
            throw BizException.badRequest("menuIds: 最多收藏 " + FavoriteMenus.MAX_SIZE + " 个菜单");
        }
        for (final Long menuId : distinct) {
            if (!accessibleMenuIds.contains(menuId)) {
                throw BizException.badRequest("menuIds: 菜单 " + menuId + " 不存在或无权访问");
            }
        }
        return List.copyOf(distinct);
    }

    /** 读取时过滤掉已删除、已禁用或已无权访问的菜单，保持收藏顺序。 */
    public static List<Long> retainAccessible(final Collection<Long> storedIds, final Set<Long> accessibleMenuIds) {
        return storedIds.stream().distinct().filter(accessibleMenuIds::contains).toList();
    }
}

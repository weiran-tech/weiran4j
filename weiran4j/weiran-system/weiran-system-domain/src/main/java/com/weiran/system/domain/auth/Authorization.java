package com.weiran.system.domain.auth;

import com.weiran.system.domain.hierarchy.Hierarchy;
import com.weiran.system.domain.menu.Menu;
import com.weiran.system.domain.role.Role;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * 授权规则：由「用户的角色 + 角色授予的菜单」推导角色编码、权限码与可见菜单。
 *
 * <p>规则：
 * <ul>
 *   <li>只有启用的角色生效；拥有 {@link #SUPER_ADMIN_ROLE} 即超级管理员，对外权限展示为 {@code ["*"]}；</li>
 *   <li>权限码来自授予菜单中启用且带权限码的节点（含按钮）；</li>
 *   <li>可见菜单只含目录与菜单，节点及其全部祖先都必须启用；授予了子菜单却没勾父目录时自动补上父目录。</li>
 * </ul>
 */
public final class Authorization {

    /** 超级管理员角色编码。 */
    public static final String SUPER_ADMIN_ROLE = "super_admin";

    /** 对外展示「全部权限」的通配符。 */
    public static final String WILDCARD = "*";

    private final Set<String> roleCodes;

    private final boolean superAdmin;

    private final Set<Long> grantedMenuIds;

    private Authorization(final Set<String> roleCodes, final Set<Long> grantedMenuIds) {
        this.roleCodes = Set.copyOf(roleCodes);
        this.superAdmin = roleCodes.contains(Authorization.SUPER_ADMIN_ROLE);
        this.grantedMenuIds = Set.copyOf(grantedMenuIds);
    }

    /**
     * 构造授权视图。
     *
     * @param roles 用户绑定的角色（含禁用的，这里会过滤）
     * @param grantedMenuIds 启用角色授予的菜单 ID 并集
     */
    public static Authorization of(final Collection<Role> roles, final Set<Long> grantedMenuIds) {
        final Set<String> codes =
                roles.stream().filter(Role::isEnabled).map(Role::getCode).collect(Collectors.toSet());
        return new Authorization(codes, grantedMenuIds);
    }

    /** 从角色列表中挑出生效（启用）角色的 ID。 */
    public static Set<Long> effectiveRoleIds(final Collection<Role> roles) {
        return roles.stream().filter(Role::isEnabled).map(Role::requireId).collect(Collectors.toSet());
    }

    /** 是否超级管理员。 */
    public boolean isSuperAdmin() {
        return this.superAdmin;
    }

    /** 生效的角色编码（排序后便于展示与比较）。 */
    public Set<String> roleCodes() {
        return new TreeSet<>(this.roleCodes);
    }

    /** 实际拥有的权限码（超级管理员为全部菜单的权限码）。 */
    public Set<String> permissions(final List<Menu> allMenus) {
        final Set<Long> enabled = Authorization.enabledIds(allMenus);
        return allMenus.stream()
                .filter(menu -> enabled.contains(menu.requireId()))
                .filter(menu -> this.superAdmin || this.grantedMenuIds.contains(menu.requireId()))
                .filter(Menu::hasPermission)
                .map(Menu::getPermission)
                .filter(permission -> permission != null)
                .collect(Collectors.toCollection(TreeSet::new));
    }

    /** 对外展示的权限码：超级管理员为 {@code ["*"]}。 */
    public Set<String> displayPermissions(final List<Menu> allMenus) {
        return this.superAdmin ? Set.of(Authorization.WILDCARD) : this.permissions(allMenus);
    }

    /** 可见的导航菜单（目录与菜单），保持入参顺序。 */
    public List<Menu> visibleMenus(final List<Menu> allMenus) {
        final Set<Long> enabled = Authorization.enabledIds(allMenus);
        final Set<Long> allowed;
        if (this.superAdmin) {
            allowed = enabled;
        } else {
            final Set<Long> granted = new HashSet<>(this.grantedMenuIds);
            granted.retainAll(enabled);
            allowed = Authorization.hierarchyOf(allMenus).withAncestors(granted);
            allowed.retainAll(enabled);
        }
        return allMenus.stream()
                .filter(Menu::isNavigable)
                .filter(menu -> allowed.contains(menu.requireId()))
                .toList();
    }

    /** 自身与全部祖先都启用的菜单 ID。 */
    private static Set<Long> enabledIds(final List<Menu> allMenus) {
        final Map<Long, Menu> byId = new HashMap<>();
        allMenus.forEach(menu -> byId.put(menu.requireId(), menu));
        final Set<Long> result = new HashSet<>();
        for (final Menu menu : allMenus) {
            Menu current = menu;
            boolean chainEnabled = true;
            final Set<Long> visited = new HashSet<>();
            while (current != null && visited.add(current.requireId())) {
                if (!current.isEnabled()) {
                    chainEnabled = false;
                    break;
                }
                current = byId.get(current.getParentId());
            }
            if (chainEnabled) {
                result.add(menu.requireId());
            }
        }
        return result;
    }

    private static Hierarchy hierarchyOf(final List<Menu> allMenus) {
        final Map<Long, Long> parentById = new HashMap<>();
        allMenus.forEach(menu -> parentById.put(menu.requireId(), menu.getParentId()));
        return Hierarchy.of(parentById);
    }
}

package com.weiran.system.domain.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.weiran.common.status.EnableStatus;
import com.weiran.system.domain.menu.Menu;
import com.weiran.system.domain.menu.MenuType;
import com.weiran.system.domain.role.Role;
import java.util.List;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AuthorizationTest {

    /**
     * 1 首页(menu)
     * 2 系统管理(directory)
     * ├── 3 用户管理(menu, system:user:list)
     * │   └── 100 新增(button, system:user:create)
     * └── 4 角色管理(menu, system:role:list, 禁用)
     *     └── 101 新增(button, system:role:create)
     */
    private final List<Menu> menus = List.of(
            AuthorizationTest.menu(1, 0, MenuType.MENU, null, EnableStatus.ENABLED),
            AuthorizationTest.menu(2, 0, MenuType.DIRECTORY, null, EnableStatus.ENABLED),
            AuthorizationTest.menu(3, 2, MenuType.MENU, "system:user:list", EnableStatus.ENABLED),
            AuthorizationTest.menu(100, 3, MenuType.BUTTON, "system:user:create", EnableStatus.ENABLED),
            AuthorizationTest.menu(4, 2, MenuType.MENU, "system:role:list", EnableStatus.DISABLED),
            AuthorizationTest.menu(101, 4, MenuType.BUTTON, "system:role:create", EnableStatus.ENABLED));

    private static Menu menu(
            final long id,
            final long parentId,
            final MenuType type,
            final @Nullable String permission,
            final EnableStatus status) {
        return Menu.builder()
                .id(id)
                .parentId(parentId)
                .title("m" + id)
                .type(type)
                .path("/m" + id)
                .permission(permission)
                .visible(true)
                .status(status)
                .build();
    }

    private static Role role(final long id, final String code, final EnableStatus status) {
        return Role.builder().id(id).name(code).code(code).status(status).build();
    }

    @Test
    @DisplayName("超级管理员展示权限为 *，可见全部启用的目录与菜单")
    void superAdminSeesEverything() {
        final Authorization authorization = Authorization.of(
                List.of(AuthorizationTest.role(1, Authorization.SUPER_ADMIN_ROLE, EnableStatus.ENABLED)), Set.of());

        assertThat(authorization.isSuperAdmin()).isTrue();
        assertThat(authorization.displayPermissions(this.menus)).containsExactly(Authorization.WILDCARD);
        assertThat(authorization.permissions(this.menus)).containsExactly("system:user:create", "system:user:list");
        assertThat(authorization.visibleMenus(this.menus))
                .extracting(Menu::getId)
                .containsExactly(1L, 2L, 3L);
    }

    @Test
    @DisplayName("普通角色只得到授予且启用的权限，自动补齐父目录，禁用分支整体不可见")
    void regularRoleGetsGrantedOnly() {
        final Authorization authorization = Authorization.of(
                List.of(AuthorizationTest.role(2, "editor", EnableStatus.ENABLED)), Set.of(3L, 100L, 4L, 101L));

        assertThat(authorization.isSuperAdmin()).isFalse();
        assertThat(authorization.roleCodes()).containsExactly("editor");
        assertThat(authorization.displayPermissions(this.menus))
                .containsExactly("system:user:create", "system:user:list");
        assertThat(authorization.visibleMenus(this.menus))
                .extracting(Menu::getId)
                .containsExactly(2L, 3L);
    }

    @Test
    @DisplayName("禁用角色不生效，包括禁用的超级管理员角色")
    void disabledRolesAreIgnored() {
        final List<Role> roles = List.of(
                AuthorizationTest.role(1, Authorization.SUPER_ADMIN_ROLE, EnableStatus.DISABLED),
                AuthorizationTest.role(2, "editor", EnableStatus.ENABLED));

        final Authorization authorization = Authorization.of(roles, Set.of());

        assertThat(authorization.isSuperAdmin()).isFalse();
        assertThat(authorization.roleCodes()).containsExactly("editor");
        assertThat(Authorization.effectiveRoleIds(roles)).containsExactly(2L);
        assertThat(authorization.visibleMenus(this.menus)).isEmpty();
    }
}

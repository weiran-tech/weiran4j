package com.weiran.system.domain.rbac;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.system.domain.error.SystemErrors;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PermissionCheckerTest {

    private static final Set<String> PLAIN_ROLE = Set.of("editor");

    private static final Set<String> PERMISSIONS = Set.of("weiran-system:account.index");

    private static final String INDEX = "weiran-system:account.index";

    private static final String DESTROY = "weiran-system:account.destroy";

    @Test
    @DisplayName("持有权限点即通过")
    void grantsWhenPermissionHeld() {
        assertThat(PermissionChecker.has(
                        PermissionCheckerTest.PLAIN_ROLE,
                        PermissionCheckerTest.PERMISSIONS,
                        PermissionCheckerTest.INDEX))
                .isTrue();
    }

    @Test
    @DisplayName("缺少权限点则不通过")
    void deniesWhenPermissionMissing() {
        assertThat(PermissionChecker.has(
                        PermissionCheckerTest.PLAIN_ROLE,
                        PermissionCheckerTest.PERMISSIONS,
                        PermissionCheckerTest.DESTROY))
                .isFalse();
    }

    @Test
    @DisplayName("超级角色短路全部权限判定")
    void superRoleShortCircuitsEveryCheck() {
        assertThat(PermissionChecker.has(Set.of(PermissionChecker.SUPER_ROLE), Set.of(), PermissionCheckerTest.DESTROY))
                .isTrue();
    }

    @Test
    @DisplayName("任意其一命中即通过，空需求集合视为无需权限")
    void hasAnyPassesOnFirstMatchAndOnEmptyRequirement() {
        assertThat(PermissionChecker.hasAny(
                        PermissionCheckerTest.PLAIN_ROLE,
                        PermissionCheckerTest.PERMISSIONS,
                        Set.of(PermissionCheckerTest.DESTROY, PermissionCheckerTest.INDEX)))
                .isTrue();
        assertThat(PermissionChecker.hasAny(
                        PermissionCheckerTest.PLAIN_ROLE, PermissionCheckerTest.PERMISSIONS, Set.of()))
                .isTrue();
    }

    @Test
    @DisplayName("ensure 在缺权限时抛出并带上所缺权限名")
    void ensureThrowsWithMissingPermissionName() {
        assertThatThrownBy(() -> PermissionChecker.ensure(
                        PermissionCheckerTest.PLAIN_ROLE,
                        PermissionCheckerTest.PERMISSIONS,
                        PermissionCheckerTest.DESTROY))
                .isInstanceOf(ErrorCodeException.class)
                .hasMessageContaining(PermissionCheckerTest.DESTROY)
                .extracting(error -> ((ErrorCodeException) error).getErrorCode())
                .isEqualTo(SystemErrors.PERMISSION_DENIED);
    }

    @Test
    @DisplayName("授权主体快照复制入参集合，外部无法改动")
    void principalCopiesInputCollections() {
        final AuthorizedPrincipal principal = new AuthorizedPrincipal(
                7L, "backend", "zhangsan", PermissionCheckerTest.PLAIN_ROLE, PermissionCheckerTest.PERMISSIONS);

        assertThat(principal.has(PermissionCheckerTest.INDEX)).isTrue();
        assertThatThrownBy(() -> principal.roleNames().add("hacker")).isInstanceOf(UnsupportedOperationException.class);
    }
}

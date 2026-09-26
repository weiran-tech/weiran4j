package com.weiran.framework.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.error.BizException;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LoginUserTest {

    private final LoginUser editor =
            new LoginUser(2L, "zhangsan", "张三", Set.of("editor"), Set.of("system:user:list", "system:user:create"));

    @Test
    @DisplayName("ANY 任一满足即可，ALL 需要全部满足")
    void combinesPermissions() {
        assertThat(this.editor.hasPermissions(new String[] {"system:user:list", "x"}, Logical.ANY))
                .isTrue();
        assertThat(this.editor.hasPermissions(new String[] {"system:user:list", "x"}, Logical.ALL))
                .isFalse();
        assertThat(this.editor.hasPermissions(new String[] {"system:user:list", "system:user:create"}, Logical.ALL))
                .isTrue();
        assertThat(this.editor.hasPermissions(new String[] {}, Logical.ALL)).isTrue();
    }

    @Test
    @DisplayName("超级管理员拥有全部权限")
    void superAdminHasEverything() {
        final LoginUser admin = new LoginUser(1L, "admin", "管理员", Set.of(LoginUser.SUPER_ADMIN_ROLE), Set.of());
        assertThat(admin.isSuperAdmin()).isTrue();
        assertThat(admin.hasPermission("anything")).isTrue();
        assertThat(this.editor.isSuperAdmin()).isFalse();
    }

    @Test
    @DisplayName("runAs 结束后恢复原上下文，未登录时 require 抛 401")
    void currentUserLifecycle() {
        CurrentUser.runAs(
                this.editor, () -> assertThat(CurrentUser.require().id()).isEqualTo(2L));
        assertThat(CurrentUser.get()).isEmpty();
        assertThatThrownBy(CurrentUser::require)
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode().code()).isEqualTo(40100));
    }
}

package com.weiran.system.domain.role;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.status.EnableStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RoleTest {

    private static Role role(final boolean builtin) {
        return Role.builder()
                .id(1L)
                .name("超级管理员")
                .code("super_admin")
                .sort(0)
                .status(EnableStatus.ENABLED)
                .builtin(builtin)
                .build();
    }

    @Test
    @DisplayName("角色编码必须小写字母开头、2–64 位")
    void validatesCode() {
        assertThatCode(() -> Role.validateCode("editor_2")).doesNotThrowAnyException();
        assertThatThrownBy(() -> Role.validateCode("Editor")).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> Role.validateCode("e")).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> Role.validateCode("1abc")).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> Role.validateCode("a".repeat(65))).isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("内置角色编码不可改、不可禁用，其它字段可改")
    void protectsBuiltinRole() {
        assertThatThrownBy(() -> RoleTest.role(true).withDetails("x", "admin", null, 0, EnableStatus.ENABLED))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.CONFLICT));
        assertThatThrownBy(() -> RoleTest.role(true).withDetails("x", "super_admin", null, 0, EnableStatus.DISABLED))
                .hasMessage("内置角色不可禁用");
        final Role renamed = RoleTest.role(true).withDetails("超管", "super_admin", "描述", 5, EnableStatus.ENABLED);
        assertThat(renamed.getName()).isEqualTo("超管");
        assertThat(renamed.getSort()).isEqualTo(5);
        assertThat(RoleTest.role(false)
                        .withDetails("x", "other", null, 0, EnableStatus.DISABLED)
                        .isEnabled())
                .isFalse();
    }

    @Test
    @DisplayName("内置角色或仍有用户的角色不可删除")
    void guardsDeletion() {
        assertThatThrownBy(() -> RoleTest.role(true).ensureDeletable(0)).hasMessage("内置角色不可删除");
        assertThatThrownBy(() -> RoleTest.role(false).ensureDeletable(2)).isInstanceOf(BizException.class);
        assertThatCode(() -> RoleTest.role(false).ensureDeletable(0)).doesNotThrowAnyException();
        assertThat(RoleTest.role(false).requireId()).isEqualTo(1L);
    }
}

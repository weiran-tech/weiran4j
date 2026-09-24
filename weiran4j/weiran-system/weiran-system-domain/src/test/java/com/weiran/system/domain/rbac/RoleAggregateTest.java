package com.weiran.system.domain.rbac;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.system.domain.error.SystemErrors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RoleAggregateTest {

    @Test
    @DisplayName("更新可变资料字段不影响 name 与 system 标记")
    void updateProfileKeepsNameAndSystemFlag() {
        final RoleAggregate role = RoleAggregateTest.systemRole();

        final RoleAggregate updated = role.updateProfile("新显示名", "新描述", false);

        assertThat(updated.getName()).isEqualTo(role.getName());
        assertThat(updated.isSystem()).isEqualTo(role.isSystem());
        assertThat(updated.getTitle()).isEqualTo("新显示名");
        assertThat(updated.getDescription()).isEqualTo("新描述");
        assertThat(updated.isEnabled()).isFalse();
    }

    @Test
    @DisplayName("系统内置角色拒绝删除")
    void systemRoleCannotBeDeleted() {
        final RoleAggregate role = RoleAggregateTest.systemRole();

        assertThatThrownBy(role::ensureDeletable)
                .isInstanceOf(ErrorCodeException.class)
                .extracting(error -> ((ErrorCodeException) error).getErrorCode())
                .isEqualTo(SystemErrors.SYSTEM_ROLE_NOT_DELETABLE);
    }

    @Test
    @DisplayName("非系统角色允许删除")
    void nonSystemRoleCanBeDeleted() {
        final RoleAggregate role =
                RoleAggregateTest.systemRole().toBuilder().system(false).build();

        role.ensureDeletable();
    }

    private static RoleAggregate systemRole() {
        return RoleAggregate.builder()
                .id(1L)
                .name("super")
                .title("超级管理员")
                .description("系统内置超级管理员角色")
                .accountType("backend")
                .enabled(true)
                .system(true)
                .build();
    }
}

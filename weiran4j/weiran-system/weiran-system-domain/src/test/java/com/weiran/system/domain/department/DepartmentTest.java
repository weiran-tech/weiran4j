package com.weiran.system.domain.department;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.status.EnableStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DepartmentTest {

    @Test
    @DisplayName("有子部门或仍有用户时不可删除")
    void guardsDeletion() {
        assertThatThrownBy(() -> Department.ensureDeletable(true, 0)).hasMessage("请先删除下级部门");
        assertThatThrownBy(() -> Department.ensureDeletable(false, 3)).hasMessageContaining("3 个用户");
        assertThatCode(() -> Department.ensureDeletable(false, 0)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("未持久化的部门取 ID 抛异常")
    void requireId() {
        final Department department = Department.builder()
                .parentId(0)
                .name("总公司")
                .code("HQ")
                .status(EnableStatus.ENABLED)
                .build();
        assertThatThrownBy(department::requireId).isInstanceOf(IllegalStateException.class);
        assertThat(department.toBuilder().id(1L).build().requireId()).isEqualTo(1L);
    }
}

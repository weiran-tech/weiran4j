package com.weiran.system.domain.hierarchy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class HierarchyTest {

    /**
     * 1
     * ├── 2
     * │   └── 4
     * │       └── 5
     * └── 3
     * 6（另一棵树）
     */
    private final Hierarchy hierarchy = Hierarchy.of(Map.of(1L, 0L, 2L, 1L, 3L, 1L, 4L, 2L, 5L, 4L, 6L, 0L));

    @Test
    @DisplayName("父节点是自己时拒绝并返回 40901")
    void rejectsSelfAsParent() {
        assertThatThrownBy(() -> this.hierarchy.ensureValidParent(2L, 2L, "部门"))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.CONFLICT))
                .hasMessage("上级部门不能是自己或自己的下级");
    }

    @Test
    @DisplayName("父节点是自己的后代（含隔代）时拒绝")
    void rejectsDescendantAsParent() {
        assertThatThrownBy(() -> this.hierarchy.ensureValidParent(2L, 5L, "菜单"))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.CONFLICT));
        assertThatThrownBy(() -> this.hierarchy.ensureValidParent(1L, 4L, "菜单")).isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("挂到根、兄弟节点或其它树下是合法的")
    void acceptsValidParents() {
        assertThatCode(() -> this.hierarchy.ensureValidParent(4L, 0L, "部门")).doesNotThrowAnyException();
        assertThatCode(() -> this.hierarchy.ensureValidParent(4L, 3L, "部门")).doesNotThrowAnyException();
        assertThatCode(() -> this.hierarchy.ensureValidParent(2L, 6L, "部门")).doesNotThrowAnyException();
        // 新建节点还没有 ID：用一个不存在的 ID 校验父节点存在即可。
        assertThatCode(() -> this.hierarchy.ensureValidParent(-1L, 5L, "部门")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("父节点不存在返回 40000")
    void rejectsMissingParent() {
        assertThatThrownBy(() -> this.hierarchy.ensureValidParent(2L, 99L, "部门"))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST));
    }

    @Test
    @DisplayName("计算后代、自身加后代与祖先闭包")
    void computesRelatives() {
        assertThat(this.hierarchy.descendantsOf(2L)).containsExactlyInAnyOrder(4L, 5L);
        assertThat(this.hierarchy.selfAndDescendantsOf(1L)).containsExactlyInAnyOrder(1L, 2L, 3L, 4L, 5L);
        assertThat(this.hierarchy.descendantsOf(5L)).isEmpty();
        assertThat(this.hierarchy.withAncestors(List.of(5L, 3L))).containsExactlyInAnyOrder(1L, 2L, 3L, 4L, 5L);
        assertThat(this.hierarchy.hasChildren(4L)).isTrue();
        assertThat(this.hierarchy.hasChildren(3L)).isFalse();
    }

    @Test
    @DisplayName("库里已存在的脏环不会导致死循环")
    void survivesExistingCycle() {
        final Hierarchy dirty = Hierarchy.of(Map.of(1L, 2L, 2L, 1L));
        assertThat(dirty.descendantsOf(1L)).containsExactly(2L);
        assertThat(dirty.withAncestors(List.of(1L))).containsExactlyInAnyOrder(1L, 2L);
    }
}

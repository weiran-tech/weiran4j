package com.weiran.platform.domain.dict;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.status.EnableStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DictTest {

    private static Dict dict(final boolean builtin) {
        return Dict.builder()
                .id(1L)
                .name("用户性别")
                .code("sys_user_gender")
                .status(EnableStatus.ENABLED)
                .builtin(builtin)
                .build();
    }

    @Test
    @DisplayName("内置字典编码不可改、不可删除，其它字段可改")
    void protectsBuiltinDict() {
        assertThatThrownBy(() -> DictTest.dict(true).withDetails("x", "other", null, EnableStatus.ENABLED))
                .hasMessage("内置字典的编码不可修改");
        assertThatThrownBy(() -> DictTest.dict(true).ensureDeletable()).hasMessage("内置字典不可删除");
        assertThatThrownBy(() -> DictTest.dict(true).withDetails("性别", "sys_user_gender", null, EnableStatus.DISABLED))
                .hasMessage("内置字典不可禁用");
        final Dict renamed = DictTest.dict(true).withDetails("性别", "sys_user_gender", "描述", EnableStatus.ENABLED);
        assertThat(renamed.getName()).isEqualTo("性别");
        assertThat(DictTest.dict(false)
                        .withDetails("x", "y", null, EnableStatus.DISABLED)
                        .isEnabled())
                .isFalse();
        assertThatCode(() -> DictTest.dict(false).ensureDeletable()).doesNotThrowAnyException();
        assertThat(DictTest.dict(false)
                        .withDetails("x", "y", null, EnableStatus.ENABLED)
                        .getCode())
                .isEqualTo("y");
    }

    @Test
    @DisplayName("未持久化的字典与字典项取 ID 抛异常")
    void requireId() {
        assertThatThrownBy(
                        () -> DictTest.dict(false).toBuilder().id(null).build().requireId())
                .isInstanceOf(IllegalStateException.class);
        final DictItem item = DictItem.builder()
                .dictId(1L)
                .label("男")
                .value("male")
                .status(EnableStatus.ENABLED)
                .build();
        assertThatThrownBy(item::requireId).isInstanceOf(IllegalStateException.class);
        assertThat(item.toBuilder().id(3L).build().requireId()).isEqualTo(3L);
    }
}

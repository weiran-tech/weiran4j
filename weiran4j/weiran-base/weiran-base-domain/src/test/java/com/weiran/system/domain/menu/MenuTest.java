package com.weiran.system.domain.menu;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.error.BizException;
import com.weiran.common.status.EnableStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MenuTest {

    static Menu.MenuBuilder menu(final long id, final long parentId, final MenuType type) {
        return Menu.builder()
                .id(id)
                .parentId(parentId)
                .title("m" + id)
                .type(type)
                .sort((int) id)
                .visible(true)
                .status(EnableStatus.ENABLED);
    }

    @Test
    @DisplayName("菜单类型必须有路径，按钮类型必须有权限码")
    void validatesRequiredFields() {
        assertThatThrownBy(() -> MenuTest.menu(1, 0, MenuType.MENU).build().validate(null))
                .isInstanceOf(BizException.class)
                .hasMessageStartingWith("path");
        assertThatThrownBy(() -> MenuTest.menu(1, 0, MenuType.BUTTON)
                        .permission(" ")
                        .build()
                        .validate(null))
                .hasMessageStartingWith("permission");
        assertThatCode(() ->
                        MenuTest.menu(1, 0, MenuType.MENU).path("/a").build().validate(null))
                .doesNotThrowAnyException();
        assertThatCode(() -> MenuTest.menu(1, 0, MenuType.DIRECTORY).build().validate(null))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("按钮下不能再挂节点")
    void rejectsChildOfButton() {
        final Menu button =
                MenuTest.menu(9, 1, MenuType.BUTTON).permission("x:y").build();
        assertThatThrownBy(() -> MenuTest.menu(10, 9, MenuType.BUTTON)
                        .permission("x:z")
                        .build()
                        .validate(button))
                .hasMessageStartingWith("parentId");
    }

    @Test
    @DisplayName("按类型字符串解析，非法值抛 40000")
    void parsesType() {
        assertThatCode(() -> MenuType.of("directory")).doesNotThrowAnyException();
        assertThatThrownBy(() -> MenuType.of("page")).isInstanceOf(BizException.class);
    }
}

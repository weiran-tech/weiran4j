package com.weiran.system.domain.menu;

import com.weiran.common.error.BizException;
import java.util.Arrays;

/** 菜单类型。 */
public enum MenuType {

    /** 目录：只用于分组，没有页面。 */
    DIRECTORY("directory"),

    /** 菜单：对应一个前端页面。 */
    MENU("menu"),

    /** 按钮：页面内的操作权限点，不出现在导航里。 */
    BUTTON("button");

    private final String value;

    MenuType(final String value) {
        this.value = value;
    }

    /** 对外字符串值。 */
    public String value() {
        return this.value;
    }

    /** 解析字符串值，非法值抛 40000。 */
    public static MenuType of(final String value) {
        return Arrays.stream(MenuType.values())
                .filter(type -> type.value.equals(value))
                .findFirst()
                .orElseThrow(() -> BizException.badRequest("type: 取值只能是 directory、menu 或 button"));
    }
}

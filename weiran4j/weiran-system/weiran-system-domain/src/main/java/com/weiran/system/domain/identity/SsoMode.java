package com.weiran.system.domain.identity;

import java.util.Locale;

/** 外部登录流程的用途。 */
public enum SsoMode {

    /** 用外部身份登录。 */
    LOGIN,

    /** 已登录用户把外部身份绑定到自己。 */
    BIND;

    /** 解析查询参数；空值或不认识的值视为登录。 */
    public static SsoMode parse(final String value) {
        return "bind".equals(value.strip().toLowerCase(Locale.ROOT)) ? SsoMode.BIND : SsoMode.LOGIN;
    }
}

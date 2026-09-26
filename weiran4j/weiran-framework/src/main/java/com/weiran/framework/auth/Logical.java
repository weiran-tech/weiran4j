package com.weiran.framework.auth;

/** 多个权限码之间的组合方式。 */
public enum Logical {

    /** 拥有任一权限码即可。 */
    ANY,

    /** 必须拥有全部权限码。 */
    ALL
}

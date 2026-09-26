package com.weiran.framework.persistence;

import org.jspecify.annotations.Nullable;

/**
 * LIKE 关键字转义：把用户输入里的 {@code \\}、{@code %}、{@code _} 当作普通字符。
 *
 * <p>MyBatis-Plus 的 {@code like()} 只负责两端加 {@code %}，不转义；不转义时搜「50%」会匹配所有以 50 开头的记录。
 * 使用 MySQL 默认转义符 {@code \\}。
 */
public final class Likes {

    private Likes() {}

    /** 转义 LIKE 通配符；null 原样返回。 */
    public static @Nullable String escape(final @Nullable String keyword) {
        if (keyword == null) {
            return null;
        }
        return keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}

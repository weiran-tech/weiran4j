package com.weiran.common.text;

import org.jspecify.annotations.Nullable;

/** 文本规范化：可选字段统一「去首尾空白，空串当作未填」。 */
public final class Texts {

    private Texts() {}

    /** 去首尾空白；结果为空串时返回 null。 */
    public static @Nullable String trimToNull(final @Nullable String value) {
        if (value == null) {
            return null;
        }
        final String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** 去首尾空白；null 视为空串。 */
    public static String trimToEmpty(final @Nullable String value) {
        return value == null ? "" : value.strip();
    }

    /** 截断到指定长度（按 char 计）。 */
    public static String truncate(final String value, final int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}

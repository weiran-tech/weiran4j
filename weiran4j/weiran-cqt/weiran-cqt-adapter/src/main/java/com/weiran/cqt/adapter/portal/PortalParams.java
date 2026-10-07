package com.weiran.cqt.adapter.portal;

import com.weiran.framework.error.BizException;
import org.jspecify.annotations.Nullable;

/** 前台入参的宽松解析：uniapp 的数字字段可能是数字、数字字符串或空串。 */
final class PortalParams {

    private PortalParams() {}

    /**
     * 解析整数：null 或空白为 null，其它非整数报 400。
     *
     * @param field 字段名（出现在提示语里）
     * @param raw 原始值
     */
    static @Nullable Integer integer(final String field, final @Nullable String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(raw.strip());
        } catch (final NumberFormatException ex) {
            throw BizException.badRequest(field + ": 参数类型不正确");
        }
    }

    /**
     * 解析长整数：null 或空白为 null，数字类型直接取值，其它非整数报 400。
     *
     * @param field 字段名（出现在提示语里）
     * @param raw 原始值（JSON 里可能是数字或字符串）
     */
    static @Nullable Long longValue(final String field, final @Nullable Object raw) {
        if (raw instanceof final Number number) {
            return number.longValue();
        }
        final String text = raw == null ? "" : String.valueOf(raw).strip();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Long.valueOf(text);
        } catch (final NumberFormatException ex) {
            throw BizException.badRequest(field + ": 参数类型不正确");
        }
    }

    /** 宽松取长整数：不是纯数字时返回 null（同原系统 {@code numeric_or_none}，不报错）。 */
    static @Nullable Long longOrNull(final @Nullable Object raw) {
        if (raw instanceof final Number number) {
            return number.longValue();
        }
        final String text = raw == null ? "" : String.valueOf(raw).strip();
        return !text.isEmpty() && text.length() < 19 && text.chars().allMatch(Character::isDigit)
                ? Long.valueOf(text)
                : null;
    }

    /** 取字符串：null 为 null，其它转字符串。 */
    static @Nullable String text(final @Nullable Object raw) {
        return raw == null ? null : String.valueOf(raw);
    }
}

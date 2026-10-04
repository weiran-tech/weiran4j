package com.weiran.cqt.adapter.portal;

import com.weiran.common.error.BizException;
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
}

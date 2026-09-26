package com.weiran.common.status;

import com.weiran.common.error.BizException;
import java.util.Arrays;
import org.jspecify.annotations.Nullable;

/** 启用状态，对外（接口与数据库）一律用小写字符串 {@code enabled / disabled}。 */
public enum EnableStatus {

    /** 启用。 */
    ENABLED("enabled"),

    /** 禁用。 */
    DISABLED("disabled");

    private final String value;

    EnableStatus(final String value) {
        this.value = value;
    }

    /** 对外字符串值。 */
    public String value() {
        return this.value;
    }

    /** 解析字符串值；非法值抛 40000。 */
    public static EnableStatus of(final String value) {
        return Arrays.stream(EnableStatus.values())
                .filter(status -> status.value.equals(value))
                .findFirst()
                .orElseThrow(() -> BizException.badRequest("status: 取值只能是 enabled 或 disabled"));
    }

    /** 解析可空字符串值：空或空白返回默认值。 */
    public static EnableStatus ofNullable(final @Nullable String value, final EnableStatus defaultValue) {
        return value == null || value.isBlank() ? defaultValue : EnableStatus.of(value);
    }

    /** 解析查询条件：空或空白表示不过滤。 */
    public static @Nullable EnableStatus filterOf(final @Nullable String value) {
        return value == null || value.isBlank() ? null : EnableStatus.of(value);
    }
}

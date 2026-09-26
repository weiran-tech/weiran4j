package com.weiran.system.domain.user;

import com.weiran.common.error.BizException;
import java.util.Arrays;
import org.jspecify.annotations.Nullable;

/** 性别，对外为小写字符串。 */
public enum Gender {

    /** 男。 */
    MALE("male"),

    /** 女。 */
    FEMALE("female"),

    /** 未知。 */
    UNKNOWN("unknown");

    private final String value;

    Gender(final String value) {
        this.value = value;
    }

    /** 对外字符串值。 */
    public String value() {
        return this.value;
    }

    /** 解析字符串值；空值为 {@link #UNKNOWN}，非法值抛 40000。 */
    public static Gender of(final @Nullable String value) {
        if (value == null || value.isBlank()) {
            return Gender.UNKNOWN;
        }
        return Arrays.stream(Gender.values())
                .filter(gender -> gender.value.equals(value))
                .findFirst()
                .orElseThrow(() -> BizException.badRequest("gender: 取值只能是 male、female 或 unknown"));
    }
}

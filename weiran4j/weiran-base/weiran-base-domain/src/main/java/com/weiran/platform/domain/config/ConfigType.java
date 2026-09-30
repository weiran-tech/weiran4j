package com.weiran.platform.domain.config;

import com.weiran.common.error.BizException;
import java.math.BigDecimal;
import java.util.Arrays;

/** 配置值类型，决定配置值的校验规则。 */
public enum ConfigType {

    /** 任意字符串。 */
    STRING("string"),

    /** 可解析为十进制数。 */
    NUMBER("number"),

    /** 只能是 {@code true} 或 {@code false}。 */
    BOOLEAN("boolean"),

    /** 合法的 JSON 文本。 */
    JSON("json");

    private final String value;

    ConfigType(final String value) {
        this.value = value;
    }

    /** 对外字符串值。 */
    public String value() {
        return this.value;
    }

    /** 解析字符串值，非法值抛 40000。 */
    public static ConfigType of(final String value) {
        return Arrays.stream(ConfigType.values())
                .filter(type -> type.value.equals(value))
                .findFirst()
                .orElseThrow(() -> BizException.badRequest("configType: 取值只能是 string、number、boolean 或 json"));
    }

    /** 按类型校验配置值，不合法抛 40000。 */
    public void validate(final String configValue, final JsonSyntax jsonSyntax) {
        final boolean valid =
                switch (this) {
                    case STRING -> true;
                    case NUMBER -> ConfigType.isNumber(configValue);
                    case BOOLEAN -> "true".equals(configValue) || "false".equals(configValue);
                    case JSON -> jsonSyntax.isValid(configValue);
                };
        if (!valid) {
            throw BizException.badRequest("configValue: 不是合法的 " + this.value + " 值");
        }
    }

    private static boolean isNumber(final String text) {
        if (text.isBlank() || !text.strip().equals(text)) {
            return false;
        }
        try {
            new BigDecimal(text);
            return true;
        } catch (final NumberFormatException ex) {
            return false;
        }
    }
}

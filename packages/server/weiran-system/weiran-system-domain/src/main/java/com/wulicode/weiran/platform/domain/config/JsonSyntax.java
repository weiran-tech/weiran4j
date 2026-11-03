package com.wulicode.weiran.platform.domain.config;

/** JSON 语法校验端口：领域层不直接依赖 JSON 库。 */
@FunctionalInterface
public interface JsonSyntax {

    /** 文本是否是合法的 JSON。 */
    boolean isValid(String text);

    /** JSON 选项数组中是否包含对应字符串值。 */
    default boolean hasChoice(final String json, final String value) {
        return false;
    }

    /** 是否是带有效 label/value 的非空 JSON 选项数组。 */
    default boolean hasOptions(final String json) {
        return false;
    }
}

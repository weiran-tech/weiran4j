package com.weiran.platform.domain.config;

/** JSON 语法校验端口：领域层不直接依赖 JSON 库。 */
@FunctionalInterface
public interface JsonSyntax {

    /** 文本是否是合法的 JSON。 */
    boolean isValid(String text);
}

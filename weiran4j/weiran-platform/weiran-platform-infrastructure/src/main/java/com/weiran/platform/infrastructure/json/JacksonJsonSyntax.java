package com.weiran.platform.infrastructure.json;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.platform.domain.config.JsonSyntax;

/** 用 Jackson 校验 JSON 语法；尾随多余内容（如 {@code {} x}）也视为非法。 */
public class JacksonJsonSyntax implements JsonSyntax {

    private final ObjectMapper objectMapper;

    /** 构造校验器（复制一份 ObjectMapper 打开尾随内容检查，不影响全局实例）。 */
    public JacksonJsonSyntax(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy().enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    }

    @Override
    public boolean isValid(final String text) {
        if (text.isBlank()) {
            return false;
        }
        try {
            this.objectMapper.readTree(text);
            return true;
        } catch (final JsonProcessingException ex) {
            return false;
        }
    }
}

package com.wulicode.weiran.platform.infrastructure.json;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.platform.domain.config.JsonSyntax;

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

    @Override
    public boolean hasChoice(final String json, final String value) {
        try {
            final var options = this.objectMapper.readTree(json);
            if (options == null || !options.isArray()) {
                return false;
            }
            for (final var option : options) {
                if (option.path("value").isTextual()
                        && value.equals(option.path("value").asText())) {
                    return true;
                }
            }
            return false;
        } catch (final JsonProcessingException ex) {
            return false;
        }
    }

    @Override
    public boolean hasOptions(final String json) {
        try {
            final var options = this.objectMapper.readTree(json);
            if (options == null || !options.isArray() || options.isEmpty()) {
                return false;
            }
            for (final var option : options) {
                if (!option.path("label").isTextual() || !option.path("value").isTextual()) {
                    return false;
                }
            }
            return true;
        } catch (final JsonProcessingException ex) {
            return false;
        }
    }
}

package com.weiran.framework.log;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.jspecify.annotations.Nullable;

/**
 * 请求体脱敏与截断。
 *
 * <p>字段名（忽略大小写）包含 {@code password}，或属于令牌/密钥类字段时，值替换为 {@link #MASK}；
 * 递归处理嵌套对象与数组。
 */
public final class SensitiveDataMasker {

    /** 脱敏后的占位值。 */
    public static final String MASK = "******";

    /** 请求体最大长度（与 sys_operation_log.request_body 一致）。 */
    public static final int MAX_BODY_LENGTH = 4096;

    private static final String TRUNCATED_SUFFIX = "...";

    private static final Set<String> SENSITIVE_KEYS =
            Set.of("token", "accesstoken", "refreshtoken", "secret", "apikey", "authorization");

    private SensitiveDataMasker() {}

    /** 原地脱敏 JSON 树。 */
    public static void mask(final JsonNode node) {
        if (node instanceof final ObjectNode object) {
            final List<String> sensitive = new ArrayList<>();
            for (final Map.Entry<String, JsonNode> field : object.properties()) {
                if (SensitiveDataMasker.isSensitive(field.getKey())) {
                    sensitive.add(field.getKey());
                } else {
                    SensitiveDataMasker.mask(field.getValue());
                }
            }
            sensitive.forEach(key -> object.put(key, SensitiveDataMasker.MASK));
        } else if (node instanceof final ArrayNode array) {
            array.forEach(SensitiveDataMasker::mask);
        }
    }

    /** 字段名是否敏感。 */
    public static boolean isSensitive(final String fieldName) {
        final String key = fieldName.toLowerCase(Locale.ROOT);
        return key.contains("password") || SensitiveDataMasker.SENSITIVE_KEYS.contains(key);
    }

    /** 截断到指定长度，超长时以 {@code ...} 结尾且总长不超过上限。 */
    public static @Nullable String truncate(final @Nullable String value, final int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        final int keep = Math.max(0, maxLength - SensitiveDataMasker.TRUNCATED_SUFFIX.length());
        return value.substring(0, keep) + SensitiveDataMasker.TRUNCATED_SUFFIX;
    }
}

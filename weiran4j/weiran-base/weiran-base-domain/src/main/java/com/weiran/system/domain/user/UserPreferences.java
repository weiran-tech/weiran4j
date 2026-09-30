package com.weiran.system.domain.user;

import com.weiran.common.error.BizException;
import java.nio.charset.StandardCharsets;

/**
 * 界面偏好的存储规则：后端只存不解析字段含义，只限制序列化后的体积。
 *
 * <p>「必须是 JSON 对象」由适配层在解析请求体时判断——领域层不依赖 JSON 库。
 */
public final class UserPreferences {

    /** 序列化后的最大字节数（UTF-8）。 */
    public static final int MAX_BYTES = 16 * 1024;

    private UserPreferences() {}

    /** 校验序列化后的偏好 JSON 体积，超限抛 40000。 */
    public static void validateSize(final String json) {
        if (json.getBytes(StandardCharsets.UTF_8).length > UserPreferences.MAX_BYTES) {
            throw BizException.badRequest("preferences: 偏好数据不能超过 16KB");
        }
    }
}

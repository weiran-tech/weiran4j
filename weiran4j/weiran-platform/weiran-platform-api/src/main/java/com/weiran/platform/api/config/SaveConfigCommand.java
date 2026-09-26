package com.weiran.platform.api.config;

import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改配置。
 *
 * @param configKey 键
 * @param configValue 值（按 configType 校验）
 * @param configType {@code string / number / boolean / json}
 * @param description 描述
 */
public record SaveConfigCommand(
        String configKey,
        String configValue,
        String configType,
        @Nullable String description) {}

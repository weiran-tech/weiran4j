package com.wulicode.weiran.platform.api.config;

import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改配置。
 *
 * @param configKey 键
 * @param configValue 值（按 configType 校验）
 * @param configType {@code string / number / boolean / json}
 * @param groupKey 分组编码
 * @param fieldType 表单字段类型
 * @param fieldOptions 表单选项 JSON
 * @param required 是否必填
 * @param description 描述
 */
public record SaveConfigCommand(
        String configKey,
        String configValue,
        String configType,
        String groupKey,
        String fieldType,
        @Nullable String fieldOptions,
        boolean required,
        @Nullable String description) {}

package com.wulicode.weiran.platform.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改配置请求（值按类型校验在领域层）。
 *
 * @param configKey 键
 * @param configValue 值
 * @param configType 类型
 * @param groupKey 分组编码
 * @param fieldType 表单字段类型
 * @param fieldOptions 表单选项 JSON
 * @param required 是否必填
 * @param description 描述
 */
public record SaveConfigRequest(
        @NotBlank @Size(max = 128) String configKey,
        @NotNull @Size(max = 65535) String configValue,
        @NotBlank String configType,
        @NotBlank @Size(max = 64) String groupKey,
        @NotBlank String fieldType,
        @Nullable @Size(max = 2048) String fieldOptions,
        boolean required,
        @Nullable @Size(max = 256) String description) {}

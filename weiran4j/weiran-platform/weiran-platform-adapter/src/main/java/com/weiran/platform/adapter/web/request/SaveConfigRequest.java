package com.weiran.platform.adapter.web.request;

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
 * @param description 描述
 */
public record SaveConfigRequest(
        @NotBlank @Size(max = 128) String configKey,
        @NotNull @Size(max = 4096) String configValue,
        @NotBlank String configType,
        @Nullable @Size(max = 256) String description) {}

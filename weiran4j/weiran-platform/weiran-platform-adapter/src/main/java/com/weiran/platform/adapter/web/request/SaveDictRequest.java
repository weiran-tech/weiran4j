package com.weiran.platform.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改字典请求。
 *
 * @param name 名称
 * @param code 编码
 * @param description 描述
 * @param status 状态
 */
public record SaveDictRequest(
        @NotBlank @Size(max = 64) String name,
        @NotBlank @Size(max = 64) String code,
        @Nullable @Size(max = 256) String description,
        @Nullable String status) {}

package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改角色请求（编码格式在领域层校验）。
 *
 * @param name 名称
 * @param code 编码
 * @param description 描述
 * @param sort 排序
 * @param status 状态
 */
public record SaveRoleRequest(
        @NotBlank @Size(max = 64) String name,
        @NotBlank @Size(max = 64) String code,
        @Nullable @Size(max = 256) String description,
        @Nullable Integer sort,
        @Nullable String status) {}

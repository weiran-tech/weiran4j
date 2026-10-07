package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改部门请求。
 *
 * @param parentId 父 ID，0 为根
 * @param name 名称
 * @param code 编码
 * @param leaderId 负责人用户 ID
 * @param phone 联系电话
 * @param sort 排序
 * @param status 状态
 */
public record SaveDepartmentRequest(
        @NotNull @PositiveOrZero Long parentId,
        @NotBlank @Size(max = 64) String name,
        @NotBlank @Size(max = 64) String code,
        @Nullable Long leaderId,
        @Nullable @Size(max = 20) String phone,
        @Nullable Integer sort,
        @Nullable String status) {}

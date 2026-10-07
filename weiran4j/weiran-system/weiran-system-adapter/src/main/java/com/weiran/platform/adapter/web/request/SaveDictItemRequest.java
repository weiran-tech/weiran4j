package com.weiran.platform.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改字典项请求。
 *
 * @param label 显示文本
 * @param value 值
 * @param color 标签颜色
 * @param sort 排序
 * @param status 状态
 * @param remark 备注
 */
public record SaveDictItemRequest(
        @NotBlank @Size(max = 64) String label,
        @NotBlank @Size(max = 64) String value,
        @Nullable @Size(max = 32) String color,
        @Nullable Integer sort,
        @Nullable String status,
        @Nullable @Size(max = 256) String remark) {}

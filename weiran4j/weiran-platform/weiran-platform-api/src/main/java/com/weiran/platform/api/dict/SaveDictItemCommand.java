package com.weiran.platform.api.dict;

import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改字典项。
 *
 * @param label 显示文本
 * @param value 值（同一字典内唯一）
 * @param color 标签颜色
 * @param sort 排序，空为 0
 * @param status 状态，空为 enabled
 * @param remark 备注
 */
public record SaveDictItemCommand(
        String label,
        String value,
        @Nullable String color,
        @Nullable Integer sort,
        @Nullable String status,
        @Nullable String remark) {}

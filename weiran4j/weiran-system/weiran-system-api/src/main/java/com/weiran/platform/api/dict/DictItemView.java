package com.weiran.platform.api.dict;

import org.jspecify.annotations.Nullable;

/**
 * 字典项视图。
 *
 * @param id ID
 * @param dictId 字典 ID
 * @param label 显示文本
 * @param value 值
 * @param color 标签颜色
 * @param sort 排序
 * @param status 状态
 * @param remark 备注
 */
public record DictItemView(
        long id,
        long dictId,
        String label,
        String value,
        @Nullable String color,
        int sort,
        String status,
        @Nullable String remark) {}

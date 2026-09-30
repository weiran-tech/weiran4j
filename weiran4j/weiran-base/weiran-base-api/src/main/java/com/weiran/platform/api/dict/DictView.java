package com.weiran.platform.api.dict;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 字典视图。
 *
 * @param id ID
 * @param name 名称
 * @param code 编码
 * @param description 描述
 * @param status 状态
 * @param isBuiltin 是否内置
 * @param createdAt 创建时间
 * @param updatedAt 更新时间
 */
public record DictView(
        long id,
        String name,
        String code,
        @Nullable String description,
        String status,
        boolean isBuiltin,
        @Nullable LocalDateTime createdAt,
        @Nullable LocalDateTime updatedAt) {}

package com.weiran.system.api.role;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 角色视图。
 *
 * @param id ID
 * @param name 名称
 * @param code 编码
 * @param description 描述
 * @param sort 排序
 * @param status 状态
 * @param isBuiltin 是否内置
 * @param userCount 绑定用户数
 * @param createdAt 创建时间
 * @param updatedAt 更新时间
 */
public record RoleView(
        long id,
        String name,
        String code,
        @Nullable String description,
        int sort,
        String status,
        boolean isBuiltin,
        long userCount,
        @Nullable LocalDateTime createdAt,
        @Nullable LocalDateTime updatedAt) {}

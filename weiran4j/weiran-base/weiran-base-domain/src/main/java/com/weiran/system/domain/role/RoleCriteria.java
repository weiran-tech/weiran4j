package com.weiran.system.domain.role;

import com.weiran.common.status.EnableStatus;
import org.jspecify.annotations.Nullable;

/**
 * 角色分页查询条件。
 *
 * @param keyword 匹配名称 / 编码，空表示不过滤
 * @param status 状态，空表示不过滤
 */
public record RoleCriteria(
        @Nullable String keyword, @Nullable EnableStatus status) {}

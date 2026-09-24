package com.weiran.system.api.rbac;

import com.weiran.common.page.PageQuery;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * 角色列表查询条件。
 *
 * @param page 分页参数
 * @param accountType 按账号类型精确筛选，{@code null} 表示不筛选
 * @param enabled 按启用状态筛选，{@code null} 表示不筛选
 */
public record RoleQuery(
        PageQuery page,
        @Nullable String accountType,
        @Nullable Boolean enabled) {

    public RoleQuery {
        Objects.requireNonNull(page, "page");
    }
}

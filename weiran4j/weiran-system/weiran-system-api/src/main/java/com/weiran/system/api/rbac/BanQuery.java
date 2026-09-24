package com.weiran.system.api.rbac;

import com.weiran.common.page.PageQuery;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * 封禁记录列表查询条件。
 *
 * @param page 分页参数
 * @param type 按封禁类型筛选，{@code null} 表示不筛选
 * @param accountType 按账号类型筛选，{@code null} 表示不筛选
 */
public record BanQuery(
        PageQuery page, @Nullable String type, @Nullable String accountType) {

    public BanQuery {
        Objects.requireNonNull(page, "page");
    }
}

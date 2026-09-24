package com.weiran.system.api.rbac;

import com.weiran.common.page.PageQuery;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * 账号列表查询条件。
 *
 * @param page 分页参数
 * @param keyword 用户名/手机号/邮箱模糊匹配关键字，{@code null} 表示不筛选
 * @param accountType 按账号类型精确筛选，{@code null} 表示不筛选
 */
public record AccountQuery(
        PageQuery page, @Nullable String keyword, @Nullable String accountType) {

    public AccountQuery {
        Objects.requireNonNull(page, "page");
    }
}

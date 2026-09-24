package com.weiran.common.page;

import java.util.List;
import java.util.Objects;

/**
 * 分页出参契约。
 *
 * @param items 当前页数据
 * @param total 满足条件的总条数
 * @param page 当前页码
 * @param size 每页条数
 * @param <T> 数据元素类型
 */
public record PageResult<T>(List<T> items, long total, int page, int size) {

    public PageResult {
        items = List.copyOf(Objects.requireNonNull(items, "items"));
        if (total < 0) {
            throw new IllegalArgumentException("total must be >= 0");
        }
    }

    /** 构造空结果，保留请求的分页参数以便调用方回显。 */
    public static <T> PageResult<T> empty(final PageQuery query) {
        Objects.requireNonNull(query, "query");
        return new PageResult<>(List.of(), 0L, query.page(), query.size());
    }

    /** 按请求分页参数包装一页数据。 */
    public static <T> PageResult<T> of(final List<T> items, final long total, final PageQuery query) {
        Objects.requireNonNull(query, "query");
        return new PageResult<>(items, total, query.page(), query.size());
    }
}

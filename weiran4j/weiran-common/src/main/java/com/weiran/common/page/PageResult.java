package com.weiran.common.page;

import java.util.List;
import java.util.function.Function;

/**
 * 分页结果，序列化为 {@code {list, total, page, pageSize}}。
 *
 * @param list 当前页数据
 * @param total 总条数
 * @param page 页码
 * @param pageSize 每页条数
 * @param <T> 元素类型
 */
public record PageResult<T>(List<T> list, long total, int page, int pageSize) {

    /** 防御性复制，避免调用方持有的可变列表影响结果。 */
    public PageResult {
        list = List.copyOf(list);
    }

    /** 由分页请求与当前页数据构造。 */
    public static <T> PageResult<T> of(final List<T> list, final long total, final PageQuery query) {
        return new PageResult<>(list, total, query.page(), query.pageSize());
    }

    /** 空结果。 */
    public static <T> PageResult<T> empty(final PageQuery query) {
        return new PageResult<>(List.of(), 0L, query.page(), query.pageSize());
    }

    /** 转换元素类型，分页信息保持不变。 */
    public <R> PageResult<R> map(final Function<? super T, ? extends R> mapper) {
        final List<R> mapped = this.list.stream().<R>map(mapper).toList();
        return new PageResult<>(mapped, this.total, this.page, this.pageSize);
    }
}

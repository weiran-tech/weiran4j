package com.weiran.framework.persistence;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.util.function.Function;

/**
 * {@link PageQuery} / {@link PageResult} 与 MyBatis-Plus 分页对象的互转。
 *
 * <p>只给各模块 infrastructure 层用：MyBatis-Plus 的分页类型不允许越过仓储端口。
 */
public final class MybatisPages {

    private MybatisPages() {}

    /** 构造 MyBatis-Plus 分页请求。 */
    public static <T> Page<T> of(final PageQuery pageQuery) {
        return Page.of(pageQuery.page(), pageQuery.pageSize());
    }

    /** 把分页结果的记录转换成领域对象。 */
    public static <T, R> PageResult<R> toResult(
            final IPage<T> page, final PageQuery pageQuery, final Function<? super T, ? extends R> mapper) {
        return PageResult.of(page.getRecords().stream().<R>map(mapper).toList(), page.getTotal(), pageQuery);
    }
}

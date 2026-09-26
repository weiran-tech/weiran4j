package com.weiran.common.page;

/**
 * 分页请求。
 *
 * <p>构造时即规范化：{@code page} 从 1 开始，小于 1 按 1；{@code pageSize} 默认 20、上限 200，
 * 越界值被钳到边界而不是报错——分页参数错误不值得让一次列表查询失败。
 *
 * @param page 页码，从 1 开始
 * @param pageSize 每页条数，1–200
 */
public record PageQuery(int page, int pageSize) {

    /** 默认页码。 */
    public static final int DEFAULT_PAGE = 1;

    /** 默认每页条数。 */
    public static final int DEFAULT_PAGE_SIZE = 20;

    /** 每页条数上限。 */
    public static final int MAX_PAGE_SIZE = 200;

    /** 规范化页码与每页条数。 */
    public PageQuery {
        page = Math.max(page, PageQuery.DEFAULT_PAGE);
        if (pageSize < 1) {
            pageSize = PageQuery.DEFAULT_PAGE_SIZE;
        }
        pageSize = Math.min(pageSize, PageQuery.MAX_PAGE_SIZE);
    }

    /** 第一页、默认条数。 */
    public static PageQuery defaults() {
        return new PageQuery(PageQuery.DEFAULT_PAGE, PageQuery.DEFAULT_PAGE_SIZE);
    }

    /** 当前页第一条记录的偏移量。 */
    public long offset() {
        return (long) (this.page - 1) * this.pageSize;
    }
}

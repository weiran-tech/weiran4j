package com.weiran.common.page;

/**
 * 分页入参契约。
 *
 * @param page 页码，从 1 开始
 * @param size 每页条数
 */
public record PageQuery(int page, int size) {

    /** 页码下界。 */
    public static final int MIN_PAGE = 1;

    /** 每页条数上界，防止调用方一次拉全表。 */
    public static final int MAX_SIZE = 200;

    private static final int DEFAULT_SIZE = 20;

    public PageQuery {
        if (page < PageQuery.MIN_PAGE) {
            throw new IllegalArgumentException("page must be >= " + PageQuery.MIN_PAGE);
        }
        if (size < 1 || size > PageQuery.MAX_SIZE) {
            throw new IllegalArgumentException("size must be in [1, " + PageQuery.MAX_SIZE + "]");
        }
    }

    /** 返回默认分页（第一页，每页 {@value #DEFAULT_SIZE} 条）。 */
    public static PageQuery firstPage() {
        return new PageQuery(PageQuery.MIN_PAGE, PageQuery.DEFAULT_SIZE);
    }

    /** 返回该分页对应的偏移量，供 SQL LIMIT 使用。 */
    public long offset() {
        return (long) (this.page - 1) * this.size;
    }
}

package com.weiran.common.page;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PageQueryTest {

    @Test
    @DisplayName("页码小于 1 按 1 处理，条数越界被钳到边界")
    void normalizesOutOfRangeValues() {
        assertThat(new PageQuery(0, 0)).isEqualTo(new PageQuery(1, 20));
        assertThat(new PageQuery(-5, 1000).pageSize()).isEqualTo(PageQuery.MAX_PAGE_SIZE);
        assertThat(PageQuery.defaults()).isEqualTo(new PageQuery(1, 20));
    }

    @Test
    @DisplayName("偏移量按页码与条数计算")
    void computesOffset() {
        assertThat(new PageQuery(3, 20).offset()).isEqualTo(40L);
        assertThat(new PageQuery(1, 50).offset()).isZero();
    }

    @Test
    @DisplayName("分页结果转换元素类型时保留分页信息")
    void mapsPageResult() {
        final PageResult<Integer> source = PageResult.of(List.of(1, 2), 12L, new PageQuery(2, 2));

        final PageResult<String> mapped = source.map(value -> "#" + value);

        assertThat(mapped.list()).containsExactly("#1", "#2");
        assertThat(mapped.total()).isEqualTo(12L);
        assertThat(mapped.page()).isEqualTo(2);
        assertThat(mapped.pageSize()).isEqualTo(2);
        assertThat(PageResult.empty(PageQuery.defaults()).list()).isEmpty();
    }
}

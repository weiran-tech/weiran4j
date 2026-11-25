package com.wulicode.weiran.demo.batch;

import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;

/** 演示业务表；使用任务 ID + 项目序号幂等写入。 */
public class DemoBatchItemStore {

    private final JdbcTemplate jdbc;

    public DemoBatchItemStore(final JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(final long jobId, final long itemNo, final String name, final String value) {
        this.jdbc.update(
                "insert into demo_batch_item (job_id, item_no, item_name, item_value) values (?, ?, ?, ?) "
                        + "on duplicate key update item_name = values(item_name), item_value = values(item_value)",
                jobId,
                itemNo,
                name,
                value);
    }

    public PageResult<DemoBatchItem> list(final long jobId, final PageQuery page) {
        final Long total =
                this.jdbc.queryForObject("select count(*) from demo_batch_item where job_id = ?", Long.class, jobId);
        final List<DemoBatchItem> items = this.jdbc.query(
                "select id, item_no, item_name, item_value from demo_batch_item "
                        + "where job_id = ? order by item_no limit ? offset ?",
                (row, index) -> new DemoBatchItem(
                        row.getLong("id"),
                        row.getLong("item_no"),
                        row.getString("item_name"),
                        row.getString("item_value")),
                jobId,
                page.pageSize(),
                page.offset());
        return PageResult.of(items, total == null ? 0 : total, page);
    }

    public record DemoBatchItem(long id, long itemNo, String itemName, String itemValue) {}
}

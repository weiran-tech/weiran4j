package com.wulicode.weiran.system.infrastructure.persistence;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.system.domain.batch.BatchJob;
import com.wulicode.weiran.system.domain.batch.BatchJobRepository;
import com.wulicode.weiran.system.domain.batch.BatchTaskDetail;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;

/** MySQL 8 任务队列；明细永不因重领而删除，计数只从明细投影。 */
public class JdbcBatchJobRepository implements BatchJobRepository {

    private static final int MAX_ACTIVE_JOBS_PER_USER = 20;
    private static final RowMapper<BatchJob> JOB_MAPPER = (row, index) -> JdbcBatchJobRepository.map(row);
    private final JdbcTemplate jdbc;

    public JdbcBatchJobRepository(final JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public long create(
            final String kind,
            final String name,
            final String sourceKey,
            final String inputMode,
            final String fingerprint,
            final long userId) {
        this.jdbc.queryForObject("select id from sys_user where id = ? for update", Long.class, userId);
        final Integer active = this.jdbc.queryForObject(
                "select count(*) from sys_task where created_by = ? "
                        + "and status in ('queued', 'running', 'cancel_requested')",
                Integer.class,
                userId);
        if (active != null && active >= MAX_ACTIVE_JOBS_PER_USER) {
            throw BizException.conflict("同一账号最多同时保留 " + MAX_ACTIVE_JOBS_PER_USER + " 个待处理任务");
        }
        final KeyHolder keys = new GeneratedKeyHolder();
        this.jdbc.update(
                connection -> {
                    final var statement = connection.prepareStatement(
                            "insert into sys_task (kind, source_name, source_key, input_mode, input_fingerprint, "
                                    + "created_by, phase) values (?, ?, ?, ?, ?, ?, 'uploading')",
                            java.sql.Statement.RETURN_GENERATED_KEYS);
                    statement.setString(1, kind);
                    statement.setString(2, name);
                    statement.setString(3, sourceKey);
                    statement.setString(4, inputMode);
                    statement.setString(5, fingerprint);
                    statement.setLong(6, userId);
                    return statement;
                },
                keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }

    @Override
    public @Nullable BatchJob get(final long id, final long userId) {
        return this.jdbc
                .query("select * from sys_task where id = ? and created_by = ?", JOB_MAPPER, id, userId)
                .stream()
                .findFirst()
                .orElse(null);
    }

    @Override
    public List<BatchJob> recent(final long userId, final List<String> kinds) {
        if (kinds.isEmpty()) {
            return this.jdbc.query(
                    "select * from sys_task where created_by = ? order by id desc limit 30", JOB_MAPPER, userId);
        }
        final String placeholders = String.join(",", java.util.Collections.nCopies(kinds.size(), "?"));
        final List<Object> args = new ArrayList<>();
        args.add(userId);
        args.addAll(kinds);
        return this.jdbc.query(
                "select * from sys_task where created_by = ? and kind in (" + placeholders
                        + ") order by id desc limit 30",
                JOB_MAPPER,
                args.toArray());
    }

    @Override
    public PageResult<BatchTaskDetail> details(
            final long id, final @Nullable String stage, final @Nullable String status, final PageQuery page) {
        final StringBuilder filter = new StringBuilder("task_id = ?");
        final List<Object> args = new ArrayList<>();
        args.add(id);
        if (stage != null) {
            filter.append(" and stage = ?");
            args.add(stage);
        }
        if (status != null) {
            filter.append(" and status = ?");
            args.add(status);
        }
        final Long total = this.jdbc.queryForObject(
                "select count(*) from sys_task_detail where " + filter, Long.class, args.toArray());
        args.add(page.pageSize());
        args.add(page.offset());
        final List<BatchTaskDetail> items = this.jdbc.query(
                "select * from sys_task_detail where " + filter
                        + " order by case stage when 'validating' then 0 else 1 end, item_no, id limit ? offset ?",
                (row, index) -> JdbcBatchJobRepository.mapDetail(row),
                args.toArray());
        return PageResult.of(items, total == null ? 0 : total, page);
    }

    @Override
    @Transactional
    public @Nullable BatchWork claim(final String worker) {
        this.jdbc.update("update sys_task set status = 'cancelled', finished_at = now(), worker = null "
                + "where status = 'cancel_requested' and heartbeat_at < date_sub(now(), interval 2 minute)");
        final int claimed = this.jdbc.update(
                "update sys_task set status = 'running', worker = ?, heartbeat_at = now() "
                        + "where status = 'queued' or (status = 'running' and heartbeat_at < date_sub(now(), interval 2 minute)) "
                        + "order by id limit 1",
                worker);
        if (claimed == 0) {
            return null;
        }
        return this.jdbc
                .query(
                        "select id, kind, source_name, source_key, input_mode, input_fingerprint, phase, total "
                                + "from sys_task where worker = ? and status = 'running'",
                        (row, index) -> new BatchWork(
                                row.getLong("id"),
                                row.getString("kind"),
                                row.getString("source_name"),
                                row.getString("source_key"),
                                row.getString("input_mode"),
                                row.getString("input_fingerprint"),
                                row.getString("phase"),
                                row.getObject("total", Long.class)),
                        worker)
                .stream()
                .findFirst()
                .orElse(null);
    }

    @Override
    public void heartbeat(final long id, final String worker) {
        this.jdbc.update(
                "update sys_task set heartbeat_at = now() where id = ? and worker = ? and status in ('running', 'cancel_requested')",
                id,
                worker);
    }

    @Override
    public void beginValidation(final long id, final String worker) {
        JdbcBatchJobRepository.requireOne(this.jdbc.update(
                "update sys_task set phase = 'validating', heartbeat_at = now() "
                        + "where id = ? and worker = ? and status = 'running' and phase in ('uploading', 'waiting', 'validating')",
                id,
                worker));
    }

    @Override
    @Transactional
    public void validation(final long id, final String worker, final BatchTaskDetail item) {
        this.lockPhase(id, worker, "validating");
        this.jdbc.update(
                "insert ignore into sys_task_detail (task_id, stage, item_no, item_name, source_location, "
                        + "idempotency_key, status, message, display_data) values (?, 'validating', ?, ?, ?, ?, ?, ?, ?)",
                id,
                item.itemNo(),
                item.itemName(),
                item.sourceLocation(),
                item.idempotencyKey(),
                item.status(),
                item.message(),
                item.displayData());
        final BatchTaskDetail stored = this.jdbc.queryForObject(
                "select * from sys_task_detail where task_id = ? and stage = 'validating' and item_no = ?",
                (row, index) -> JdbcBatchJobRepository.mapDetail(row),
                id,
                item.itemNo());
        if (stored == null
                || !stored.status().equals(item.status())
                || !stored.itemName().equals(item.itemName())
                || !Objects.equals(stored.idempotencyKey(), item.idempotencyKey())
                || !Objects.equals(stored.sourceLocation(), item.sourceLocation())) {
            throw new IllegalStateException("预检项与已持久化结果不一致");
        }
    }

    @Override
    public void beginDecision(final long id, final String worker, final long total) {
        JdbcBatchJobRepository.requireOne(this.jdbc.update(
                "update sys_task set phase = 'deciding', total = ?, heartbeat_at = now() "
                        + "where id = ? and worker = ? and status = 'running' and phase = 'validating'",
                total,
                id,
                worker));
    }

    @Override
    @Transactional
    public void decide(final long id, final String worker, final long total) {
        this.lockPhase(id, worker, "deciding");
        final Long actual = this.jdbc.queryForObject(
                "select count(*) from sys_task_detail where task_id = ? and stage = 'validating'", Long.class, id);
        if (actual == null || actual != total) {
            throw new IllegalStateException("预检明细数量与识别项数不一致");
        }
        this.jdbc.update(
                "insert ignore into sys_task_detail (task_id, stage, item_no, item_name, source_location, "
                        + "idempotency_key, display_data, status) "
                        + "select task_id, 'processing', item_no, item_name, source_location, idempotency_key, "
                        + "display_data, 'pending' from sys_task_detail "
                        + "where task_id = ? and stage = 'validating' and status = 'succeeded'",
                id);
        final Long selected = this.jdbc.queryForObject(
                "select count(*) from sys_task_detail where task_id = ? and stage = 'processing'", Long.class, id);
        JdbcBatchJobRepository.requireOne(this.jdbc.update(
                "update sys_task set total = ?, selected_count = ?, decided_at = now(), phase = 'processing' "
                        + "where id = ? and worker = ? and status = 'running' and phase = 'deciding'",
                total,
                selected,
                id,
                worker));
        this.recount(id);
    }

    @Override
    public List<BatchTaskDetail> pending(final long id) {
        return this.jdbc.query(
                "select * from sys_task_detail where task_id = ? and stage = 'processing' "
                        + "and status = 'pending' order by item_no",
                (row, index) -> JdbcBatchJobRepository.mapDetail(row),
                id);
    }

    @Override
    public void lockItem(final long id, final String worker, final long itemNo) {
        this.lockPhase(id, worker, "processing");
        final Long count = this.jdbc.queryForObject(
                "select count(*) from sys_task_detail where task_id = ? and stage = 'processing' "
                        + "and item_no = ? and status = 'pending'",
                Long.class,
                id,
                itemNo);
        if (count == null || count != 1) {
            throw new IllegalStateException("批处理项已完成或未被决策选中");
        }
    }

    @Override
    public void succeeded(
            final long id,
            final String worker,
            final long itemNo,
            final @Nullable String resultType,
            final @Nullable String resultId) {
        this.lockPhase(id, worker, "processing");
        JdbcBatchJobRepository.requireOne(this.jdbc.update(
                "update sys_task_detail set status = 'succeeded', result_type = ?, result_id = ? "
                        + "where task_id = ? and stage = 'processing' and item_no = ? and status = 'pending'",
                resultType,
                resultId,
                id,
                itemNo));
        this.recount(id);
    }

    @Override
    @Transactional
    public void failedItem(final long id, final String worker, final long itemNo, final String message) {
        this.lockPhase(id, worker, "processing");
        JdbcBatchJobRepository.requireOne(this.jdbc.update(
                "update sys_task_detail set status = 'failed', message = ? "
                        + "where task_id = ? and stage = 'processing' and item_no = ? and status = 'pending'",
                message,
                id,
                itemNo));
        this.recount(id);
    }

    @Override
    public boolean stopped(final long id, final String worker) {
        return !Boolean.TRUE.equals(this.jdbc.queryForObject(
                "select status = 'running' and worker = ? from sys_task where id = ?", Boolean.class, worker, id));
    }

    @Override
    public void requestCancel(final long id, final long userId) {
        this.jdbc.update(
                "update sys_task set status = case when status = 'queued' then 'cancelled' else 'cancel_requested' end, "
                        + "finished_at = case when status = 'queued' then now() else finished_at end "
                        + "where id = ? and created_by = ? and status in ('queued', 'running')",
                id,
                userId);
    }

    @Override
    @Transactional
    public void finish(final long id, final String worker) {
        final String status = this.jdbc.queryForObject(
                "select status from sys_task where id = ? and worker = ? for update", String.class, id, worker);
        if (!"running".equals(status) && !"cancel_requested".equals(status)) {
            throw new IllegalStateException("批处理任务租约已失效");
        }
        this.recount(id);
        if ("cancel_requested".equals(status)) {
            JdbcBatchJobRepository.requireOne(this.jdbc.update(
                    "update sys_task set status = 'cancelled', finished_at = now(), worker = null "
                            + "where id = ? and worker = ? and status = 'cancel_requested'",
                    id,
                    worker));
            return;
        }
        final Long unfinished = this.jdbc.queryForObject(
                "select count(*) from sys_task_detail where task_id = ? and stage = 'processing' and status = 'pending'",
                Long.class,
                id);
        final Long total = this.jdbc.queryForObject("select total from sys_task where id = ?", Long.class, id);
        final Long validations = this.jdbc.queryForObject(
                "select count(*) from sys_task_detail where task_id = ? and stage = 'validating'", Long.class, id);
        if (total == null || !total.equals(validations) || unfinished == null || unfinished > 0) {
            throw new IllegalStateException("批处理明细未完成，不能总结");
        }
        final long[] counts = this.jdbc.queryForObject(
                "select succeeded, failed from sys_task where id = ?",
                (row, index) -> new long[] {row.getLong(1), row.getLong(2)},
                id);
        if (counts == null) {
            throw new IllegalStateException("批处理任务不存在");
        }
        final String terminal =
                counts[0] > 0 && counts[1] > 0 ? "partial_failed" : counts[1] > 0 ? "failed" : "succeeded";
        JdbcBatchJobRepository.requireOne(this.jdbc.update(
                "update sys_task set phase = 'summarizing', status = ?, finished_at = now(), worker = null "
                        + "where id = ? and worker = ? and status = 'running'",
                terminal,
                id,
                worker));
    }

    @Override
    @Transactional
    public void fail(final long id, final String worker, final String message) {
        final List<Long> owned = this.jdbc.query(
                "select id from sys_task where id = ? and worker = ? for update",
                (row, index) -> row.getLong(1),
                id,
                worker);
        if (owned.isEmpty()) {
            return;
        }
        this.recount(id);
        JdbcBatchJobRepository.requireOne(this.jdbc.update(
                "update sys_task set status = case when status = 'cancel_requested' then 'cancelled' else 'failed' end, "
                        + "finished_at = now(), worker = null, error_message = ? where id = ? and worker = ?",
                message,
                id,
                worker));
    }

    @Override
    public List<BatchCleanup> expiredFiles() {
        return this.jdbc.query(
                "select id, source_key from sys_task where finished_at < date_sub(now(), interval 7 day) "
                        + "and source_key is not null and input_mode = 'managed_file' order by id limit 100",
                (row, index) -> new BatchCleanup(row.getLong("id"), row.getString("source_key")));
    }

    @Override
    public void clearFiles(final long id, final @Nullable String sourceKey) {
        this.jdbc.update("update sys_task set source_key = null where id = ? and source_key <=> ?", id, sourceKey);
    }

    private void lockPhase(final long id, final String worker, final String phase) {
        final String actual = this.jdbc.queryForObject(
                "select phase from sys_task where id = ? and worker = ? and status = 'running' for update",
                String.class,
                id,
                worker);
        if (!phase.equals(actual)) {
            throw new IllegalStateException("批处理任务阶段或租约已变化");
        }
    }

    private void recount(final long id) {
        this.jdbc.update(
                "update sys_task set succeeded = (select count(*) from sys_task_detail "
                        + "where task_id = ? and stage = 'processing' and status = 'succeeded'), "
                        + "failed = (select count(*) from sys_task_detail where task_id = ? "
                        + "and ((stage = 'validating' and status = 'failed') "
                        + "or (stage = 'processing' and status = 'failed'))), "
                        + "processed = (select count(*) from sys_task_detail where task_id = ? "
                        + "and ((stage = 'validating' and status = 'failed') "
                        + "or (stage = 'processing' and status in ('succeeded', 'failed')))) where id = ?",
                id,
                id,
                id,
                id);
    }

    private static void requireOne(final int affected) {
        if (affected != 1) {
            throw new IllegalStateException("批处理状态转换未生效");
        }
    }

    private static BatchJob map(final ResultSet row) throws SQLException {
        return new BatchJob(
                row.getLong("id"),
                row.getString("kind"),
                row.getString("source_name"),
                row.getString("status"),
                row.getString("phase"),
                row.getObject("total", Long.class),
                row.getObject("selected_count", Long.class),
                row.getLong("processed"),
                row.getLong("succeeded"),
                row.getLong("failed"),
                row.getString("error_message"),
                row.getObject("decided_at", java.time.LocalDateTime.class),
                row.getObject("created_at", java.time.LocalDateTime.class),
                row.getObject("finished_at", java.time.LocalDateTime.class));
    }

    private static BatchTaskDetail mapDetail(final ResultSet row) throws SQLException {
        return new BatchTaskDetail(
                row.getLong("id"),
                row.getLong("item_no"),
                row.getString("item_name"),
                row.getString("stage"),
                row.getString("status"),
                row.getString("message"),
                row.getString("source_location"),
                row.getString("idempotency_key"),
                row.getString("display_data"),
                row.getString("result_type"),
                row.getString("result_id"),
                row.getObject("created_at", java.time.LocalDateTime.class));
    }
}

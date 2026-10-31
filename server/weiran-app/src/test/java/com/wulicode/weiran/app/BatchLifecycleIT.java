package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.system.api.batch.BatchJobService;
import com.wulicode.weiran.system.domain.batch.BatchJobRepository;
import com.wulicode.weiran.system.domain.batch.BatchTaskDetail;
import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** 真 MySQL 验证阶段持久化、重领、条件状态转换与明细投影。 */
class BatchLifecycleIT extends IntegrationTestSupport {

    private static final String FINGERPRINT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    @Autowired
    private BatchJobRepository jobs;

    @Autowired
    private BatchJobService service;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    @Transactional
    @DisplayName("同账号允许 20 个待处理任务，第 21 个被拒绝，取消后释放名额")
    void activeTaskLimitIsTwenty() {
        final int existing = Objects.requireNonNull(this.jdbc.queryForObject(
                "select count(*) from sys_task where created_by = 1 and status in ('queued', 'running', 'cancel_requested')",
                Integer.class));
        assertThat(existing).isLessThan(20);
        long first = 0;
        for (int index = existing; index < 20; index++) {
            final long id = this.jobs.create(
                    "test_limit", "input.xlsx", "batch/202610/test.xlsx", "managed_file", FINGERPRINT, 1);
            if (first == 0) {
                first = id;
            }
        }
        this.jobs.requestCancel(first, 1);
        this.jobs.create("test_limit", "replacement.xlsx", "batch/202610/test.xlsx", "managed_file", FINGERPRINT, 1);
        assertThatThrownBy(() -> this.jobs.create(
                        "test_limit", "overflow.xlsx", "batch/202610/test.xlsx", "managed_file", FINGERPRINT, 1))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("最多同时保留 20 个待处理任务");
    }

    @Test
    @DisplayName("真实 worker 对预检部分失败继续入库，全部通过任务成功，计数与明细一致")
    void workerImportsValidItemsAfterPartialPrecheck() {
        final String token = this.adminToken();
        final byte[] bytes = this.sample("excelErrorTemplate", token);
        final long id = this.service
                .create("demo_excel", "demo.xlsx", new ByteArrayInputStream(bytes), bytes.length, 1)
                .id();
        await().atMost(Duration.ofSeconds(20))
                .untilAsserted(() -> assertThat(
                                Objects.requireNonNull(this.jobs.get(id, 1)).status())
                        .isEqualTo("partial_failed"));
        final var task = Objects.requireNonNull(this.jobs.get(id, 1));
        assertThat(task.total()).isEqualTo(3L);
        assertThat(task.processed()).isEqualTo(3L);
        assertThat(task.succeeded()).isEqualTo(1L);
        assertThat(task.failed()).isEqualTo(2L);
        assertThat(this.jdbc.queryForObject("select count(*) from demo_batch_item where job_id = ?", Long.class, id))
                .isEqualTo(1L);
        assertThat(this.jobs
                        .details(id, "validating", null, new PageQuery(1, 20))
                        .total())
                .isEqualTo(3L);
        assertThat(this.jobs
                        .details(id, "processing", null, new PageQuery(1, 20))
                        .total())
                .isEqualTo(1L);

        final byte[] valid = this.sample("excelTemplate", token);
        final long validId = this.service
                .create("demo_excel", "valid.xlsx", new ByteArrayInputStream(valid), valid.length, 1)
                .id();
        await().atMost(Duration.ofSeconds(20))
                .untilAsserted(() -> assertThat(Objects.requireNonNull(this.jobs.get(validId, 1))
                                .status())
                        .isEqualTo("succeeded"));
        final var validTask = Objects.requireNonNull(this.jobs.get(validId, 1));
        assertThat(validTask.total()).isEqualTo(1L);
        assertThat(validTask.processed()).isEqualTo(1L);
        assertThat(validTask.failed()).isZero();

        final byte[] corrupt = {1, 2, 3, 4};
        final long corruptId = this.service
                .create("demo_excel", "corrupt.xlsx", new ByteArrayInputStream(corrupt), corrupt.length, 1)
                .id();
        await().atMost(Duration.ofSeconds(20))
                .untilAsserted(() -> assertThat(Objects.requireNonNull(this.jobs.get(corruptId, 1))
                                .status())
                        .isEqualTo("failed"));
        assertThat(Objects.requireNonNull(this.jobs.get(corruptId, 1)).total()).isNull();
    }

    @Test
    @Transactional
    @DisplayName("历史明细缺少新字段时仍可分页读取")
    void historicDetailsRemainReadable() {
        final long id = this.jobs.create(
                "test_legacy", "legacy.xlsx", "batch/202610/legacy.xlsx", "managed_file", FINGERPRINT, 1);
        this.jdbc.update(
                "insert into sys_task_detail (task_id, item_no, item_name, status, message) values (?, 7, 'legacy', 'failed', '旧错误')",
                id);
        final var page = this.jobs.details(id, "processing", "failed", new PageQuery(1, 20));
        assertThat(page.total()).isEqualTo(1L);
        assertThat(page.list().getFirst().sourceLocation()).isNull();
        assertThat(page.list().getFirst().message()).isEqualTo("旧错误");
    }

    @Test
    @Transactional
    @DisplayName("预检失败项只排除自身；入库失败和成功各计一次，重复回调不会增加计数")
    void mixedResultsAndDuplicateCallback() {
        final long id = this.newTask("mixed");
        this.jobs.beginValidation(id, "worker-a");
        this.jobs.validation(id, "worker-a", BatchLifecycleIT.item(1, true));
        this.jobs.validation(id, "worker-a", BatchLifecycleIT.item(2, false));
        this.jobs.validation(id, "worker-a", BatchLifecycleIT.item(3, true));
        this.jobs.beginDecision(id, "worker-a", 3);
        this.jobs.decide(id, "worker-a", 3);
        assertThat(this.jobs.pending(id)).extracting(BatchTaskDetail::itemNo).containsExactly(1L, 3L);
        this.jobs.lockItem(id, "worker-a", 1);
        this.jobs.succeeded(id, "worker-a", 1, "demo", "100");
        assertThatThrownBy(() -> this.jobs.succeeded(id, "worker-a", 1, "demo", "100"))
                .isInstanceOf(IllegalStateException.class);
        this.jobs.failedItem(id, "worker-a", 3, "写入失败");
        this.jobs.finish(id, "worker-a");
        final var task = Objects.requireNonNull(this.jobs.get(id, 1));
        assertThat(task).isNotNull();
        assertThat(task.status()).isEqualTo("partial_failed");
        assertThat(task.total()).isEqualTo(3L);
        assertThat(task.processed()).isEqualTo(3L);
        assertThat(task.succeeded()).isEqualTo(1L);
        assertThat(task.failed()).isEqualTo(2L);
        assertThat(this.jobs.details(id, null, null, new PageQuery(1, 20)).total())
                .isEqualTo(5L);
    }

    @Test
    @Transactional
    @DisplayName("决策后和入库中超时重领保留明细，仅执行未完成项")
    void reclaimKeepsDetailsAndDecision() {
        final long id = this.newTask("reclaim");
        assertThat(this.jobs.claim("duplicate-worker")).isNull();
        this.jobs.beginValidation(id, "worker-a");
        this.jobs.validation(id, "worker-a", BatchLifecycleIT.item(1, true));
        this.jobs.validation(id, "worker-a", BatchLifecycleIT.item(2, true));
        this.jobs.beginDecision(id, "worker-a", 2);
        this.expire(id);
        final var deciding = Objects.requireNonNull(this.jobs.claim("worker-b"));
        assertThat(deciding).isNotNull();
        assertThat(deciding.id()).isEqualTo(id);
        assertThat(deciding.phase()).isEqualTo("deciding");
        assertThat(deciding.total()).isEqualTo(2L);
        this.jobs.decide(id, "worker-b", Objects.requireNonNull(deciding.total()));
        this.jobs.succeeded(id, "worker-b", 1, null, null);
        this.expire(id);
        final var processing = Objects.requireNonNull(this.jobs.claim("worker-c"));
        assertThat(processing).isNotNull();
        assertThat(processing.phase()).isEqualTo("processing");
        assertThat(this.jobs.pending(id)).extracting(BatchTaskDetail::itemNo).containsExactly(2L);
        this.jobs.succeeded(id, "worker-c", 2, null, null);
        this.expire(id);
        final var summarizing = Objects.requireNonNull(this.jobs.claim("worker-d"));
        assertThat(summarizing.phase()).isEqualTo("processing");
        assertThat(this.jobs.pending(id)).isEmpty();
        this.jobs.finish(id, "worker-d");
        final var task = Objects.requireNonNull(this.jobs.get(id, 1));
        assertThat(task).isNotNull();
        assertThat(task.status()).isEqualTo("succeeded");
        assertThat(task.processed()).isEqualTo(2L);
        assertThat(this.jobs.details(id, null, null, new PageQuery(1, 20)).total())
                .isEqualTo(4L);
    }

    @Test
    @Transactional
    @DisplayName("预检中断后相同项不重复，多源行作为一个稳定处理项")
    void validationResumeAndGroupItem() {
        final long id = this.newTask("group");
        this.jobs.beginValidation(id, "worker-a");
        final BatchTaskDetail group = new BatchTaskDetail(
                0,
                7,
                "团体作品 A",
                "validating",
                "succeeded",
                null,
                "表 1 第 7-9 行",
                "group-a",
                null,
                null,
                null,
                LocalDateTime.now(ZoneOffset.UTC));
        this.jobs.validation(id, "worker-a", group);
        this.expire(id);
        final var resumed = Objects.requireNonNull(this.jobs.claim("worker-b"));
        assertThat(resumed.phase()).isEqualTo("validating");
        this.jobs.beginValidation(id, "worker-b");
        this.jobs.validation(id, "worker-b", group);
        this.jobs.beginDecision(id, "worker-b", 1);
        this.jobs.decide(id, "worker-b", 1);
        assertThat(this.jobs.pending(id)).extracting(BatchTaskDetail::itemNo).containsExactly(7L);
        assertThat(this.jobs.pending(id).getFirst().sourceLocation()).isEqualTo("表 1 第 7-9 行");
        assertThat(this.jobs.pending(id).getFirst().idempotencyKey()).isEqualTo("group-a");
        this.jobs.succeeded(id, "worker-b", 7, "product", "201");
        this.jobs.finish(id, "worker-b");
        assertThat(this.jobs
                        .details(id, "validating", null, new PageQuery(1, 20))
                        .total())
                .isEqualTo(1L);
        assertThat(this.jobs
                        .details(id, "processing", null, new PageQuery(1, 20))
                        .total())
                .isEqualTo(1L);
    }

    @Test
    @DisplayName("业务写入前后异常均回滚目标行与成功明细，恢复后只写入一次")
    void businessWriteAndSuccessShareTransaction() {
        final TransactionTemplate tx = new TransactionTemplate(this.transactionManager);
        final long id = Objects.requireNonNull(tx.execute(status -> {
            final long taskId =
                    this.jobs.create("test_tx", "input.xlsx", "batch/202610/test.xlsx", "managed_file", FINGERPRINT, 1);
            assertThat(Objects.requireNonNull(this.jobs.claim("worker-tx")).id())
                    .isEqualTo(taskId);
            this.jobs.beginValidation(taskId, "worker-tx");
            this.jobs.validation(taskId, "worker-tx", BatchLifecycleIT.item(1, true));
            this.jobs.beginDecision(taskId, "worker-tx", 1);
            this.jobs.decide(taskId, "worker-tx", 1);
            return taskId;
        }));
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
                    this.jobs.lockItem(id, "worker-tx", 1);
                    this.jdbc.update(
                            "insert into demo_batch_item (job_id, item_no, item_name, item_value) values (?, 1, 'item', 'value')",
                            id);
                    throw new IllegalStateException("模拟业务写入后退出");
                }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(this.jdbc.queryForObject("select count(*) from demo_batch_item where job_id = ?", Long.class, id))
                .isZero();
        assertThat(this.jobs.pending(id)).hasSize(1);

        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
                    this.jobs.lockItem(id, "worker-tx", 1);
                    this.jdbc.update(
                            "insert into demo_batch_item (job_id, item_no, item_name, item_value) values (?, 1, 'item', 'value')",
                            id);
                    this.jobs.succeeded(id, "worker-tx", 1, "demo", "1");
                    throw new IllegalStateException("模拟成功明细后提交前退出");
                }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(this.jdbc.queryForObject("select count(*) from demo_batch_item where job_id = ?", Long.class, id))
                .isZero();
        assertThat(this.jobs.pending(id)).hasSize(1);

        tx.executeWithoutResult(status -> {
            this.jobs.lockItem(id, "worker-tx", 1);
            this.jdbc.update(
                    "insert into demo_batch_item (job_id, item_no, item_name, item_value) values (?, 1, 'item', 'value')",
                    id);
            this.jobs.succeeded(id, "worker-tx", 1, "demo", "1");
        });
        this.jobs.finish(id, "worker-tx");
        assertThat(this.jdbc.queryForObject("select count(*) from demo_batch_item where job_id = ?", Long.class, id))
                .isEqualTo(1L);
        assertThat(Objects.requireNonNull(this.jobs.get(id, 1)).processed()).isEqualTo(1L);
    }

    @Test
    @Transactional
    @DisplayName("全部预检失败、未完成项、任务级错误和取消分别得到正确终态")
    void terminalGuards() {
        final long failedId = this.newTask("all_failed");
        this.jobs.beginValidation(failedId, "worker-a");
        this.jobs.validation(failedId, "worker-a", BatchLifecycleIT.item(1, false));
        this.jobs.beginDecision(failedId, "worker-a", 1);
        this.jobs.decide(failedId, "worker-a", 1);
        this.jobs.finish(failedId, "worker-a");
        assertThat(Objects.requireNonNull(this.jobs.get(failedId, 1)).status()).isEqualTo("failed");
        assertThat(Objects.requireNonNull(this.jobs.get(failedId, 1)).processed())
                .isEqualTo(1L);

        final long pendingId = this.newTask("pending");
        this.jobs.beginValidation(pendingId, "worker-a");
        this.jobs.validation(pendingId, "worker-a", BatchLifecycleIT.item(1, true));
        this.jobs.beginDecision(pendingId, "worker-a", 1);
        this.jobs.decide(pendingId, "worker-a", 1);
        assertThatThrownBy(() -> this.jobs.finish(pendingId, "worker-a")).isInstanceOf(IllegalStateException.class);
        this.jobs.fail(pendingId, "worker-a", "测试结束");

        final long brokenId = this.newTask("broken");
        this.jobs.beginValidation(brokenId, "worker-a");
        this.jobs.fail(brokenId, "worker-a", "模板无法识别");
        assertThat(Objects.requireNonNull(this.jobs.get(brokenId, 1)).total()).isNull();
        assertThat(Objects.requireNonNull(this.jobs.get(brokenId, 1)).status()).isEqualTo("failed");

        final long cancelId = this.newTask("cancel");
        this.jobs.requestCancel(cancelId, 1);
        this.jobs.finish(cancelId, "worker-a");
        assertThat(Objects.requireNonNull(this.jobs.get(cancelId, 1)).status()).isEqualTo("cancelled");
    }

    private long newTask(final String suffix) {
        final long id = this.jobs.create(
                "test_" + suffix, "input.xlsx", "batch/202610/test.xlsx", "managed_file", FINGERPRINT, 1);
        final var claimed = Objects.requireNonNull(this.jobs.claim("worker-a"));
        assertThat(claimed).isNotNull();
        assertThat(claimed.id()).isEqualTo(id);
        return id;
    }

    private void expire(final long id) {
        this.jdbc.update("update sys_task set heartbeat_at = date_sub(now(), interval 3 minute) where id = ?", id);
    }

    private byte[] sample(final String endpoint, final String token) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return Objects.requireNonNull(this.rest
                .exchange(
                        "/api-backend/demo/batchItem/" + endpoint,
                        HttpMethod.GET,
                        new HttpEntity<>(headers),
                        byte[].class)
                .getBody());
    }

    private static BatchTaskDetail item(final long number, final boolean passed) {
        return new BatchTaskDetail(
                0,
                number,
                "item-" + number,
                "validating",
                passed ? "succeeded" : "failed",
                passed ? null : "校验失败",
                "row-" + number,
                "key-" + number,
                null,
                null,
                null,
                LocalDateTime.now(ZoneOffset.UTC));
    }
}

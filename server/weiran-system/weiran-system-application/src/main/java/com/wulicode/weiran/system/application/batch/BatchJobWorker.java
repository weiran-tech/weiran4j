package com.wulicode.weiran.system.application.batch;

import com.wulicode.weiran.system.api.batch.BatchFileException;
import com.wulicode.weiran.system.api.batch.BatchInputMode;
import com.wulicode.weiran.system.api.batch.BatchItemResult;
import com.wulicode.weiran.system.api.batch.BatchProcessor;
import com.wulicode.weiran.system.api.batch.BatchSource;
import com.wulicode.weiran.system.api.batch.BatchValidationItem;
import com.wulicode.weiran.system.domain.batch.BatchFileStorage;
import com.wulicode.weiran.system.domain.batch.BatchJobRepository;
import com.wulicode.weiran.system.domain.batch.BatchJobRepository.BatchWork;
import com.wulicode.weiran.system.domain.batch.BatchTaskDetail;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** 预检、决策、入库、总结均可在过期重领后从持久化阶段继续。 */
public class BatchJobWorker implements AutoCloseable, InitializingBean {

    private static final Logger LOGGER = LoggerFactory.getLogger(BatchJobWorker.class);
    private final BatchJobRepository jobs;
    private final BatchFileStorage files;
    private final List<BatchProcessor> processors;
    private final TransactionTemplate transactions;
    private @Nullable ScheduledFuture<?> cleanupTask;
    private final ScheduledExecutorService renewer = Executors.newScheduledThreadPool(2, task -> {
        final Thread thread = new Thread(task, "weiran-batch-heartbeat");
        thread.setDaemon(true);
        return thread;
    });

    public BatchJobWorker(
            final BatchJobRepository jobs,
            final BatchFileStorage files,
            final ObjectProvider<BatchProcessor> processors,
            final PlatformTransactionManager transactionManager) {
        this.jobs = jobs;
        this.files = files;
        this.processors = processors.orderedStream().toList();
        this.transactions = new TransactionTemplate(transactionManager);
    }

    @Override
    public void afterPropertiesSet() {
        this.cleanupTask = this.renewer.scheduleWithFixedDelay(
                () -> {
                    try {
                        this.cleanupExpiredFiles();
                    } catch (final RuntimeException ex) {
                        LOGGER.warn("批处理文件保留期清理暂不可用");
                    }
                },
                1,
                1,
                TimeUnit.HOURS);
    }

    @Scheduled(fixedDelay = 1500)
    public void consume() {
        final String worker = UUID.randomUUID().toString();
        final BatchWork work = this.jobs.claim(worker);
        if (work == null) {
            return;
        }
        final BatchProcessor processor = this.processors.stream()
                .filter(candidate -> candidate.kind().equals(work.kind()))
                .findFirst()
                .orElse(null);
        if (processor == null) {
            this.jobs.fail(work.id(), worker, "处理器未安装");
            return;
        }
        final ScheduledFuture<?> lease = this.renewer.scheduleAtFixedRate(
                () -> {
                    try {
                        this.jobs.heartbeat(work.id(), worker);
                    } catch (final RuntimeException ex) {
                        LOGGER.warn("批处理续租失败 id={}", work.id());
                    }
                },
                30,
                30,
                TimeUnit.SECONDS);
        try {
            if ((processor.inputMode() == BatchInputMode.REFERENCE) != "reference".equals(work.inputMode())) {
                throw new BatchFileException("处理器输入方式已变化");
            }
            final BatchSource source;
            if ("reference".equals(work.inputMode())) {
                final BatchSource delegate = processor.referenceSource(work.sourceKey());
                source = new BatchSource() {
                    @Override
                    public java.io.InputStream open() throws java.io.IOException {
                        return delegate.open();
                    }

                    @Override
                    public String reference() {
                        return work.sourceKey();
                    }
                };
            } else {
                source = () -> this.files.open(work.sourceKey());
            }
            this.verifyInput(work, processor, source);
            if ("uploading".equals(work.phase())
                    || "waiting".equals(work.phase())
                    || "validating".equals(work.phase())) {
                this.jobs.beginValidation(work.id(), worker);
                final AtomicLong total = new AtomicLong();
                processor.precheck(source, item -> {
                    if (this.jobs.stopped(work.id(), worker)) {
                        throw new BatchStoppedException();
                    }
                    this.jobs.validation(work.id(), worker, BatchJobWorker.detail(item));
                    total.incrementAndGet();
                });
                if (this.jobs.stopped(work.id(), worker)) {
                    this.jobs.fail(work.id(), worker, "任务已取消");
                    return;
                }
                this.verifyInput(work, processor, source);
                this.jobs.beginDecision(work.id(), worker, total.get());
                this.jobs.decide(work.id(), worker, total.get());
            } else if ("deciding".equals(work.phase())) {
                if (work.total() == null) {
                    throw new IllegalStateException("决策阶段缺少预检总数");
                }
                this.jobs.decide(work.id(), worker, work.total());
            }
            final List<BatchTaskDetail> pending = this.jobs.pending(work.id());
            final int batchSize = processor.transactionBatchSize();
            if (batchSize < 1 || batchSize > 100) {
                throw new IllegalArgumentException("事务批量大小必须在 1 到 100 之间");
            }
            for (int offset = 0; offset < pending.size(); offset += batchSize) {
                if (this.jobs.stopped(work.id(), worker)) {
                    this.jobs.fail(work.id(), worker, "任务已取消");
                    return;
                }
                this.verifyInput(work, processor, source);
                final List<BatchTaskDetail> batch =
                        pending.subList(offset, Math.min(offset + batchSize, pending.size()));
                try {
                    this.transactions.executeWithoutResult(status -> {
                        for (final BatchTaskDetail item : batch) {
                            this.processItem(work, worker, processor, source, item);
                        }
                    });
                } catch (final ItemWriteException ex) {
                    if (batch.size() == 1) {
                        this.recordFailure(work, worker, batch.getFirst(), ex);
                        continue;
                    }
                    for (final BatchTaskDetail item : batch) {
                        if (this.jobs.stopped(work.id(), worker)) {
                            this.jobs.fail(work.id(), worker, "任务已取消");
                            return;
                        }
                        this.verifyInput(work, processor, source);
                        try {
                            this.transactions.executeWithoutResult(
                                    status -> this.processItem(work, worker, processor, source, item));
                        } catch (final ItemWriteException itemError) {
                            this.recordFailure(work, worker, item, itemError);
                        }
                    }
                }
            }
            this.verifyInput(work, processor, source);
            this.jobs.finish(work.id(), worker);
        } catch (final BatchStoppedException ex) {
            this.jobs.fail(work.id(), worker, "任务已取消");
        } catch (final Exception ex) {
            LOGGER.error("批处理任务失败 id={} type={}", work.id(), ex.getClass().getSimpleName());
            final String message = ex instanceof BatchFileException fileError
                    ? BatchJobWorker.limit(fileError.getMessage(), 500)
                    : "输入失效或处理失败，请检查任务文件";
            this.jobs.fail(work.id(), worker, message);
        } finally {
            lease.cancel(false);
        }
    }

    private void processItem(
            final BatchWork work,
            final String worker,
            final BatchProcessor processor,
            final BatchSource source,
            final BatchTaskDetail item) {
        this.jobs.lockItem(work.id(), worker, item.itemNo());
        try {
            final BatchItemResult result = processor.processItem(
                    source, work.id(), item.itemNo(), Objects.requireNonNull(item.idempotencyKey()));
            this.jobs.succeeded(
                    work.id(),
                    worker,
                    item.itemNo(),
                    BatchJobWorker.limitNullable(result.resultType(), 64),
                    BatchJobWorker.limitNullable(result.resultId(), 191));
        } catch (final Exception ex) {
            throw new ItemWriteException(ex);
        }
    }

    private void recordFailure(
            final BatchWork work, final String worker, final BatchTaskDetail item, final ItemWriteException ex) {
        final Throwable cause = ex.getCause();
        final String message = cause instanceof BatchFileException fileError
                ? BatchJobWorker.limit(fileError.getMessage(), 500)
                : "该项写入失败";
        if (!this.jobs.stopped(work.id(), worker)) {
            this.jobs.failedItem(work.id(), worker, item.itemNo(), message);
        }
    }

    public void cleanupExpiredFiles() {
        for (final BatchJobRepository.BatchCleanup job : this.jobs.expiredFiles()) {
            try {
                if (job.sourceKey() != null) {
                    this.files.delete(job.sourceKey());
                }
                this.jobs.clearFiles(job.id(), job.sourceKey());
            } catch (final RuntimeException ex) {
                LOGGER.warn("批处理文件保留期清理失败 id={}", job.id());
            }
        }
    }

    @Override
    public void close() {
        if (this.cleanupTask != null) {
            this.cleanupTask.cancel(false);
        }
        this.renewer.shutdownNow();
    }

    private void verifyInput(final BatchWork work, final BatchProcessor processor, final BatchSource source)
            throws Exception {
        final String fingerprint = processor.inputMode() == BatchInputMode.REFERENCE
                ? processor.referenceFingerprint(work.sourceKey())
                : BatchJobApplicationService.sha256(source);
        if (!fingerprint.equalsIgnoreCase(work.fingerprint())) {
            throw new BatchFileException("输入文件或清单已变化");
        }
    }

    private static BatchTaskDetail detail(final BatchValidationItem item) {
        if (item.itemNo() <= 0
                || item.itemName().isBlank()
                || item.sourceLocation().isBlank()
                || item.idempotencyKey().isBlank()
                || item.itemName().length() > 255
                || item.sourceLocation().length() > 500
                || item.idempotencyKey().length() > 191
                || (!item.passed() && (item.message() == null || item.message().isBlank()))
                || (item.displayData() != null && item.displayData().length() > 2048)) {
            throw new IllegalArgumentException("预检项编号或展示字段无效");
        }
        return new BatchTaskDetail(
                0,
                item.itemNo(),
                item.itemName(),
                "validating",
                item.passed() ? "succeeded" : "failed",
                BatchJobWorker.limitNullable(item.message(), 500),
                item.sourceLocation(),
                item.idempotencyKey(),
                item.displayData(),
                null,
                null,
                LocalDateTime.now(ZoneOffset.UTC));
    }

    private static String limit(final String value, final int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static @Nullable String limitNullable(final @Nullable String value, final int max) {
        return value == null ? null : BatchJobWorker.limit(value, max);
    }

    private static final class BatchStoppedException extends RuntimeException {
        private static final long serialVersionUID = 1L;
    }

    private static final class ItemWriteException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        private ItemWriteException(final Exception cause) {
            super(cause);
        }
    }
}

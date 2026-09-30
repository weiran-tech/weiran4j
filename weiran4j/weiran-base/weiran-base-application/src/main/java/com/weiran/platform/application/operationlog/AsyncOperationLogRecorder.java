package com.weiran.platform.application.operationlog;

import com.weiran.common.text.Texts;
import com.weiran.framework.log.OperationLogEvent;
import com.weiran.framework.log.OperationLogRecorder;
import com.weiran.platform.domain.operationlog.OperationLogEntry;
import com.weiran.platform.domain.operationlog.OperationLogRepository;
import java.util.concurrent.RejectedExecutionException;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * {@link OperationLogRecorder} 实现：提交到独立线程池异步落库。
 *
 * <p>不用 {@code @Async}：那需要全局 {@code @EnableAsync}，会影响应用里其它 Bean 的行为。
 * 线程池由本类持有而不是注册成 Bean：容器里一旦出现 {@code Executor} 类型的 Bean，
 * Spring Boot 就不再创建默认的 {@code applicationTaskExecutor}，会连带改变应用其它异步组件的行为。
 * 线程池满或写库失败都只记 warn——审计日志丢一条，不能让业务请求失败。
 */
@Slf4j
public class AsyncOperationLogRecorder implements OperationLogRecorder, DisposableBean {

    private static final int MAX_MODULE_LENGTH = 64;

    private static final int MAX_DESCRIPTION_LENGTH = 128;

    private static final int MAX_METHOD_LENGTH = 16;

    private static final int MAX_PATH_LENGTH = 256;

    private final OperationLogRepository repository;

    private final ThreadPoolTaskExecutor executor;

    /** 构造记录器；线程池须已 {@code initialize()}，由本类负责关闭。 */
    public AsyncOperationLogRecorder(final OperationLogRepository repository, final ThreadPoolTaskExecutor executor) {
        this.repository = repository;
        this.executor = executor;
    }

    /** 容器关闭时等待已提交的日志写完（等待时长由线程池配置决定）。 */
    @Override
    public void destroy() {
        this.executor.shutdown();
    }

    @Override
    public void record(final OperationLogEvent event) {
        final OperationLogEntry entry = AsyncOperationLogRecorder.toEntry(event);
        try {
            this.executor.execute(() -> this.append(entry));
        } catch (final RejectedExecutionException ex) {
            AsyncOperationLogRecorder.log.warn("操作日志线程池已满，丢弃一条日志: {} {}", entry.method(), entry.path());
        }
    }

    private void append(final OperationLogEntry entry) {
        try {
            this.repository.append(entry);
        } catch (final RuntimeException ex) {
            AsyncOperationLogRecorder.log.warn("操作日志写入失败: {} {} - {}", entry.method(), entry.path(), ex.toString());
        }
    }

    private static OperationLogEntry toEntry(final OperationLogEvent event) {
        return new OperationLogEntry(
                null,
                event.userId(),
                AsyncOperationLogRecorder.limit(event.username(), 64),
                Texts.truncate(event.module(), AsyncOperationLogRecorder.MAX_MODULE_LENGTH),
                Texts.truncate(event.description(), AsyncOperationLogRecorder.MAX_DESCRIPTION_LENGTH),
                Texts.truncate(event.method(), AsyncOperationLogRecorder.MAX_METHOD_LENGTH),
                Texts.truncate(event.path(), AsyncOperationLogRecorder.MAX_PATH_LENGTH),
                event.requestBody(),
                event.responseCode(),
                event.success(),
                event.errorMessage(),
                event.durationMs(),
                event.ip(),
                event.userAgent(),
                event.createdAt());
    }

    private static @Nullable String limit(final @Nullable String value, final int maxLength) {
        return value == null ? null : Texts.truncate(value, maxLength);
    }
}

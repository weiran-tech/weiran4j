package com.wulicode.weiran.system.domain.batch;

import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** 生命周期及逐项结果的唯一持久化端口。 */
public interface BatchJobRepository {
    long create(String kind, String name, String sourceKey, String inputMode, String fingerprint, long userId);

    long createQueuedReference(String kind, String name, String reference, String fingerprint, long userId);

    @Nullable
    BatchJob get(long id, long userId);

    List<BatchJob> recent(long userId, List<String> kinds);

    PageResult<BatchTaskDetail> details(long id, @Nullable String stage, @Nullable String status, PageQuery page);

    @Nullable
    BatchWork claim(String worker, List<String> supportedKinds);

    void heartbeat(long id, String worker);

    void beginValidation(long id, String worker);

    void validation(long id, String worker, BatchTaskDetail item);

    void beginDecision(long id, String worker, long total);

    /** 原子确认预检记录完整，并持久化决策和处理阶段待执行项。 */
    void decide(long id, String worker, long total);

    List<BatchTaskDetail> pending(long id);

    /** 在业务写入事务内锁定任务，防止租约转移后继续写入。 */
    void lockItem(long id, String worker, long itemNo);

    void succeeded(long id, String worker, long itemNo, @Nullable String resultType, @Nullable String resultId);

    void failedItem(long id, String worker, long itemNo, String message);

    boolean stopped(long id, String worker);

    void requestCancel(long id, long userId);

    void finish(long id, String worker);

    void fail(long id, String worker, String message);

    List<BatchCleanup> expiredFiles();

    void clearFiles(long id, @Nullable String sourceKey);

    record BatchWork(
            long id,
            String kind,
            String sourceName,
            String sourceKey,
            String inputMode,
            String fingerprint,
            String phase,
            @Nullable Long total) {}

    record BatchCleanup(long id, @Nullable String sourceKey) {}
}

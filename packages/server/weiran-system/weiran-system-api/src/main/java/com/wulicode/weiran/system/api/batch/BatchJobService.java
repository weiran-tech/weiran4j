package com.wulicode.weiran.system.api.batch;

import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import java.io.InputStream;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** 批处理用例接口。 */
public interface BatchJobService {
    BatchJobView create(String kind, String filename, InputStream input, long size, long userId);

    /** 在调用方事务内创建业务引用任务；引用与清单必须先由业务模块持久化。 */
    BatchJobView createReference(String kind, String name, String reference, long userId);

    /** 在调用方事务内创建 queued 引用任务；无处理器时，调用方须先校验权限与归属、持久化不可变输入并计算 SHA-256。 */
    BatchJobView createQueuedReference(String kind, String name, String reference, String fingerprint, long userId);

    /** 创建外部身份的排队引用任务；userType 不能为 system，调用方负责身份和引用归属校验。 */
    BatchJobView createQueuedExternalReference(
            String userType, long ownerId, String kind, String name, String reference, String fingerprint);

    BatchJobView get(long id, long userId);

    default List<BatchJobView> recent(final long userId) {
        return this.recent(userId, List.of());
    }

    List<BatchJobView> recent(long userId, List<String> kinds);

    BatchJobView cancel(long id, long userId);

    PageResult<BatchTaskDetailView> details(
            long id, long userId, @Nullable String stage, @Nullable String status, PageQuery page);
}

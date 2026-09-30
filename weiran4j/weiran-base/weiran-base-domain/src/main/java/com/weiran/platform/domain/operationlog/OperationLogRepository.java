package com.weiran.platform.domain.operationlog;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.util.Optional;

/** 操作日志仓储端口。 */
public interface OperationLogRepository {

    /** 追加一条记录。 */
    void append(OperationLogEntry entry);

    /** 按 ID 查找。 */
    Optional<OperationLogEntry> findById(long id);

    /** 分页查询，按 ID 倒序。 */
    PageResult<OperationLogEntry> page(OperationLogCriteria criteria, PageQuery pageQuery);
}

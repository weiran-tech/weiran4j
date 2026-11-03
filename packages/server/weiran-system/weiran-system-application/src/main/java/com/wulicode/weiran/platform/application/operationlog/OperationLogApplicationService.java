package com.wulicode.weiran.platform.application.operationlog;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.text.Texts;
import com.wulicode.weiran.platform.api.operationlog.OperationLogQuery;
import com.wulicode.weiran.platform.api.operationlog.OperationLogService;
import com.wulicode.weiran.platform.api.operationlog.OperationLogView;
import com.wulicode.weiran.platform.domain.operationlog.OperationLogCriteria;
import com.wulicode.weiran.platform.domain.operationlog.OperationLogEntry;
import com.wulicode.weiran.platform.domain.operationlog.OperationLogRepository;
import org.springframework.transaction.annotation.Transactional;

/** 操作日志查询用例。 */
public class OperationLogApplicationService implements OperationLogService {

    private final OperationLogRepository operationLogRepository;

    /** 构造服务。 */
    public OperationLogApplicationService(final OperationLogRepository operationLogRepository) {
        this.operationLogRepository = operationLogRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<OperationLogView> page(final OperationLogQuery query, final PageQuery pageQuery) {
        final OperationLogCriteria criteria = new OperationLogCriteria(
                Texts.trimToNull(query.username()),
                Texts.trimToNull(query.module()),
                query.success(),
                query.startTime(),
                query.endTime());
        return this.operationLogRepository.page(criteria, pageQuery).map(OperationLogApplicationService::toView);
    }

    @Override
    @Transactional(readOnly = true)
    public OperationLogView get(final long id) {
        return this.operationLogRepository
                .findById(id)
                .map(OperationLogApplicationService::toView)
                .orElseThrow(() -> BizException.notFound("操作日志不存在"));
    }

    private static OperationLogView toView(final OperationLogEntry entry) {
        return new OperationLogView(
                entry.id() == null ? 0L : entry.id(),
                entry.userId(),
                entry.username(),
                entry.module(),
                entry.description(),
                entry.method(),
                entry.path(),
                entry.requestBody(),
                entry.responseCode(),
                entry.success(),
                entry.errorMessage(),
                entry.durationMs(),
                entry.ip(),
                entry.userAgent(),
                entry.createdAt());
    }
}

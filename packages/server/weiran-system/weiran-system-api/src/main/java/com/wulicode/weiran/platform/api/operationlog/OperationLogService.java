package com.wulicode.weiran.platform.api.operationlog;

import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;

/** 操作日志查询服务。 */
public interface OperationLogService {

    /** 分页查询，按 ID 倒序。 */
    PageResult<OperationLogView> page(OperationLogQuery query, PageQuery pageQuery);

    /** 详情；不存在抛 100002。 */
    OperationLogView get(long id);
}

package com.weiran.system.domain.loginlog;

import com.weiran.framework.page.PageQuery;
import com.weiran.framework.page.PageResult;

/** 登录日志仓储端口。 */
public interface LoginLogRepository {

    /** 追加一条记录。 */
    void append(LoginLog log);

    /** 分页查询，按 ID 倒序。 */
    PageResult<LoginLog> page(LoginLogCriteria criteria, PageQuery pageQuery);
}

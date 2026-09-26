package com.weiran.system.api.loginlog;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;

/** 登录日志查询服务。 */
public interface LoginLogService {

    /** 分页查询，按 ID 倒序。 */
    PageResult<LoginLogView> page(LoginLogQuery query, PageQuery pageQuery);
}

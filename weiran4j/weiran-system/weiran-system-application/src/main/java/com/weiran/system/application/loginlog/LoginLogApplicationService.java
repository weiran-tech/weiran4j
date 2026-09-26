package com.weiran.system.application.loginlog;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.text.Texts;
import com.weiran.system.api.loginlog.LoginLogQuery;
import com.weiran.system.api.loginlog.LoginLogService;
import com.weiran.system.api.loginlog.LoginLogView;
import com.weiran.system.domain.loginlog.LoginLog;
import com.weiran.system.domain.loginlog.LoginLogCriteria;
import com.weiran.system.domain.loginlog.LoginLogRepository;
import org.springframework.transaction.annotation.Transactional;

/** 登录日志查询用例。 */
public class LoginLogApplicationService implements LoginLogService {

    private final LoginLogRepository loginLogRepository;

    /** 构造服务。 */
    public LoginLogApplicationService(final LoginLogRepository loginLogRepository) {
        this.loginLogRepository = loginLogRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<LoginLogView> page(final LoginLogQuery query, final PageQuery pageQuery) {
        final LoginLogCriteria criteria = new LoginLogCriteria(
                Texts.trimToNull(query.username()),
                Texts.trimToNull(query.status()),
                Texts.trimToNull(query.eventType()),
                query.startTime(),
                query.endTime());
        return this.loginLogRepository.page(criteria, pageQuery).map(LoginLogApplicationService::toView);
    }

    private static LoginLogView toView(final LoginLog log) {
        return new LoginLogView(
                log.id() == null ? 0L : log.id(),
                log.userId(),
                log.username(),
                log.ip(),
                log.browser(),
                log.os(),
                log.userAgent(),
                log.eventType(),
                log.status(),
                log.message(),
                log.createdAt());
    }
}

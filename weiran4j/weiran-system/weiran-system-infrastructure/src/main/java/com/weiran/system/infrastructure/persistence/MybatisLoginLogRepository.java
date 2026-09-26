package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.framework.persistence.Likes;
import com.weiran.framework.persistence.MybatisPages;
import com.weiran.system.domain.loginlog.LoginLog;
import com.weiran.system.domain.loginlog.LoginLogCriteria;
import com.weiran.system.domain.loginlog.LoginLogRepository;
import com.weiran.system.infrastructure.persistence.entity.SysLoginLogDO;
import com.weiran.system.infrastructure.persistence.mapper.SysLoginLogMapper;
import java.time.LocalDateTime;

/** {@link LoginLogRepository} 的 MyBatis-Plus 实现。 */
public class MybatisLoginLogRepository implements LoginLogRepository {

    private final SysLoginLogMapper loginLogMapper;

    /** 构造仓储。 */
    public MybatisLoginLogRepository(final SysLoginLogMapper loginLogMapper) {
        this.loginLogMapper = loginLogMapper;
    }

    @Override
    public void append(final LoginLog log) {
        final SysLoginLogDO row = new SysLoginLogDO();
        row.setUserId(log.userId());
        row.setUsername(log.username());
        row.setIp(log.ip());
        row.setUserAgent(log.userAgent());
        row.setBrowser(log.browser());
        row.setOs(log.os());
        row.setEventType(log.eventType());
        row.setStatus(log.status());
        row.setMessage(log.message());
        row.setCreatedAt(log.createdAt());
        this.loginLogMapper.insert(row);
    }

    @Override
    public PageResult<LoginLog> page(final LoginLogCriteria criteria, final PageQuery pageQuery) {
        final String username = criteria.username();
        final String status = criteria.status();
        final String eventType = criteria.eventType();
        final LocalDateTime startTime = criteria.startTime();
        final LocalDateTime endTime = criteria.endTime();
        final LambdaQueryWrapper<SysLoginLogDO> wrapper = Wrappers.lambdaQuery(SysLoginLogDO.class)
                .like(username != null, SysLoginLogDO::getUsername, Likes.escape(username))
                .eq(status != null, SysLoginLogDO::getStatus, status)
                .eq(eventType != null, SysLoginLogDO::getEventType, eventType)
                .ge(startTime != null, SysLoginLogDO::getCreatedAt, startTime)
                .le(endTime != null, SysLoginLogDO::getCreatedAt, endTime)
                .orderByDesc(SysLoginLogDO::getId);
        return MybatisPages.toResult(
                this.loginLogMapper.selectPage(MybatisPages.of(pageQuery), wrapper),
                pageQuery,
                MybatisLoginLogRepository::toDomain);
    }

    private static LoginLog toDomain(final SysLoginLogDO row) {
        return new LoginLog(
                row.getId(),
                row.getUserId(),
                row.getUsername(),
                row.getIp(),
                row.getUserAgent(),
                row.getBrowser(),
                row.getOs(),
                row.getEventType(),
                row.getStatus(),
                row.getMessage(),
                row.getCreatedAt());
    }
}

package com.weiran.platform.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.framework.persistence.Likes;
import com.weiran.framework.persistence.MybatisPages;
import com.weiran.platform.domain.operationlog.OperationLogCriteria;
import com.weiran.platform.domain.operationlog.OperationLogEntry;
import com.weiran.platform.domain.operationlog.OperationLogRepository;
import com.weiran.platform.infrastructure.persistence.entity.SysOperationLogDO;
import com.weiran.platform.infrastructure.persistence.mapper.SysOperationLogMapper;
import java.time.LocalDateTime;
import java.util.Optional;

/** {@link OperationLogRepository} 的 MyBatis-Plus 实现。 */
public class MybatisOperationLogRepository implements OperationLogRepository {

    private final SysOperationLogMapper operationLogMapper;

    /** 构造仓储。 */
    public MybatisOperationLogRepository(final SysOperationLogMapper operationLogMapper) {
        this.operationLogMapper = operationLogMapper;
    }

    @Override
    public void append(final OperationLogEntry entry) {
        final SysOperationLogDO row = new SysOperationLogDO();
        row.setUserId(entry.userId());
        row.setUsername(entry.username());
        row.setModule(entry.module());
        row.setDescription(entry.description());
        row.setMethod(entry.method());
        row.setPath(entry.path());
        row.setRequestBody(entry.requestBody());
        row.setResponseCode(entry.responseCode());
        row.setSuccess(entry.success());
        row.setErrorMessage(entry.errorMessage());
        row.setDurationMs(entry.durationMs());
        row.setIp(entry.ip());
        row.setUserAgent(entry.userAgent());
        row.setCreatedAt(entry.createdAt());
        this.operationLogMapper.insert(row);
    }

    @Override
    public Optional<OperationLogEntry> findById(final long id) {
        return Optional.ofNullable(this.operationLogMapper.selectById(id)).map(MybatisOperationLogRepository::toDomain);
    }

    @Override
    public PageResult<OperationLogEntry> page(final OperationLogCriteria criteria, final PageQuery pageQuery) {
        final String username = criteria.username();
        final String module = criteria.module();
        final Boolean success = criteria.success();
        final LocalDateTime startTime = criteria.startTime();
        final LocalDateTime endTime = criteria.endTime();
        final LambdaQueryWrapper<SysOperationLogDO> wrapper = Wrappers.lambdaQuery(SysOperationLogDO.class)
                .like(username != null, SysOperationLogDO::getUsername, Likes.escape(username))
                .like(module != null, SysOperationLogDO::getModule, Likes.escape(module))
                .eq(success != null, SysOperationLogDO::getSuccess, success)
                .ge(startTime != null, SysOperationLogDO::getCreatedAt, startTime)
                .le(endTime != null, SysOperationLogDO::getCreatedAt, endTime)
                .orderByDesc(SysOperationLogDO::getId);
        return MybatisPages.toResult(
                this.operationLogMapper.selectPage(MybatisPages.of(pageQuery), wrapper),
                pageQuery,
                MybatisOperationLogRepository::toDomain);
    }

    private static OperationLogEntry toDomain(final SysOperationLogDO row) {
        return new OperationLogEntry(
                row.getId(),
                row.getUserId(),
                row.getUsername(),
                row.getModule(),
                row.getDescription(),
                row.getMethod(),
                row.getPath(),
                row.getRequestBody(),
                row.getResponseCode() == null ? 0 : row.getResponseCode(),
                Boolean.TRUE.equals(row.getSuccess()),
                row.getErrorMessage(),
                row.getDurationMs() == null ? 0L : row.getDurationMs(),
                row.getIp(),
                row.getUserAgent(),
                row.getCreatedAt());
    }
}

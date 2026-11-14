package com.wulicode.weiran.system.infrastructure.persistence;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.system.domain.auth.AuthorizationRevision;
import java.util.Objects;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** MySQL 共享边界，语句等待有界且失败不降级。 */
public final class JdbcAuthorizationRevision implements AuthorizationRevision {
    private final JdbcTemplate jdbc;
    /** 复用连接池，独立设置语句超时，不改变池连接配置。 */
    public JdbcAuthorizationRevision(final JdbcTemplate jdbc) {
        this.jdbc = new JdbcTemplate(Objects.requireNonNull(jdbc.getDataSource()));
        this.jdbc.setQueryTimeout(2);
    }

    @Override
    public long current() {
        try {
            final Long revision = this.jdbc.queryForObject(
                    "SELECT revision FROM sys_authorization_revision WHERE id = 1", Long.class);
            if (revision == null || revision < 0) {
                throw new BizException(CommonErrors.SERVICE_UNAVAILABLE);
            }
            return revision;
        } catch (final DataAccessException ex) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE);
        }
    }

    @Override
    public void advance() {
        this.requireTransaction();
        try {
            if (this.jdbc.update(
                            "UPDATE sys_authorization_revision SET revision = revision + 1 WHERE id = 1 AND revision < 9223372036854775807")
                    != 1) {
                throw new BizException(CommonErrors.SERVICE_UNAVAILABLE);
            }
        } catch (final DataAccessException ex) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE);
        }
    }

    private void requireTransaction() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
            throw new IllegalStateException("共享边界必须在写事务内使用");
        }
    }
}

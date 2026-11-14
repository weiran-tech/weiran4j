package com.wulicode.weiran.system.infrastructure.persistence;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.system.domain.menu.MenuStructureGuard;
import java.util.Objects;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** MySQL 共享边界，语句等待有界且失败不降级。 */
public final class JdbcMenuStructureGuard implements MenuStructureGuard {
    private final JdbcTemplate jdbc;
    /** 复用连接池，独立设置语句超时，不改变池连接配置。 */
    public JdbcMenuStructureGuard(final JdbcTemplate jdbc) {
        this.jdbc = new JdbcTemplate(Objects.requireNonNull(jdbc.getDataSource()));
        this.jdbc.setQueryTimeout(2);
    }

    @Override
    public void acquire() {
        this.requireTransaction();
        try {
            if (!Integer.valueOf(1)
                    .equals(this.jdbc.queryForObject(
                            "SELECT id FROM sys_menu_structure_guard WHERE id = 1 FOR UPDATE", Integer.class))) {
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

package com.wulicode.weiran.system.infrastructure.persistence;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.system.api.auth.SystemAuthErrors;
import com.wulicode.weiran.system.domain.auth.PasswordAttempts;
import com.wulicode.weiran.system.infrastructure.security.AuthThrottleProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionTemplate;

/** 有界共享计数；单行协调事务不包含 BCrypt 或登录状态写入。 */
public final class JdbcPasswordAttempts implements PasswordAttempts {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(JdbcPasswordAttempts.class);
    private final java.util.concurrent.atomic.AtomicLongArray outcomes =
            new java.util.concurrent.atomic.AtomicLongArray(4);
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final AuthThrottleProperties properties;

    /** 构造独立短事务准入器。 */
    public JdbcPasswordAttempts(
            final JdbcTemplate jdbc,
            final PlatformTransactionManager manager,
            final AuthThrottleProperties properties) {
        this.jdbc = new JdbcTemplate(Objects.requireNonNull(jdbc.getDataSource()));
        this.jdbc.setQueryTimeout(2);
        this.properties = properties;
        this.transaction = new TransactionTemplate(manager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.transaction.setTimeout(3);
    }

    @Override
    public void reserveLogin(final String username, final String ip) {
        this.reserve(List.of(
                new Bucket(
                        "account",
                        JdbcPasswordAttempts.hash(username.strip().toLowerCase(Locale.ROOT)),
                        this.properties.accountLimit(),
                        this.properties.loginWindow().toSeconds()),
                new Bucket(
                        "ip",
                        JdbcPasswordAttempts.hash(ip),
                        this.properties.ipLimit(),
                        this.properties.loginWindow().toSeconds())));
    }

    @Override
    public void reserveUnlock(final long userId) {
        this.reserve(List.of(new Bucket(
                "unlock",
                JdbcPasswordAttempts.hash(Long.toString(userId)),
                this.properties.lockLimit(),
                this.properties.lockWindow().toSeconds())));
    }

    private void reserve(final List<Bucket> buckets) {
        final int result;
        try {
            result = Objects.requireNonNull(this.transaction.execute(status -> this.reserveInTransaction(buckets)));
        } catch (final DataAccessException | TransactionException ex) {
            // 不向外传递携带 SQL 参数的异常，避免诊断日志泄露主体；此路径必须停止密码验证。
            this.observe(3);
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE);
        }
        this.observe(result);
        if (result == 1) {
            throw new BizException(SystemAuthErrors.AUTH_RATE_LIMITED);
        }
        if (result == 2) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE);
        }
    }

    private int reserveInTransaction(final List<Bucket> buckets) {
        // 独立 JdbcTemplate 的语句超时限制 guard 等待，不修改池连接会话级锁等待设置。
        final int tracked = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT tracked_keys FROM sys_auth_throttle_guard WHERE id = 1 FOR UPDATE", Integer.class));
        final LocalDateTime now =
                Objects.requireNonNull(this.jdbc.queryForObject("SELECT UTC_TIMESTAMP(6)", LocalDateTime.class));
        final int removed = this.jdbc.update("DELETE FROM sys_auth_throttle WHERE expires_at <= ? LIMIT 500", now);
        int current = tracked - removed;
        for (final Bucket bucket : buckets) {
            current -= this.jdbc.update(
                    "DELETE FROM sys_auth_throttle WHERE scope = ? AND subject_hash = ? AND expires_at <= ?",
                    bucket.scope(),
                    bucket.hash(),
                    now);
        }
        this.jdbc.update("UPDATE sys_auth_throttle_guard SET tracked_keys = ? WHERE id = 1", current);
        int missing = 0;
        for (final Bucket bucket : buckets) {
            final List<Integer> counts = this.jdbc.query(
                    "SELECT attempts FROM sys_auth_throttle WHERE scope = ? AND subject_hash = ?",
                    (rs, index) -> rs.getInt(1),
                    bucket.scope(),
                    bucket.hash());
            if (counts.isEmpty()) {
                missing++;
            } else if (counts.getFirst() >= bucket.limit()) {
                return 1;
            }
        }
        if ((long) current + missing > this.properties.maxKeys()) {
            return 2;
        }
        for (final Bucket bucket : buckets) {
            this.jdbc.update(
                    "INSERT INTO sys_auth_throttle(scope, subject_hash, attempts, window_started_at, expires_at) "
                            + "VALUES (?, ?, 1, ?, ?) ON DUPLICATE KEY UPDATE attempts = attempts + 1",
                    bucket.scope(),
                    bucket.hash(),
                    now,
                    now.plusSeconds(bucket.seconds()));
        }
        this.jdbc.update("UPDATE sys_auth_throttle_guard SET tracked_keys = ? WHERE id = 1", current + missing);
        return 0;
    }

    private void observe(final int result) {
        final long count = this.outcomes.incrementAndGet(result);
        if (result != 0 && (count & (count - 1)) == 0) {
            JdbcPasswordAttempts.LOG.warn("password-attempt outcome={} count={}", result, count);
        }
    }

    private static String hash(final String subject) {
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(subject.getBytes(StandardCharsets.UTF_8)));
        } catch (final NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    private record Bucket(String scope, String hash, int limit, long seconds) {}
}

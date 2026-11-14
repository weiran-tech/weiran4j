package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.system.infrastructure.persistence.JdbcPasswordAttempts;
import com.wulicode.weiran.system.infrastructure.security.AuthThrottleProperties;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.PlatformTransactionManager;

class PasswordAttemptsIT extends IntegrationTestSupport {
    @Autowired
    PlatformTransactionManager transactions;

    private JdbcPasswordAttempts store(final int capacity) {
        return new JdbcPasswordAttempts(
                this.jdbc,
                this.transactions,
                new AuthThrottleProperties(3, 4, Duration.ofMinutes(15), 5, Duration.ofMinutes(5), capacity));
    }

    @Test
    @DisplayName("双适配器并发不超发；重建不重置；账号规范化、IP独立及过期恢复")
    void sharedAtomicReservations() {
        final var first = this.store(10000);
        final var second = this.store(10000);
        final String username = IntegrationTestSupport.unique("quota");
        final String ip = IntegrationTestSupport.unique("source");
        final AtomicInteger accepted = new AtomicInteger();
        final List<CompletableFuture<Void>> futures = java.util.stream.IntStream.range(0, 12)
                .mapToObj(i -> CompletableFuture.runAsync(() -> {
                    try {
                        (i % 2 == 0 ? first : second).reserveLogin(username, ip);
                        accepted.incrementAndGet();
                    } catch (final BizException ex) {
                        assertThat(ex.getErrorCode().code()).isIn(110108, 100006);
                    }
                }))
                .toList();
        futures.forEach(CompletableFuture::join);
        while (accepted.get() < 3) {
            second.reserveLogin(username, ip);
            accepted.incrementAndGet();
        }
        assertThat(accepted.get()).isEqualTo(3);
        assertThatThrownBy(() ->
                        this.store(10000).reserveLogin(" " + username.toUpperCase(java.util.Locale.ROOT) + " ", ip))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode().code()).isEqualTo(110108));
        // 账号桶拒绝不得消耗 IP 桶；不同账号最后仍可用一次，然后达到 IP 限额。
        first.reserveLogin(IntegrationTestSupport.unique("other"), ip);
        assertThatThrownBy(() -> second.reserveLogin(IntegrationTestSupport.unique("other"), ip))
                .isInstanceOf(BizException.class);
        this.jdbc.update(
                "UPDATE sys_auth_throttle SET expires_at = UTC_TIMESTAMP(6) - INTERVAL 1 SECOND WHERE scope IN ('account','ip')");
        second.reserveLogin(username, ip);
        assertThat(this.jdbc.queryForObject(
                        "SELECT tracked_keys FROM sys_auth_throttle_guard WHERE id = 1", Integer.class))
                .isEqualTo(this.jdbc.queryForObject("SELECT COUNT(*) FROM sys_auth_throttle", Integer.class));
    }

    @Test
    @DisplayName("容量满时拒绝而不淘汰存活计数；配置非法启动失败")
    void capacityAndValidation() {
        final var normal = this.store(10000);
        normal.reserveLogin(IntegrationTestSupport.unique("capacity"), IntegrationTestSupport.unique("ip"));
        final int before = java.util.Objects.requireNonNull(
                this.jdbc.queryForObject("SELECT COUNT(*) FROM sys_auth_throttle", Integer.class));
        assertThatThrownBy(() -> this.store(2)
                        .reserveLogin(IntegrationTestSupport.unique("full"), IntegrationTestSupport.unique("ip")))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode().code()).isEqualTo(100006));
        assertThat(this.jdbc.queryForObject("SELECT COUNT(*) FROM sys_auth_throttle", Integer.class))
                .isEqualTo(before);
        assertThatThrownBy(() -> new AuthThrottleProperties(0, 1, Duration.ofSeconds(1), 1, Duration.ofSeconds(1), 2))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("真实锁屏第六次429但会话仍有效，过期后恢复")
    void unlockHttpLimitKeepsSession() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("unlock");
        final long id = this.create(
                "/api-backend/system/user/create",
                admin,
                java.util.Map.of(
                        "username", username, "nickname", "锁屏", "password", "Passw0rd1", "roleIds", List.of()));
        final String token = this.tokenOf(username, "Passw0rd1");
        for (int i = 0; i < 5; i++) {
            IntegrationTestSupport.assertOk(this.post(
                    "/api-backend/system/auth/verifyPassword", token, java.util.Map.of("password", "Passw0rd1")));
        }
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/auth/verifyPassword", token, java.util.Map.of("password", "wrong")),
                HttpStatus.TOO_MANY_REQUESTS,
                110108);
        IntegrationTestSupport.assertOk(this.get("/api-backend/system/auth/getCurrentUser", token));
        assertThat(this.jdbc.queryForObject("SELECT edit_version FROM sys_user WHERE id = ?", Integer.class, id))
                .isZero();
        this.jdbc.update(
                "UPDATE sys_auth_throttle SET expires_at = UTC_TIMESTAMP(6) - INTERVAL 1 SECOND WHERE scope = 'unlock'");
        IntegrationTestSupport.assertOk(
                this.post("/api-backend/system/auth/verifyPassword", token, java.util.Map.of("password", "Passw0rd1")));
    }

    @Test
    @DisplayName("计数数据库故障与行锁超时均拒绝校验，释放后可恢复")
    void storageFailureAndLockTimeout() throws Exception {
        final javax.sql.DataSource unavailable = org.mockito.Mockito.mock(javax.sql.DataSource.class);
        org.mockito.Mockito.when(unavailable.getConnection())
                .thenThrow(new java.sql.SQLException("synthetic unavailable"));
        final var broken = new JdbcPasswordAttempts(
                new org.springframework.jdbc.core.JdbcTemplate(unavailable),
                this.transactions,
                new AuthThrottleProperties(3, 4, Duration.ofMinutes(15), 5, Duration.ofMinutes(5), 10000));
        assertThatThrownBy(() -> broken.reserveUnlock(999999L))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode().code()).isEqualTo(100006));
        final var locked = new java.util.concurrent.CountDownLatch(1);
        final var release = new java.util.concurrent.CountDownLatch(1);
        final var holder = CompletableFuture.runAsync(() ->
                new org.springframework.transaction.support.TransactionTemplate(this.transactions)
                        .executeWithoutResult(status -> {
                            this.jdbc.queryForObject(
                                    "SELECT tracked_keys FROM sys_auth_throttle_guard WHERE id = 1 FOR UPDATE",
                                    Integer.class);
                            locked.countDown();
                            try {
                                if (!release.await(10, java.util.concurrent.TimeUnit.SECONDS)) {
                                    throw new IllegalStateException("test lock timed out");
                                }
                            } catch (final InterruptedException ex) {
                                Thread.currentThread().interrupt();
                                throw new IllegalStateException(ex);
                            }
                        }));
        try {
            assertThat(locked.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> this.store(10000).reserveUnlock(999998L))
                    .isInstanceOfSatisfying(
                            BizException.class,
                            ex -> assertThat(ex.getErrorCode().code()).isEqualTo(100006));
        } finally {
            release.countDown();
            holder.join();
        }
        this.store(10000).reserveUnlock(999998L);
    }
}

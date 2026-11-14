package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.system.domain.menu.MenuStructureGuard;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class MenuBoundaryIT extends IntegrationTestSupport {
    @Autowired
    PlatformTransactionManager transactions;

    @Autowired
    MenuStructureGuard guard;

    private long root(final String token) {
        return this.create(
                "/api-backend/system/menu/create",
                token,
                Map.of("parentId", 0, "type", "directory", "title", IntegrationTestSupport.unique("tree")));
    }

    private List<ResponseEntity<JsonNode>> race(
            final Supplier<ResponseEntity<JsonNode>> a, final Supplier<ResponseEntity<JsonNode>> b) {
        final CountDownLatch ready = new CountDownLatch(2);
        final CountDownLatch start = new CountDownLatch(1);
        final var first = CompletableFuture.supplyAsync(() -> {
            this.awaitStart(ready, start);
            return a.get();
        });
        final var second = CompletableFuture.supplyAsync(() -> {
            this.awaitStart(ready, start);
            return b.get();
        });
        try {
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
        } catch (final InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        } finally {
            start.countDown();
        }
        return List.of(first.join(), second.join());
    }

    private void awaitStart(final CountDownLatch ready, final CountDownLatch start) {
        ready.countDown();
        try {
            if (!start.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("并发起点超时");
            }
        } catch (final InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }

    @Test
    @DisplayName("独立 HTTP 事务互挂不同菜单不会成环")
    void concurrentMovesCannotCycle() {
        final String token = this.adminToken();
        final long a = this.root(token);
        final long b = this.root(token);
        final var results = this.race(
                () -> this.put(
                        "/api-backend/system/menu/update/" + a,
                        token,
                        Map.of("version", 0, "parentId", b, "type", "directory", "title", "A")),
                () -> this.put(
                        "/api-backend/system/menu/update/" + b,
                        token,
                        Map.of("version", 0, "parentId", a, "type", "directory", "title", "B")));
        assertThat(results.stream()
                        .filter(r -> r.getStatusCode() == HttpStatus.OK)
                        .count())
                .isEqualTo(1);
        final var failed = results.stream()
                .filter(r -> r.getStatusCode() != HttpStatus.OK)
                .findFirst()
                .orElseThrow();
        IntegrationTestSupport.assertError(failed, HttpStatus.CONFLICT, 100004);
        final Long parentA = this.jdbc.queryForObject("SELECT parent_id FROM sys_menu WHERE id = ?", Long.class, a);
        final Long parentB = this.jdbc.queryForObject("SELECT parent_id FROM sys_menu WHERE id = ?", Long.class, b);
        assertThat(Long.valueOf(b).equals(parentA) && Long.valueOf(a).equals(parentB))
                .isFalse();
    }

    @Test
    @DisplayName("父删子增和转按钮子增竞争保持结构合法")
    void deleteOrConvertVersusCreate() {
        final String token = this.adminToken();
        for (final boolean convert : List.of(false, true)) {
            final long parent = this.root(token);
            final var results = this.race(
                    () -> convert
                            ? this.put(
                                    "/api-backend/system/menu/update/" + parent,
                                    token,
                                    Map.of(
                                            "version",
                                            0,
                                            "parentId",
                                            0,
                                            "type",
                                            "button",
                                            "title",
                                            "button",
                                            "permission",
                                            "test:tree:action"))
                            : this.delete("/api-backend/system/menu/delete/" + parent, token),
                    () -> this.post(
                            "/api-backend/system/menu/create",
                            token,
                            Map.of("parentId", parent, "type", "directory", "title", "child")));
            assertThat(results.stream()
                            .filter(r -> r.getStatusCode() == HttpStatus.OK)
                            .count())
                    .isEqualTo(1);
            assertThat(this.jdbc.queryForObject(
                            "SELECT COUNT(*) FROM sys_menu c LEFT JOIN sys_menu p ON p.id=c.parent_id "
                                    + "WHERE c.parent_id=? AND (p.id IS NULL OR p.type='button')",
                            Integer.class,
                            parent))
                    .isZero();
        }
    }

    @Test
    @DisplayName("菜单编辑必须携带版本，同版只成功一次且冲突不改字段")
    void draftVersionsAreRequired() {
        final String token = this.adminToken();
        final long id = this.root(token);
        final String url = "/api-backend/system/menu/update/" + id;
        final Map<String, Object> body = Map.of("version", 0, "parentId", 0, "type", "directory", "title", "accepted");
        final var results = this.race(() -> this.put(url, token, body), () -> this.put(url, token, body));
        assertThat(results.stream()
                        .filter(r -> r.getStatusCode() == HttpStatus.OK)
                        .count())
                .isEqualTo(1);
        IntegrationTestSupport.assertError(
                results.stream()
                        .filter(r -> r.getStatusCode() != HttpStatus.OK)
                        .findFirst()
                        .orElseThrow(),
                HttpStatus.CONFLICT,
                100007);
        IntegrationTestSupport.assertError(
                this.call(HttpMethod.PUT, url, token, Map.of("parentId", 0, "type", "directory", "title", "missing")),
                HttpStatus.BAD_REQUEST,
                100001);
        assertThat(this.jdbc.queryForObject("SELECT edit_version FROM sys_menu WHERE id=?", Integer.class, id))
                .isEqualTo(1);
        assertThat(this.jdbc.queryForObject("SELECT title FROM sys_menu WHERE id=?", String.class, id))
                .isEqualTo("accepted");
    }

    @Test
    @DisplayName("结构守卫跨连接互斥且锁等待有界，回滚可重新取得")
    void lockTimeoutIsBounded() {
        final TransactionTemplate tx = new TransactionTemplate(this.transactions);
        tx.executeWithoutResult(status -> {
            this.guard.acquire();
            final var contender = CompletableFuture.runAsync(() -> assertThatThrownBy(
                            () -> tx.executeWithoutResult(other -> this.guard.acquire()))
                    .isInstanceOfSatisfying(
                            BizException.class,
                            ex -> assertThat(ex.getErrorCode().code()).isEqualTo(100006)));
            try {
                contender.get(10, TimeUnit.SECONDS);
            } catch (final Exception ex) {
                throw new IllegalStateException(ex);
            }
            status.setRollbackOnly();
        });
        tx.executeWithoutResult(status -> this.guard.acquire());
    }
}

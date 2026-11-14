package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.system.api.role.RoleService;
import com.wulicode.weiran.system.application.auth.AuthSnapshotCache;
import com.wulicode.weiran.system.application.auth.AuthorizationResolver;
import com.wulicode.weiran.system.application.auth.LocalRbacPermissionSource;
import com.wulicode.weiran.system.domain.auth.AuthorizationRevision;
import com.wulicode.weiran.system.domain.auth.PrincipalSnapshot;
import com.wulicode.weiran.system.domain.menu.MenuRepository;
import com.wulicode.weiran.system.domain.user.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

class AuthorizationRevisionIT extends IntegrationTestSupport {
    @Autowired
    PlatformTransactionManager transactions;

    @Autowired
    AuthorizationRevision revision;

    @Autowired
    UserRepository users;

    @Autowired
    MenuRepository menus;

    @Autowired
    AuthorizationResolver resolver;

    @Autowired
    LocalRbacPermissionSource first;

    @Autowired
    RoleService roles;

    private TransactionTemplate read() {
        final TransactionTemplate tx = new TransactionTemplate(this.transactions);
        tx.setReadOnly(true);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        return tx;
    }

    private LocalRbacPermissionSource second() {
        return new LocalRbacPermissionSource(
                this.users, this.menus, this.resolver, new AuthSnapshotCache(this.revision));
    }

    private PrincipalSnapshot load(final LocalRbacPermissionSource source, final long userId) {
        return Objects.requireNonNull(
                this.read().execute(status -> source.load(userId).orElseThrow()));
    }

    private long role(final String token) {
        final long role = this.create(
                "/api-backend/system/role/create",
                token,
                Map.of("name", "cache", "code", IntegrationTestSupport.unique("cache")));
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/role/assignMenus/" + role,
                token,
                Map.of("version", 0, "menuIds", List.of(2L, 3L))));
        return role;
    }

    private long user(final String token, final long role) {
        return this.create(
                "/api-backend/system/user/create",
                token,
                Map.of(
                        "username",
                        IntegrationTestSupport.unique("cache"),
                        "nickname",
                        "cache",
                        "password",
                        "Passw0rd1",
                        "roleIds",
                        List.of(role)));
    }

    @Test
    @DisplayName("两个独立缓存共享修订号，真实角色和用户授权写入立即校准")
    void committedChangesInvalidateOtherCache() {
        final String token = this.adminToken();
        final long role = this.role(token);
        final long user = this.user(token, role);
        final var other = this.second();
        assertThat(this.first.load(user).orElseThrow().permissions()).contains("system:user:list");
        assertThat(this.load(other, user).permissions()).contains("system:user:list");
        final long before = this.revision.current();
        this.roles.assignMenus(role, List.of(), this.roles.get(role).version());
        assertThat(this.revision.current()).isGreaterThan(before);
        assertThat(this.load(other, user).permissions()).doesNotContain("system:user:list");
        this.roles.assignMenus(role, List.of(2L, 3L), this.roles.get(role).version());
        assertThat(this.load(other, user).permissions()).contains("system:user:list");
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/user/update/" + user, token, Map.of("nickname", "cache", "roleIds", List.of())));
        assertThat(this.load(other, user).permissions()).doesNotContain("system:user:list");
        assertThat(this.jdbc.queryForObject("SELECT token_version FROM sys_user WHERE id=?", Integer.class, user))
                .isZero();
    }

    @Test
    @DisplayName("菜单状态与角色状态变化也使另一实例的权限快照失效")
    void menuAndRoleChangesInvalidateOtherCache() {
        final String token = this.adminToken();
        final long role = this.role(token);
        final long user = this.user(token, role);
        final String permission = IntegrationTestSupport.unique("private") + ":write";
        final long menu = this.create(
                "/api-backend/system/menu/create",
                token,
                Map.of("parentId", 0, "type", "button", "title", "private", "permission", permission));
        this.roles.assignMenus(role, List.of(menu), this.roles.get(role).version());
        final var other = this.second();
        assertThat(this.load(other, user).permissions()).contains(permission);
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/menu/update/" + menu,
                token,
                Map.of(
                        "parentId",
                        0,
                        "type",
                        "button",
                        "title",
                        "private",
                        "permission",
                        permission,
                        "status",
                        "disabled")));
        assertThat(this.load(other, user).permissions()).doesNotContain(permission);
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/menu/update/" + menu,
                token,
                Map.of(
                        "parentId",
                        0,
                        "type",
                        "button",
                        "title",
                        "private",
                        "permission",
                        permission,
                        "status",
                        "enabled")));
        assertThat(this.load(other, user).permissions()).contains(permission);
        final var detail = this.roles.get(role);
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/role/update/" + role,
                token,
                Map.of("name", detail.name(), "code", detail.code(), "status", "disabled")));
        assertThat(this.load(other, user).permissions()).doesNotContain(permission);
    }

    @Test
    @DisplayName("回滚不发布 revision，读取故障不沿用旧权限，版本溢出拒绝")
    void rollbackAndUnavailableFailClosed() {
        final String token = this.adminToken();
        final long role = this.role(token);
        final long user = this.user(token, role);
        final var other = this.second();
        assertThat(this.load(other, user).permissions()).contains("system:user:list");
        final long before = this.revision.current();
        final TransactionTemplate tx = new TransactionTemplate(this.transactions);
        tx.executeWithoutResult(status -> {
            this.roles.assignMenus(role, List.of(), this.roles.get(role).version());
            assertThat(this.revision.current()).isGreaterThan(before);
            status.setRollbackOnly();
        });
        assertThat(this.revision.current()).isEqualTo(before);
        assertThat(this.load(other, user).permissions()).contains("system:user:list");
        tx.executeWithoutResult(status -> {
            this.jdbc.update("DELETE FROM sys_authorization_revision WHERE id=1");
            assertThatThrownBy(() -> other.load(user))
                    .isInstanceOfSatisfying(
                            BizException.class,
                            ex -> assertThat(ex.getErrorCode().code()).isEqualTo(100006));
            status.setRollbackOnly();
        });
        tx.executeWithoutResult(status -> {
            this.jdbc.update("UPDATE sys_authorization_revision SET revision=9223372036854775807 WHERE id=1");
            assertThatThrownBy(this.revision::advance).isInstanceOf(BizException.class);
            status.setRollbackOnly();
        });
    }

    @Test
    @DisplayName("读取修订号后有并发提交，旧视图装载仍绑定旧版本，后续读取看到新权限")
    void revisionAndPermissionsUseSameView() {
        final String token = this.adminToken();
        final long role = this.role(token);
        final long user = this.user(token, role);
        final var other = this.second();
        this.read().executeWithoutResult(status -> {
            final long before = this.revision.current();
            CompletableFuture.runAsync(() -> this.roles.assignMenus(
                            role, List.of(), this.roles.get(role).version()))
                    .join();
            assertThat(this.revision.current()).isEqualTo(before);
            assertThat(other.load(user).orElseThrow().permissions()).contains("system:user:list");
        });
        assertThat(this.load(other, user).permissions()).doesNotContain("system:user:list");
        final var snapshot =
                IntegrationTestSupport.data(this.get("/api-backend/system/auth/getAuthorizationSnapshot", token));
        assertThat(snapshot.path("revision").isTextual()).isTrue();
        assertThat(snapshot.path("user").path("username").asText()).isEqualTo("admin");
        assertThat(snapshot.path("menus").isArray()).isTrue();
    }
}

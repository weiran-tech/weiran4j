package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class EditBoundaryIT extends IntegrationTestSupport {
    private static Map<String, Object> newUser(final String username, final List<Long> roles) {
        return Map.of("username", username, "nickname", "测试", "password", "Passw0rd1", "roleIds", roles);
    }

    private long createRole(final String token, final String code, final List<Long> menus) {
        final long id = this.create("/api-backend/system/role/create", token, Map.of("name", "测试角色", "code", code));
        IntegrationTestSupport.assertOk(
                this.put("/api-backend/system/role/assignMenus/" + id, token, Map.of("version", 0, "menuIds", menus)));
        return id;
    }

    @Test
    @DisplayName("同版用户并发只接受一次，冲突不替换角色或吊销令牌，缺版本拒绝")
    void sameUserVersionIsAtomic() {
        final String admin = this.adminToken();
        final long id = this.create(
                "/api-backend/system/user/create",
                admin,
                EditBoundaryIT.newUser(IntegrationTestSupport.unique("version"), List.of()));
        final Map<String, Object> edit =
                Map.of("version", 0, "nickname", "并发修改", "status", "disabled", "roleIds", List.of());
        final String path = "/api-backend/system/user/update/" + id;
        final var first = CompletableFuture.supplyAsync(() -> this.put(path, admin, edit));
        final var second = CompletableFuture.supplyAsync(() -> this.put(path, admin, edit));
        final var results = List.of(first.join(), second.join());
        assertThat(results.stream()
                        .filter(r -> r.getStatusCode() == HttpStatus.OK)
                        .count())
                .isEqualTo(1);
        final var failed = results.stream()
                .filter(r -> r.getStatusCode() != HttpStatus.OK)
                .findFirst()
                .orElseThrow();
        IntegrationTestSupport.assertError(failed, HttpStatus.CONFLICT, 100007);
        assertThat(this.jdbc.queryForObject("SELECT edit_version FROM sys_user WHERE id = ?", Integer.class, id))
                .isEqualTo(1);
        assertThat(this.jdbc.queryForObject("SELECT token_version FROM sys_user WHERE id = ?", Integer.class, id))
                .isEqualTo(1);
        IntegrationTestSupport.assertError(
                this.call(HttpMethod.PUT, path, admin, Map.of("nickname", "缺版本", "roleIds", List.of())),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertError(
                this.put(path, admin, Map.of("version", 0, "nickname", "旧草稿", "roleIds", List.of(1L))),
                HttpStatus.CONFLICT,
                100007);
        assertThat(this.jdbc.queryForObject("SELECT COUNT(*) FROM sys_user_role WHERE user_id = ?", Integer.class, id))
                .isZero();
    }

    @Test
    @DisplayName("角色资料与菜单共用版本，冲突不得删除菜单关系")
    void menusAndRoleShareVersion() {
        final String admin = this.adminToken();
        final long id = this.createRole(admin, IntegrationTestSupport.unique("version"), List.of(2L, 3L));
        final JsonNode role = IntegrationTestSupport.data(this.get("/api-backend/system/role/get/" + id, admin));
        final int version = role.path("version").asInt();
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/role/update/" + id,
                admin,
                Map.of(
                        "version",
                        version,
                        "name",
                        "新名称",
                        "code",
                        role.path("code").asText())));
        IntegrationTestSupport.assertError(
                this.put(
                        "/api-backend/system/role/assignMenus/" + id,
                        admin,
                        Map.of("version", version, "menuIds", List.of())),
                HttpStatus.CONFLICT,
                100007);
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/role/get/" + id, admin))
                        .path("menuIds")
                        .size())
                .isEqualTo(2);
        IntegrationTestSupport.assertError(
                this.call(
                        HttpMethod.PUT,
                        "/api-backend/system/role/update/" + id,
                        admin,
                        Map.of("name", "缺版本", "code", role.path("code").asText())),
                HttpStatus.BAD_REQUEST,
                100001);
    }

    @Test
    @DisplayName("本人资料和管理员草稿互斥；登录偏好收藏不推进编辑版本")
    void profileAndIndependentPatches() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("profilever");
        final long id =
                this.create("/api-backend/system/user/create", admin, EditBoundaryIT.newUser(username, List.of()));
        final String token = this.tokenOf(username, "Passw0rd1");
        final JsonNode me = IntegrationTestSupport.data(this.get("/api-backend/system/auth/getCurrentUser", token));
        assertThat(me.path("version").asInt()).isZero();
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/auth/updateProfile",
                token,
                Map.of("version", 0, "nickname", "本人修改", "gender", "unknown")));
        IntegrationTestSupport.assertError(
                this.put(
                        "/api-backend/system/user/update/" + id,
                        admin,
                        Map.of("version", 0, "nickname", "旧草稿", "roleIds", List.of())),
                HttpStatus.CONFLICT,
                100007);
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/auth/updateUsername",
                token,
                Map.of("username", IntegrationTestSupport.unique("renamed"))));
        assertThat(this.jdbc.queryForObject("SELECT edit_version FROM sys_user WHERE id = ?", Integer.class, id))
                .isEqualTo(2);
    }
}

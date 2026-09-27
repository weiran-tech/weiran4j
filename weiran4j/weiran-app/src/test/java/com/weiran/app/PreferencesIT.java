package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.LongStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** 个人偏好、收藏菜单与锁屏密码校验：{@code /api/auth/preferences}、{@code /favorite-menus}、{@code /verify-password}。 */
class PreferencesIT extends IntegrationTestSupport {

    private static final String PASSWORD = "Passw0rd1";

    private static final ObjectMapper JSON = new ObjectMapper();

    /** 新建用户并登录，返回令牌。 */
    private String newUserToken(final String username, final List<Long> roleIds) {
        final Map<String, Object> body = new HashMap<>();
        body.put("username", username);
        body.put("nickname", "测试" + username);
        body.put("password", PreferencesIT.PASSWORD);
        body.put("roleIds", roleIds);
        this.create("/api/users", this.adminToken(), body);
        return this.tokenOf(username, PreferencesIT.PASSWORD);
    }

    private long createRole(final String admin, final List<Long> menuIds) {
        final String code = IntegrationTestSupport.unique("fav");
        final long roleId = this.create("/api/roles", admin, Map.of("name", "角色" + code, "code", code));
        IntegrationTestSupport.assertOk(this.put("/api/roles/" + roleId + "/menus", admin, Map.of("menuIds", menuIds)));
        return roleId;
    }

    private static List<Long> ids(final JsonNode array) {
        final List<Long> result = new ArrayList<>();
        array.forEach(node -> result.add(node.asLong()));
        return result;
    }

    @Test
    @DisplayName("偏好：从未保存返回 null；PUT 后原样读回；再次 PUT 全量覆盖")
    void preferencesRoundTrip() throws Exception {
        final String username = IntegrationTestSupport.unique("pref");
        final String token = this.newUserToken(username, List.of());

        final ResponseEntity<JsonNode> initial = this.get("/api/auth/preferences", token);
        IntegrationTestSupport.assertOk(initial);
        assertThat(IntegrationTestSupport.data(initial).isNull()).isTrue();

        final JsonNode first = PreferencesIT.JSON.readTree(
                "{\"theme\":\"dark\",\"sidebar\":{\"collapsed\":true,\"width\":240},\"tabs\":[\"a\",\"b\"],\"font\":null}");
        IntegrationTestSupport.assertOk(this.put("/api/auth/preferences", token, first));
        assertThat(IntegrationTestSupport.data(this.get("/api/auth/preferences", token)))
                .isEqualTo(first);

        final JsonNode second = PreferencesIT.JSON.readTree("{\"locale\":\"zh-CN\"}");
        IntegrationTestSupport.assertOk(this.put("/api/auth/preferences", token, second));
        assertThat(IntegrationTestSupport.data(this.get("/api/auth/preferences", token)))
                .isEqualTo(second);
    }

    @Test
    @DisplayName("偏好：数组、数字、null 等非对象与序列化后超过 16KB 的对象返回 40000，原值不变")
    void preferencesRejectsNonObjectAndOversize() {
        final String token = this.newUserToken(IntegrationTestSupport.unique("pref"), List.of());
        final Map<String, Object> kept = Map.of("theme", "light");
        IntegrationTestSupport.assertOk(this.put("/api/auth/preferences", token, kept));

        IntegrationTestSupport.assertError(
                this.put("/api/auth/preferences", token, List.of(1, 2)), HttpStatus.BAD_REQUEST, 40000);
        IntegrationTestSupport.assertError(this.put("/api/auth/preferences", token, 42), HttpStatus.BAD_REQUEST, 40000);
        IntegrationTestSupport.assertError(
                this.put("/api/auth/preferences", token, PreferencesIT.JSON.nullNode()), HttpStatus.BAD_REQUEST, 40000);
        IntegrationTestSupport.assertError(
                this.put("/api/auth/preferences", token, Map.of("blob", "x".repeat(16 * 1024))),
                HttpStatus.BAD_REQUEST,
                40000);

        assertThat(IntegrationTestSupport.data(this.get("/api/auth/preferences", token))
                        .path("theme")
                        .asText())
                .isEqualTo("light");
    }

    @Test
    @DisplayName("收藏：从未保存返回空数组；去重并保持顺序；目录、按钮、未授权菜单与超过 50 个返回 40000；撤销授权后 GET 自动过滤")
    void favoriteMenusValidation() {
        final String admin = this.adminToken();
        // 授予「首页」(1) 与「用户管理」(3)；3 的父目录 2 会自动可见，但目录不能收藏。
        final long roleId = this.createRole(admin, List.of(1L, 3L));
        final String token = this.newUserToken(IntegrationTestSupport.unique("fav"), List.of(roleId));

        final ResponseEntity<JsonNode> initial = this.get("/api/auth/favorite-menus", token);
        IntegrationTestSupport.assertOk(initial);
        assertThat(IntegrationTestSupport.data(initial).isArray()).isTrue();
        assertThat(IntegrationTestSupport.data(initial)).isEmpty();

        IntegrationTestSupport.assertOk(
                this.put("/api/auth/favorite-menus", token, Map.of("menuIds", List.of(3L, 1L, 3L))));
        assertThat(PreferencesIT.ids(IntegrationTestSupport.data(this.get("/api/auth/favorite-menus", token))))
                .containsExactly(3L, 1L);

        // 未授权的菜单页面、目录、按钮、不存在的 ID
        for (final long menuId : List.of(4L, 2L, 100L, 999_999L)) {
            IntegrationTestSupport.assertError(
                    this.put("/api/auth/favorite-menus", token, Map.of("menuIds", List.of(1L, menuId))),
                    HttpStatus.BAD_REQUEST,
                    40000);
        }
        final List<Long> tooMany = LongStream.rangeClosed(1, 51).boxed().toList();
        IntegrationTestSupport.assertError(
                this.put("/api/auth/favorite-menus", token, Map.of("menuIds", tooMany)), HttpStatus.BAD_REQUEST, 40000);
        IntegrationTestSupport.assertError(
                this.put("/api/auth/favorite-menus", token, Map.of()), HttpStatus.BAD_REQUEST, 40000);
        // 失败的请求不改动已保存的收藏
        assertThat(PreferencesIT.ids(IntegrationTestSupport.data(this.get("/api/auth/favorite-menus", token))))
                .containsExactly(3L, 1L);

        // 角色撤掉「用户管理」后，GET 过滤掉它
        IntegrationTestSupport.assertOk(
                this.put("/api/roles/" + roleId + "/menus", admin, Map.of("menuIds", List.of(1L))));
        assertThat(PreferencesIT.ids(IntegrationTestSupport.data(this.get("/api/auth/favorite-menus", token))))
                .containsExactly(1L);
    }

    @Test
    @DisplayName("收藏：超管可收藏任意启用菜单；菜单删除后 GET 自动过滤，保持其余顺序")
    void favoriteMenusDropDeletedMenus() {
        final String admin = this.adminToken();
        final Map<String, Object> page = new HashMap<>();
        final String suffix = IntegrationTestSupport.unique("fav");
        page.put("parentId", 0);
        page.put("title", "收藏测试页");
        page.put("type", "menu");
        page.put("path", "/it/" + suffix);
        page.put("component", "it/" + suffix);
        final long pageId = this.create("/api/menus", admin, page);
        // 种子角色 1 = super_admin
        final String token = this.newUserToken(IntegrationTestSupport.unique("sup"), List.of(1L));

        IntegrationTestSupport.assertOk(
                this.put("/api/auth/favorite-menus", token, Map.of("menuIds", List.of(10L, pageId, 1L))));
        assertThat(PreferencesIT.ids(IntegrationTestSupport.data(this.get("/api/auth/favorite-menus", token))))
                .containsExactly(10L, pageId, 1L);

        IntegrationTestSupport.assertOk(this.delete("/api/menus/" + pageId, admin));
        assertThat(PreferencesIT.ids(IntegrationTestSupport.data(this.get("/api/auth/favorite-menus", token))))
                .containsExactly(10L, 1L);
    }

    @Test
    @DisplayName("登录、PUT 偏好、PUT 收藏都不刷新 sys_user.updated_at；改密码照常刷新")
    void housekeepingWritesKeepUpdatedAt() {
        final String username = IntegrationTestSupport.unique("keep");
        this.newUserToken(username, List.of());
        // 先把 updated_at 拨到过去的固定时间，避免与 datetime 秒级精度撞车
        final LocalDateTime past = LocalDateTime.of(2020, 1, 1, 0, 0, 0);
        this.jdbc.update("UPDATE sys_user SET updated_at = ? WHERE username = ?", past, username);

        final String token = this.tokenOf(username, PreferencesIT.PASSWORD);
        assertThat(this.updatedAtOf(username)).isEqualTo(past);
        IntegrationTestSupport.assertOk(this.put("/api/auth/preferences", token, Map.of("theme", "dark")));
        assertThat(this.updatedAtOf(username)).isEqualTo(past);
        IntegrationTestSupport.assertOk(this.put("/api/auth/favorite-menus", token, Map.of("menuIds", List.of())));
        assertThat(this.updatedAtOf(username)).isEqualTo(past);

        IntegrationTestSupport.assertOk(this.put(
                "/api/auth/password",
                token,
                Map.of("oldPassword", PreferencesIT.PASSWORD, "newPassword", "N3wPassw0rd")));
        assertThat(this.updatedAtOf(username)).isAfter(past);
    }

    private LocalDateTime updatedAtOf(final String username) {
        return Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT updated_at FROM sys_user WHERE username = ?", LocalDateTime.class, username));
    }

    @Test
    @DisplayName("锁屏校验密码：正确返回 null，错误返回 40101；令牌照常可用，token_version 不变，不写登录日志")
    void verifyPassword() {
        final String username = IntegrationTestSupport.unique("lock");
        final String token = this.newUserToken(username, List.of());
        final Integer versionBefore = this.jdbc.queryForObject(
                "SELECT token_version FROM sys_user WHERE username = ?", Integer.class, username);
        final Integer logsBefore = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_login_log WHERE username = ?", Integer.class, username);

        final ResponseEntity<JsonNode> ok =
                this.post("/api/auth/verify-password", token, Map.of("password", PreferencesIT.PASSWORD));
        IntegrationTestSupport.assertOk(ok);
        assertThat(IntegrationTestSupport.data(ok).isNull()).isTrue();
        IntegrationTestSupport.assertError(
                this.post("/api/auth/verify-password", token, Map.of("password", "wrong-pass1")),
                HttpStatus.UNAUTHORIZED,
                40101);

        IntegrationTestSupport.assertOk(this.get("/api/auth/me", token));
        assertThat(this.jdbc.queryForObject(
                        "SELECT token_version FROM sys_user WHERE username = ?", Integer.class, username))
                .isEqualTo(versionBefore);
        assertThat(this.jdbc.queryForObject(
                        "SELECT COUNT(*) FROM sys_login_log WHERE username = ?", Integer.class, username))
                .isEqualTo(logsBefore);
    }

    @Test
    @DisplayName("五个接口未登录都返回 401 / 40100")
    void requiresLogin() {
        IntegrationTestSupport.assertError(this.get("/api/auth/preferences", null), HttpStatus.UNAUTHORIZED, 40100);
        IntegrationTestSupport.assertError(
                this.put("/api/auth/preferences", null, Map.of("theme", "dark")), HttpStatus.UNAUTHORIZED, 40100);
        IntegrationTestSupport.assertError(this.get("/api/auth/favorite-menus", null), HttpStatus.UNAUTHORIZED, 40100);
        IntegrationTestSupport.assertError(
                this.put("/api/auth/favorite-menus", null, Map.of("menuIds", List.of(1L))),
                HttpStatus.UNAUTHORIZED,
                40100);
        IntegrationTestSupport.assertError(
                this.post("/api/auth/verify-password", null, Map.of("password", "x")), HttpStatus.UNAUTHORIZED, 40100);
    }
}

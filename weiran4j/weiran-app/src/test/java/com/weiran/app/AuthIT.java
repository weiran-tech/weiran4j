package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** 认证闭环：种子管理员登录、当前用户、动态菜单、错误码与统一响应形状。 */
class AuthIT extends IntegrationTestSupport {

    @Test
    @DisplayName("健康检查无需登录，统一响应 code 为数字 0")
    void healthIsPublic() {
        final ResponseEntity<JsonNode> response = this.get("/api/health", null);

        IntegrationTestSupport.assertOk(response);
        assertThat(IntegrationTestSupport.data(response).path("status").asText())
                .isEqualTo("UP");
        assertThat(IntegrationTestSupport.body(response).path("message").asText())
                .isEqualTo("ok");
    }

    @Test
    @DisplayName("种子账号 admin/admin123 能登录，/me 返回超管信息且权限为 *")
    void seededAdminCanLogin() {
        final ResponseEntity<JsonNode> login =
                this.login(IntegrationTestSupport.ADMIN, IntegrationTestSupport.ADMIN_PASSWORD);
        IntegrationTestSupport.assertOk(login);
        final JsonNode loginData = IntegrationTestSupport.data(login);
        assertThat(loginData.path("tokenType").asText()).isEqualTo("Bearer");
        assertThat(loginData.path("expiresIn").asLong()).isEqualTo(3600L);
        final String token = loginData.path("accessToken").asText();

        final ResponseEntity<JsonNode> me = this.get("/api/auth/me", token);
        IntegrationTestSupport.assertOk(me);
        final JsonNode data = IntegrationTestSupport.data(me);
        assertThat(data.path("id").asLong()).isEqualTo(1L);
        assertThat(data.path("username").asText()).isEqualTo("admin");
        assertThat(data.path("departmentName").asText()).isEqualTo("总公司");
        assertThat(AuthIT.texts(data.path("roles"))).containsExactly("super_admin");
        assertThat(AuthIT.texts(data.path("permissions"))).containsExactly("*");
        assertThat(data.has("password")).isFalse();

        final Integer lastLoginRows = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_user WHERE id = 1 AND last_login_at IS NOT NULL AND last_login_ip <> ''",
                Integer.class);
        assertThat(lastLoginRows).isEqualTo(1);
    }

    @Test
    @DisplayName("超管的 /auth/menus 返回全部启用的目录与菜单树，不含按钮，布尔字段为 boolean")
    void adminMenusTree() {
        final ResponseEntity<JsonNode> response = this.get("/api/auth/menus", this.adminToken());

        IntegrationTestSupport.assertOk(response);
        final JsonNode roots = IntegrationTestSupport.data(response);
        assertThat(AuthIT.ids(roots)).containsExactly(1L, 2L, 9L);
        final JsonNode system = roots.get(1);
        assertThat(system.path("type").asText()).isEqualTo("directory");
        assertThat(AuthIT.ids(system.path("children"))).containsExactly(3L, 4L, 5L, 6L, 7L, 8L);
        final JsonNode users = system.path("children").get(0);
        assertThat(users.path("component").asText()).isEqualTo("system/users/UsersPage");
        assertThat(users.path("permission").asText()).isEqualTo("system:user:list");
        assertThat(users.path("children").isEmpty()).isTrue();
        assertThat(users.path("visible").isBoolean()).isTrue();
        assertThat(users.path("keepAlive").isBoolean()).isTrue();
        assertThat(users.path("isExternal").isBoolean()).isTrue();
        assertThat(users.path("status").asText()).isEqualTo("enabled");
    }

    @Test
    @DisplayName("用户名不存在与密码错误都返回 40101，并写失败的登录日志")
    void badCredentials() {
        final String ghost = IntegrationTestSupport.unique("ghost");

        IntegrationTestSupport.assertError(
                this.login(IntegrationTestSupport.ADMIN, "wrong-password1"), HttpStatus.UNAUTHORIZED, 40101);
        final ResponseEntity<JsonNode> unknown = this.login(ghost, "whatever1");
        IntegrationTestSupport.assertError(unknown, HttpStatus.UNAUTHORIZED, 40101);
        assertThat(IntegrationTestSupport.body(unknown).path("message").asText())
                .isEqualTo("用户名或密码错误");

        final Map<String, Object> row = this.jdbc.queryForMap(
                "SELECT user_id, event_type, status, browser, os FROM sys_login_log WHERE username = ?", ghost);
        assertThat(row.get("user_id")).isNull();
        assertThat(row.get("event_type")).isEqualTo("login");
        assertThat(row.get("status")).isEqualTo("fail");
        assertThat(row.get("browser")).isEqualTo("Chrome 126");
        assertThat(row.get("os")).isEqualTo("macOS");
    }

    @Test
    @DisplayName("无令牌、令牌无效返回 401 / 40100；公开接口不受影响")
    void rejectsMissingOrInvalidToken() {
        IntegrationTestSupport.assertError(this.get("/api/auth/me", null), HttpStatus.UNAUTHORIZED, 40100);
        IntegrationTestSupport.assertError(this.get("/api/users", "not-a-jwt"), HttpStatus.UNAUTHORIZED, 40100);
        IntegrationTestSupport.assertOk(this.get("/api/health", "not-a-jwt"));
    }

    @Test
    @DisplayName("请求体校验失败返回 40000，提示语为「字段: 中文提示」")
    void validationMessage() {
        final ResponseEntity<JsonNode> response = this.post("/api/auth/login", null, Map.of("password", "x"));

        IntegrationTestSupport.assertError(response, HttpStatus.BAD_REQUEST, 40000);
        assertThat(IntegrationTestSupport.body(response).path("message").asText())
                .isEqualTo("username: 不能为空");
    }

    @Test
    @DisplayName("不存在的接口返回 404 / 40400")
    void unknownEndpoint() {
        IntegrationTestSupport.assertError(
                this.get("/api/does-not-exist", this.adminToken()), HttpStatus.NOT_FOUND, 40400);
    }

    @Test
    @DisplayName("登出写登出日志；登录日志按 ID 倒序分页查询")
    void logoutAndLoginLogs() {
        final String token = this.adminToken();

        IntegrationTestSupport.assertOk(this.post("/api/auth/logout", token, Map.of()));

        final ResponseEntity<JsonNode> page =
                this.get("/api/login-logs?username=admin&eventType=logout&page=1&pageSize=5", token);
        IntegrationTestSupport.assertOk(page);
        final JsonNode data = IntegrationTestSupport.data(page);
        assertThat(data.path("page").asInt()).isEqualTo(1);
        assertThat(data.path("pageSize").asInt()).isEqualTo(5);
        assertThat(data.path("total").asLong()).isPositive();
        final JsonNode first = data.path("list").get(0);
        assertThat(first.path("eventType").asText()).isEqualTo("logout");
        assertThat(first.path("status").asText()).isEqualTo("success");
        assertThat(first.path("createdAt").asText()).matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}");

        final ResponseEntity<JsonNode> ranged = this.get(
                "/api/login-logs?status=success&startTime=2000-01-01 00:00:00&endTime=2999-01-01 00:00:00", token);
        IntegrationTestSupport.assertOk(ranged);
        assertThat(IntegrationTestSupport.data(ranged).path("total").asLong()).isPositive();
    }

    @Test
    @DisplayName("修改个人资料后 /me 立即反映")
    void updatesOwnProfile() {
        final String username = IntegrationTestSupport.unique("profile");
        final String admin = this.adminToken();
        this.create(
                "/api/users",
                admin,
                Map.of("username", username, "nickname", "旧昵称", "password", "Passw0rd1", "roleIds", List.of()));
        final String token = this.tokenOf(username, "Passw0rd1");

        IntegrationTestSupport.assertOk(this.put(
                "/api/auth/profile", token, Map.of("nickname", "新昵称", "email", "me@example.com", "gender", "female")));

        final JsonNode me = IntegrationTestSupport.data(this.get("/api/auth/me", token));
        assertThat(me.path("nickname").asText()).isEqualTo("新昵称");
        assertThat(me.path("email").asText()).isEqualTo("me@example.com");
        assertThat(me.path("gender").asText()).isEqualTo("female");
        assertThat(AuthIT.texts(me.path("permissions"))).isEmpty();
        assertThat(IntegrationTestSupport.data(this.get("/api/auth/menus", token))
                        .isEmpty())
                .isTrue();
    }

    static List<Long> ids(final JsonNode array) {
        final List<Long> ids = new ArrayList<>();
        array.forEach(node -> ids.add(node.path("id").asLong()));
        return ids;
    }

    static List<String> texts(final JsonNode array) {
        final List<String> values = new ArrayList<>();
        array.forEach(node -> values.add(node.asText()));
        return values;
    }
}

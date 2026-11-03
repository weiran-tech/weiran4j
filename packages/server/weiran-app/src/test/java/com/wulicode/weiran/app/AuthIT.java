package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** 认证闭环：种子管理员登录、当前用户、动态菜单、错误码与统一响应形状。 */
class AuthIT extends IntegrationTestSupport {

    @Test
    @DisplayName("健康检查无需登录，统一响应 code 为数字 0")
    void healthIsPublic() {
        final ResponseEntity<JsonNode> response = this.get("/api-backend/n/health", null);

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
        assertThat(loginData.path("userId").asLong()).isEqualTo(1L);
        assertThat(login.getHeaders().get(HttpHeaders.SET_COOKIE))
                .as("令牌模式不写 Cookie")
                .isNull();
        final String token = loginData.path("accessToken").asText();
        assertThat(token).isNotBlank();

        final ResponseEntity<JsonNode> me = this.get("/api-backend/system/auth/getCurrentUser", token);
        IntegrationTestSupport.assertOk(me);
        final JsonNode data = IntegrationTestSupport.data(me);
        assertThat(data.path("id").asLong()).isEqualTo(1L);
        assertThat(data.path("username").asText()).isEqualTo("admin");
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
        final ResponseEntity<JsonNode> response =
                this.get("/api-backend/system/auth/listCurrentMenus", this.adminToken());

        IntegrationTestSupport.assertOk(response);
        final JsonNode roots = IntegrationTestSupport.data(response);
        assertThat(AuthIT.ids(roots)).containsExactly(1L, 2L, 9L, 14L, 23L);
        final JsonNode system = roots.get(1);
        assertThat(system.path("type").asText()).isEqualTo("directory");
        assertThat(AuthIT.ids(system.path("children"))).containsExactly(3L, 4L, 5L, 7L, 8L, 12L, 2000L, 13L);
        assertThat(system.path("children").get(7).path("title").asText()).isEqualTo("文件系统");
        assertThat(roots.get(4).path("visible").asBoolean()).isFalse();
        final JsonNode users = system.path("children").get(0);
        assertThat(users.path("component").asText()).isEqualTo("system/users/UsersPage");
        assertThat(users.path("permission").asText()).isEqualTo("system:user:list");
        assertThat(users.path("children").isEmpty()).isTrue();
        assertThat(users.path("visible").isBoolean()).isTrue();
        assertThat(users.path("keepAlive").isBoolean()).isTrue();
        assertThat(users.path("isExternal").isBoolean()).isTrue();
        assertThat(users.path("status").asText()).isEqualTo("enabled");
        final JsonNode smsConfigs = system.path("children").get(5);
        assertThat(smsConfigs.path("title").asText()).isEqualTo("短信配置");
        assertThat(smsConfigs.path("path").asText()).isEqualTo("/system/sms");
        assertThat(smsConfigs.path("component").asText()).isEqualTo("system/sms/SmsConfigsPage");
        final JsonNode regions = system.path("children").get(6);
        assertThat(regions.path("title").asText()).isEqualTo("行政区划");
        assertThat(regions.path("component").asText()).isEqualTo("system/regions/RegionsPage");
        assertThat(regions.path("permission").asText()).isEqualTo("region:list");
        final Integer demoRows =
                this.jdbc.queryForObject("SELECT COUNT(*) FROM sys_menu WHERE id BETWEEN 14 AND 19", Integer.class);
        assertThat(demoRows).isEqualTo(6);
    }

    @Test
    @DisplayName("用户名不存在与密码错误都返回 110101，并写失败的登录日志")
    void badCredentials() {
        final String ghost = IntegrationTestSupport.unique("ghost");

        IntegrationTestSupport.assertError(
                this.login(IntegrationTestSupport.ADMIN, "wrong-password1"), HttpStatus.UNAUTHORIZED, 110101);
        final ResponseEntity<JsonNode> unknown = this.login(ghost, "whatever1");
        IntegrationTestSupport.assertError(unknown, HttpStatus.UNAUTHORIZED, 110101);
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
    @DisplayName("无令牌、令牌无效返回 401 / 100101；公开接口不受影响")
    void rejectsMissingOrInvalidToken() {
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/auth/getCurrentUser", null), HttpStatus.UNAUTHORIZED, 100101);
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/user/list", "not-a-jwt"), HttpStatus.UNAUTHORIZED, 100101);
        IntegrationTestSupport.assertOk(this.get("/api-backend/n/health", "not-a-jwt"));
    }

    @Test
    @DisplayName("请求体校验失败返回 100001，提示语为「字段: 中文提示」")
    void validationMessage() {
        final ResponseEntity<JsonNode> response =
                this.post("/api-backend/n/system/auth/login", null, Map.of("password", "x"));

        IntegrationTestSupport.assertError(response, HttpStatus.BAD_REQUEST, 100001);
        assertThat(IntegrationTestSupport.body(response).path("message").asText())
                .isEqualTo("username: 不能为空");
    }

    @Test
    @DisplayName("不存在的接口返回 404 / 100002")
    void unknownEndpoint() {
        IntegrationTestSupport.assertError(
                this.get("/api-backend/does-not-exist", this.adminToken()), HttpStatus.NOT_FOUND, 100002);
    }

    @Test
    @DisplayName("登出写登出日志；登录日志按 ID 倒序分页查询")
    void logoutAndLoginLogs() {
        final String token = this.adminToken();

        IntegrationTestSupport.assertOk(this.post("/api-backend/system/auth/logout", token, Map.of()));

        final ResponseEntity<JsonNode> page =
                this.get("/api-backend/system/loginLog/list?username=admin&eventType=logout&page=1&pageSize=5", token);
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
                "/api-backend/system/loginLog/list?status=success&startTime=2000-01-01 00:00:00&endTime=2999-01-01 00:00:00",
                token);
        IntegrationTestSupport.assertOk(ranged);
        assertThat(IntegrationTestSupport.data(ranged).path("total").asLong()).isPositive();
    }

    @Test
    @DisplayName("修改个人资料后 /me 立即反映")
    void updatesOwnProfile() {
        final String username = IntegrationTestSupport.unique("profile");
        final String admin = this.adminToken();
        this.create(
                "/api-backend/system/user/create",
                admin,
                Map.of("username", username, "nickname", "旧昵称", "password", "Passw0rd1", "roleIds", List.of()));
        final String token = this.tokenOf(username, "Passw0rd1");

        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/auth/updateProfile",
                token,
                Map.of("nickname", "新昵称", "avatar", Map.of("text", "新", "background", "#0064FA"), "gender", "female")));

        final JsonNode me = IntegrationTestSupport.data(this.get("/api-backend/system/auth/getCurrentUser", token));
        assertThat(me.path("nickname").asText()).isEqualTo("新昵称");
        assertThat(me.path("avatar").path("text").asText()).isEqualTo("新");
        assertThat(me.path("avatar").path("background").asText()).isEqualTo("#0064FA");
        assertThat(me.has("email")).isFalse();
        assertThat(me.path("gender").asText()).isEqualTo("female");
        assertThat(AuthIT.texts(me.path("permissions"))).isEmpty();
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/auth/listCurrentMenus", token))
                        .isEmpty())
                .isTrue();
    }

    @Test
    @DisplayName("本人修改用户名后旧令牌仍有效，旧用户名不能登录，新用户名可以登录")
    void updatesOwnUsername() {
        final String oldUsername = IntegrationTestSupport.unique("olduser");
        final String newUsername = IntegrationTestSupport.unique("newuser");
        final String admin = this.adminToken();
        this.create(
                "/api-backend/system/user/create",
                admin,
                Map.of("username", oldUsername, "nickname", "用户名测试", "password", "Passw0rd1", "roleIds", List.of()));
        final String token = this.tokenOf(oldUsername, "Passw0rd1");

        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/auth/updateUsername", null, Map.of("username", newUsername)),
                HttpStatus.UNAUTHORIZED,
                100101);
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/auth/updateUsername", token, Map.of("username", "admin")),
                HttpStatus.CONFLICT,
                100003);
        for (final String invalid : List.of("Alice", "alice.name", "alice-name")) {
            IntegrationTestSupport.assertError(
                    this.put("/api-backend/system/auth/updateUsername", token, Map.of("username", invalid)),
                    HttpStatus.BAD_REQUEST,
                    100001);
        }
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/auth/updateUsername", token, Map.of("username", "_" + newUsername + "9")));

        final JsonNode me = IntegrationTestSupport.data(this.get("/api-backend/system/auth/getCurrentUser", token));
        assertThat(me.path("username").asText()).isEqualTo("_" + newUsername + "9");
        IntegrationTestSupport.assertError(this.login(oldUsername, "Passw0rd1"), HttpStatus.UNAUTHORIZED, 110101);
        IntegrationTestSupport.assertOk(this.login("_" + newUsername + "9", "Passw0rd1"));
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

package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.weiran.system.domain.port.PasswordHasher;
import java.util.Objects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * RBAC 后台管理三个 Controller（角色/账号/封禁）的端到端验证。
 *
 * <p>这一层要证明的是「装配起来能用」：{@code SystemAdapterAutoConfiguration} 的
 * {@code @Import} 列表是否登记了全部四个 Controller（含必要连带新增的
 * {@code PermissionController}）、权限拦截是否真的生效、响应格式是否包成了约定的形状。
 * 这些恰恰是单测覆盖不到、又最容易在装配疏漏时静默 404 的部分。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class RbacAdminEndpointIT {

    private static final String RAW_PASSWORD = "weiran-123456";

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordHasher passwordHasher;

    private String adminToken;

    private String noPermissionToken;

    @BeforeEach
    void seed() {
        this.jdbcTemplate.execute("DELETE FROM pam_ban");
        this.jdbcTemplate.execute("DELETE FROM pam_role_account");
        this.jdbcTemplate.execute("DELETE FROM pam_permission_role");
        this.jdbcTemplate.execute("DELETE FROM pam_permission");
        this.jdbcTemplate.execute("DELETE FROM pam_role");
        this.jdbcTemplate.execute("DELETE FROM pam_account");

        final String bcrypt =
                this.passwordHasher.hash(RbacAdminEndpointIT.RAW_PASSWORD).hash();

        // 具备全部管理权限的账号
        this.jdbcTemplate.update("""
                INSERT INTO pam_account (id, username, password, password_key, type, is_enable, created_at)
                VALUES (1, 'admin', ?, '', 'backend', 1, '2019-05-01 08:30:00')
                """, bcrypt);
        // 没有任何权限的账号，用于验证权限拦截真的生效
        this.jdbcTemplate.update("""
                INSERT INTO pam_account (id, username, password, password_key, type, is_enable, created_at)
                VALUES (2, 'guest', ?, '', 'backend', 1, '2019-05-01 08:30:00')
                """, bcrypt);

        this.jdbcTemplate.execute("INSERT INTO pam_role (id, name, title, type, is_enable, is_system) "
                + "VALUES (1, 'admin-role', '管理员', 'backend', 1, 1)");
        this.jdbcTemplate.execute("INSERT INTO pam_role (id, name, title, type, is_enable, is_system) "
                + "VALUES (2, 'custom-role', '自定义角色', 'backend', 1, 0)");

        int permissionId = 1;
        for (final String name : new String[] {
            "weiran-system:role.index",
            "weiran-system:role.manage",
            "weiran-system:role.permissions",
            "weiran-system:account.index",
            "weiran-system:account.manage",
            "weiran-system:ban.index",
            "weiran-system:ban.manage"
        }) {
            this.jdbcTemplate.update(
                    "INSERT INTO pam_permission (id, name, title, module) VALUES (?, ?, ?, 'weiran-system')",
                    permissionId,
                    name,
                    name);
            this.jdbcTemplate.update(
                    "INSERT INTO pam_permission_role (permission_id, role_id) VALUES (?, 1)", permissionId);
            permissionId++;
        }
        this.jdbcTemplate.execute("INSERT INTO pam_role_account (account_id, role_id) VALUES (1, 1)");

        this.adminToken = this.tokenOf(this.login("admin"));
        this.noPermissionToken = this.tokenOf(this.login("guest"));
    }

    @Test
    @DisplayName("角色管理完整闭环：新增 → 查询 → 编辑 → 分配权限 → 删除")
    void roleManagementFullCycle() {
        final ResponseEntity<JsonNode> create = this.post(
                "/api/v1/roles",
                "{\"name\":\"editor\",\"title\":\"编辑\",\"description\":\"内容编辑\",\"accountType\":\"backend\"}",
                this.adminToken);
        assertThat(create.getStatusCode()).isEqualTo(HttpStatus.OK);
        final long roleId =
                RbacAdminEndpointIT.body(create).path("data").path("id").asLong();
        assertThat(roleId).isPositive();

        final ResponseEntity<JsonNode> list = this.get("/api/v1/roles?page=1&size=20", this.adminToken);
        assertThat(RbacAdminEndpointIT.body(list).path("data").path("items").toString())
                .contains("editor");

        final ResponseEntity<JsonNode> update = this.post(
                "/api/v1/roles/" + roleId + "/update",
                "{\"title\":\"高级编辑\",\"description\":\"内容编辑\",\"enabled\":true}",
                this.adminToken);
        assertThat(update.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(RbacAdminEndpointIT.body(update).path("data").path("title").asText())
                .isEqualTo("高级编辑");

        final ResponseEntity<JsonNode> permissions = this.get("/api/v1/permissions", this.adminToken);
        final long permissionId = RbacAdminEndpointIT.body(permissions)
                .path("data")
                .get(0)
                .path("id")
                .asLong();

        final ResponseEntity<JsonNode> assign = this.post(
                "/api/v1/roles/" + roleId + "/permissions",
                "{\"permissionIds\":[" + permissionId + "]}",
                this.adminToken);
        assertThat(assign.getStatusCode()).isEqualTo(HttpStatus.OK);

        final ResponseEntity<JsonNode> detail = this.get("/api/v1/roles/" + roleId, this.adminToken);
        assertThat(RbacAdminEndpointIT.body(detail)
                        .path("data")
                        .path("permissionIds")
                        .toString())
                .contains(String.valueOf(permissionId));

        final ResponseEntity<JsonNode> delete = this.post("/api/v1/roles/" + roleId + "/delete", "{}", this.adminToken);
        assertThat(delete.getStatusCode()).isEqualTo(HttpStatus.OK);

        final ResponseEntity<JsonNode> listAfterDelete = this.get("/api/v1/roles?page=1&size=20", this.adminToken);
        assertThat(RbacAdminEndpointIT.body(listAfterDelete)
                        .path("data")
                        .path("items")
                        .toString())
                .doesNotContain("editor");
    }

    @Test
    @DisplayName("系统内置角色拒绝删除")
    void systemRoleCannotBeDeleted() {
        final ResponseEntity<JsonNode> delete = this.post("/api/v1/roles/1/delete", "{}", this.adminToken);

        assertThat(RbacAdminEndpointIT.body(delete).path("code").asText()).isNotEqualTo("0");

        final ResponseEntity<JsonNode> stillThere = this.get("/api/v1/roles/1", this.adminToken);
        assertThat(stillThere.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("账号管理完整闭环：新增 → 禁用 → 登录被拒 → 启用 → 登录成功")
    void accountManagementFullCycle() {
        final ResponseEntity<JsonNode> create = this.post(
                "/api/v1/accounts",
                "{\"username\":\"newone\",\"password\":\"%s\",\"accountType\":\"backend\"}"
                        .formatted(RbacAdminEndpointIT.RAW_PASSWORD),
                this.adminToken);
        assertThat(create.getStatusCode()).isEqualTo(HttpStatus.OK);
        final long accountId =
                RbacAdminEndpointIT.body(create).path("data").path("id").asLong();

        final String password = "SELECT password FROM pam_account WHERE id = " + accountId;
        final String stored = this.jdbcTemplate.queryForObject(password, String.class);
        assertThat(stored).startsWith("$2");

        final ResponseEntity<JsonNode> disable =
                this.post("/api/v1/accounts/" + accountId + "/disable", "{}", this.adminToken);
        assertThat(disable.getStatusCode()).isEqualTo(HttpStatus.OK);

        final ResponseEntity<JsonNode> loginAfterDisable = this.login("newone");
        assertThat(loginAfterDisable.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        final ResponseEntity<JsonNode> enable =
                this.post("/api/v1/accounts/" + accountId + "/enable", "{}", this.adminToken);
        assertThat(enable.getStatusCode()).isEqualTo(HttpStatus.OK);

        final ResponseEntity<JsonNode> loginAfterEnable = this.login("newone");
        assertThat(loginAfterEnable.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("重复的账号标识被拒绝新增")
    void duplicateIdentifierIsRejected() {
        final ResponseEntity<JsonNode> first = this.post(
                "/api/v1/accounts",
                "{\"username\":\"dup\",\"password\":\"dup-123456\",\"accountType\":\"backend\"}",
                this.adminToken);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        final ResponseEntity<JsonNode> second = this.post(
                "/api/v1/accounts",
                "{\"username\":\"dup\",\"password\":\"dup-654321\",\"accountType\":\"backend\"}",
                this.adminToken);
        assertThat(RbacAdminEndpointIT.body(second).path("code").asText()).isNotEqualTo("0");
    }

    @Test
    @DisplayName("封禁管理完整闭环：新增 → 查询 → 编辑 → 删除")
    void banManagementFullCycle() {
        final ResponseEntity<JsonNode> create = this.post(
                "/api/v1/bans",
                "{\"accountType\":\"backend\",\"type\":\"ip\",\"value\":\"192.168.1.100\",\"ipStart\":0,\"ipEnd\":0}",
                this.adminToken);
        assertThat(create.getStatusCode()).isEqualTo(HttpStatus.OK);
        final long banId =
                RbacAdminEndpointIT.body(create).path("data").path("id").asLong();

        final ResponseEntity<JsonNode> list = this.get("/api/v1/bans?page=1&size=20", this.adminToken);
        assertThat(RbacAdminEndpointIT.body(list).path("data").path("items").toString())
                .contains("192.168.1.100");

        final ResponseEntity<JsonNode> update = this.post(
                "/api/v1/bans/" + banId + "/update",
                "{\"value\":\"192.168.1.200\",\"ipStart\":0,\"ipEnd\":0}",
                this.adminToken);
        assertThat(update.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(RbacAdminEndpointIT.body(update).path("data").path("value").asText())
                .isEqualTo("192.168.1.200");

        final ResponseEntity<JsonNode> delete = this.post("/api/v1/bans/" + banId + "/delete", "{}", this.adminToken);
        assertThat(delete.getStatusCode()).isEqualTo(HttpStatus.OK);

        final ResponseEntity<JsonNode> listAfterDelete = this.get("/api/v1/bans?page=1&size=20", this.adminToken);
        assertThat(RbacAdminEndpointIT.body(listAfterDelete)
                        .path("data")
                        .path("items")
                        .toString())
                .doesNotContain("192.168.1.200");
    }

    @Test
    @DisplayName("不具备权限的账号访问角色/账号/封禁管理接口一律被拒绝")
    void accountWithoutPermissionIsRejected() {
        assertThat(this.get("/api/v1/roles?page=1&size=20", this.noPermissionToken)
                        .getStatusCode())
                .isNotEqualTo(HttpStatus.OK);
        assertThat(this.get("/api/v1/accounts?page=1&size=20", this.noPermissionToken)
                        .getStatusCode())
                .isNotEqualTo(HttpStatus.OK);
        assertThat(this.get("/api/v1/bans?page=1&size=20", this.noPermissionToken)
                        .getStatusCode())
                .isNotEqualTo(HttpStatus.OK);
    }

    private static JsonNode body(final ResponseEntity<JsonNode> response) {
        return Objects.requireNonNull(response.getBody(), "响应体不应为空");
    }

    private String tokenOf(final ResponseEntity<JsonNode> response) {
        return RbacAdminEndpointIT.body(response).path("data").path("token").asText();
    }

    private ResponseEntity<JsonNode> login(final String username) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        final String body = "{\"passport\":\"%s\",\"password\":\"%s\",\"guard\":\"backend\"}"
                .formatted(username, RbacAdminEndpointIT.RAW_PASSWORD);
        return this.restTemplate.exchange(
                this.url("/api/v1/auth/login"), HttpMethod.POST, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private ResponseEntity<JsonNode> get(final String path, final String token) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return this.restTemplate.exchange(this.url(path), HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
    }

    private ResponseEntity<JsonNode> post(final String path, final String body, final String token) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return this.restTemplate.exchange(
                this.url(path), HttpMethod.POST, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private String url(final String path) {
        return "http://localhost:" + this.port + path;
    }
}

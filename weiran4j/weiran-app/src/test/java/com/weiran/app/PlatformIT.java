package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;

/** 平台能力：字典、系统配置、操作日志（异步落库）。 */
class PlatformIT extends IntegrationTestSupport {

    @Autowired
    private ApplicationContext context;

    @Test
    @DisplayName("字典与字典项 CRUD；按编码只取启用项；值重复 40900；内置字典保护 40901；删除级联")
    void dictCrud() {
        final String admin = this.adminToken();
        final String code = IntegrationTestSupport.unique("dict");
        final long dictId = this.create("/api/dicts", admin, Map.of("name", "测试字典", "code", code));

        final long itemA = this.create(
                "/api/dicts/" + dictId + "/items",
                admin,
                Map.of("label", "甲", "value", "a", "sort", 2, "color", "blue"));
        final long itemB =
                this.create("/api/dicts/" + dictId + "/items", admin, Map.of("label", "乙", "value", "b", "sort", 1));
        IntegrationTestSupport.assertError(
                this.post("/api/dicts/" + dictId + "/items", admin, Map.of("label", "重复", "value", "a")),
                HttpStatus.CONFLICT,
                40900);
        IntegrationTestSupport.assertOk(this.put(
                "/api/dicts/" + dictId + "/items/" + itemA,
                admin,
                Map.of("label", "甲", "value", "a", "sort", 2, "status", "disabled")));

        final JsonNode items = IntegrationTestSupport.data(this.get("/api/dicts/" + dictId + "/items", admin));
        assertThat(AuthIT.ids(items)).containsExactly(itemB, itemA);
        final JsonNode enabled = IntegrationTestSupport.data(this.get("/api/dicts/code/" + code + "/items", admin));
        assertThat(enabled.findValuesAsText("value")).containsExactly("b");
        assertThat(enabled.get(0).path("dictId").asLong()).isEqualTo(dictId);

        final JsonNode gender =
                IntegrationTestSupport.data(this.get("/api/dicts/code/sys_user_gender/items", this.adminToken()));
        assertThat(gender.findValuesAsText("value")).containsExactly("male", "female", "unknown");

        final JsonNode page = IntegrationTestSupport.data(this.get("/api/dicts?keyword=" + code, admin));
        assertThat(page.path("total").asLong()).isEqualTo(1L);
        assertThat(page.path("list").get(0).path("isBuiltin").asBoolean()).isFalse();

        IntegrationTestSupport.assertError(this.delete("/api/dicts/1", admin), HttpStatus.CONFLICT, 40901);
        IntegrationTestSupport.assertError(
                this.put(
                        "/api/dicts/1", admin, Map.of("name", "用户性别", "code", "sys_user_gender", "status", "disabled")),
                HttpStatus.CONFLICT,
                40901);
        IntegrationTestSupport.assertError(
                this.put("/api/dicts/1", admin, Map.of("name", "性别", "code", "renamed")), HttpStatus.CONFLICT, 40901);
        IntegrationTestSupport.assertError(
                this.post("/api/dicts", admin, Map.of("name", "重复", "code", code)), HttpStatus.CONFLICT, 40900);

        IntegrationTestSupport.assertOk(this.delete("/api/dicts/" + dictId + "/items/" + itemB, admin));
        IntegrationTestSupport.assertOk(this.delete("/api/dicts/" + dictId, admin));
        final Integer remaining =
                this.jdbc.queryForObject("SELECT COUNT(*) FROM sys_dict_item WHERE dict_id = ?", Integer.class, dictId);
        assertThat(remaining).isZero();
        IntegrationTestSupport.assertError(this.get("/api/dicts/" + dictId, admin), HttpStatus.NOT_FOUND, 40400);
    }

    @Test
    @DisplayName("配置按类型校验值，内置项保护，公开接口只放行 sys.site.* 且无需登录")
    void configRules() {
        final String admin = this.adminToken();
        final String prefix = IntegrationTestSupport.unique("cfg");

        IntegrationTestSupport.assertError(
                this.post("/api/configs", admin, PlatformIT.config(prefix + ".n", "abc", "number")),
                HttpStatus.BAD_REQUEST,
                40000);
        IntegrationTestSupport.assertError(
                this.post("/api/configs", admin, PlatformIT.config(prefix + ".b", "yes", "boolean")),
                HttpStatus.BAD_REQUEST,
                40000);
        IntegrationTestSupport.assertError(
                this.post("/api/configs", admin, PlatformIT.config(prefix + ".j", "{broken", "json")),
                HttpStatus.BAD_REQUEST,
                40000);
        IntegrationTestSupport.assertError(
                this.post("/api/configs", admin, PlatformIT.config(prefix + ".t", "x", "yaml")),
                HttpStatus.BAD_REQUEST,
                40000);

        this.create("/api/configs", admin, PlatformIT.config(prefix + ".n", "3.5", "number"));
        this.create("/api/configs", admin, PlatformIT.config(prefix + ".b", "true", "boolean"));
        final long jsonId =
                this.create("/api/configs", admin, PlatformIT.config(prefix + ".j", "{\"a\":[1,2]}", "json"));
        IntegrationTestSupport.assertError(
                this.post("/api/configs", admin, PlatformIT.config(prefix + ".j", "{}", "json")),
                HttpStatus.CONFLICT,
                40900);

        final JsonNode view = IntegrationTestSupport.data(this.get("/api/configs/" + jsonId, admin));
        assertThat(view.path("configType").asText()).isEqualTo("json");
        assertThat(view.path("configValue").asText()).isEqualTo("{\"a\":[1,2]}");
        assertThat(IntegrationTestSupport.data(this.get("/api/configs?keyword=" + prefix, admin))
                        .path("total")
                        .asLong())
                .isEqualTo(3L);

        final long builtinId = Objects.requireNonNull(
                this.jdbc.queryForObject("SELECT id FROM sys_config WHERE config_key = 'sys.site.title'", Long.class));
        IntegrationTestSupport.assertError(this.delete("/api/configs/" + builtinId, admin), HttpStatus.CONFLICT, 40901);
        IntegrationTestSupport.assertError(
                this.put("/api/configs/" + builtinId, admin, PlatformIT.config("sys.site.name", "x", "string")),
                HttpStatus.CONFLICT,
                40901);

        final JsonNode title = IntegrationTestSupport.data(this.get("/api/configs/public/sys.site.title", null));
        assertThat(title.path("configKey").asText()).isEqualTo("sys.site.title");
        assertThat(title.path("configValue").asText()).isEqualTo("Weiran Admin");
        IntegrationTestSupport.assertError(
                this.get("/api/configs/public/" + prefix + ".n", null), HttpStatus.FORBIDDEN, 40300);
        IntegrationTestSupport.assertError(
                this.get("/api/configs/public/sys.site.missing", null), HttpStatus.NOT_FOUND, 40400);

        IntegrationTestSupport.assertOk(this.delete("/api/configs/" + jsonId, admin));
    }

    @Test
    @DisplayName("写操作异步写入操作日志：请求体脱敏，成功与失败都有记录，可分页与查详情")
    void operationLogIsRecorded() {
        final String admin = this.adminToken();
        final String username = IntegrationTestSupport.unique("audited");
        final Map<String, Object> user = new HashMap<>();
        user.put("username", username);
        user.put("nickname", "被审计");
        user.put("password", "Passw0rd1");
        user.put("roleIds", List.of());
        this.create("/api/users", admin, user);
        IntegrationTestSupport.assertError(this.delete("/api/users/1", admin), HttpStatus.CONFLICT, 40901);

        final String like = "%" + username + "%";
        await().atMost(Duration.ofSeconds(10))
                .untilAsserted(() -> assertThat(this.jdbc.queryForObject(
                                "SELECT COUNT(*) FROM sys_operation_log WHERE request_body LIKE ?",
                                Integer.class,
                                like))
                        .isEqualTo(1));
        final Map<String, Object> row = this.jdbc.queryForMap(
                "SELECT user_id, username, module, description, method, path, request_body, response_code, success"
                        + " FROM sys_operation_log WHERE request_body LIKE ?",
                like);
        assertThat(row.get("user_id")).isEqualTo(1L);
        assertThat(row.get("username")).isEqualTo("admin");
        assertThat(row.get("module")).isEqualTo("用户管理");
        assertThat(row.get("description")).isEqualTo("新增用户");
        assertThat(row.get("method")).isEqualTo("POST");
        assertThat(row.get("path")).isEqualTo("/api/users");
        assertThat(row.get("response_code")).isEqualTo(0);
        assertThat(row.get("success")).isIn(true, 1, (byte) 1);
        assertThat((String) row.get("request_body"))
                .contains("\"password\":\"******\"")
                .doesNotContain("Passw0rd1");

        await().atMost(Duration.ofSeconds(10))
                .untilAsserted(() -> assertThat(this.jdbc.queryForObject(
                                "SELECT COUNT(*) FROM sys_operation_log WHERE path = '/api/users/1' AND response_code = 40901",
                                Integer.class))
                        .isPositive());

        final JsonNode failures = IntegrationTestSupport.data(
                this.get("/api/operation-logs?success=false&module=用户管理&username=admin", admin));
        final JsonNode failure = failures.path("list").get(0);
        assertThat(failure.path("success").isBoolean()).isTrue();
        assertThat(failure.path("success").asBoolean()).isFalse();
        assertThat(failure.path("responseCode").asInt()).isEqualTo(40901);
        assertThat(failure.path("errorMessage").asText()).isEqualTo("内置用户不可删除");

        final JsonNode detail = IntegrationTestSupport.data(
                this.get("/api/operation-logs/" + failure.path("id").asLong(), admin));
        assertThat(detail.path("method").asText()).isEqualTo("DELETE");
        assertThat(detail.path("durationMs").isNumber()).isTrue();
        assertThat(detail.path("createdAt").asText()).matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}");
        IntegrationTestSupport.assertError(
                this.get("/api/operation-logs/987654321", admin), HttpStatus.NOT_FOUND, 40400);
    }

    @Test
    @DisplayName("操作日志线程池不注册为 Bean，不会挤掉 Spring Boot 默认的 applicationTaskExecutor")
    void keepsDefaultTaskExecutor() {
        assertThat(this.context.containsBean("applicationTaskExecutor")).isTrue();
    }

    private static Map<String, Object> config(final String key, final String value, final String type) {
        return Map.of("configKey", key, "configValue", value, "configType", type, "description", "测试");
    }
}

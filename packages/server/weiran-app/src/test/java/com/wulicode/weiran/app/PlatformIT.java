package com.wulicode.weiran.app;

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
    @DisplayName("字典与字典项 CRUD；按编码只取启用项；值重复 100003；内置字典保护 100004；删除级联")
    void dictCrud() {
        final String admin = this.adminToken();
        final String code = IntegrationTestSupport.unique("dict");
        assertThat(this.jdbc.queryForObject("SELECT type FROM sys_group WHERE id = 1", String.class))
                .isEqualTo("dict");
        assertThat(this.jdbc.queryForObject("SELECT group_id FROM sys_dict_item WHERE id = 1", Long.class))
                .isEqualTo(1L);
        final long dictId = this.create("/api-backend/system/dict/create", admin, Map.of("name", "测试字典", "code", code));

        final long itemA = this.create(
                "/api-backend/system/dict/createItem/" + dictId,
                admin,
                Map.of("label", "甲", "value", "a", "sort", 2, "color", "blue"));
        final long itemB = this.create(
                "/api-backend/system/dict/createItem/" + dictId, admin, Map.of("label", "乙", "value", "b", "sort", 1));
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/dict/createItem/" + dictId, admin, Map.of("label", "重复", "value", "a")),
                HttpStatus.CONFLICT,
                100003);
        IntegrationTestSupport.assertOk(this.put(
                "/api-backend/system/dict/updateItem/" + dictId + "/" + itemA,
                admin,
                Map.of("label", "甲", "value", "a", "sort", 2, "status", "disabled")));

        final JsonNode items =
                IntegrationTestSupport.data(this.get("/api-backend/system/dict/listItems/" + dictId, admin));
        assertThat(AuthIT.ids(items)).containsExactly(itemB, itemA);
        final JsonNode enabled =
                IntegrationTestSupport.data(this.get("/api-backend/system/dict/listItemsByCode/" + code, admin));
        assertThat(enabled.findValuesAsText("value")).containsExactly("b");
        assertThat(enabled.get(0).path("dictId").asLong()).isEqualTo(dictId);

        final JsonNode gender = IntegrationTestSupport.data(
                this.get("/api-backend/system/dict/listItemsByCode/sys_user_gender", this.adminToken()));
        assertThat(gender.findValuesAsText("value")).containsExactly("male", "female", "unknown");

        final JsonNode page =
                IntegrationTestSupport.data(this.get("/api-backend/system/dict/list?keyword=" + code, admin));
        assertThat(page.path("total").asLong()).isEqualTo(1L);
        assertThat(page.path("list").get(0).path("isBuiltin").asBoolean()).isFalse();

        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/dict/delete/1", admin), HttpStatus.CONFLICT, 100004);
        IntegrationTestSupport.assertError(
                this.put(
                        "/api-backend/system/dict/update/1",
                        admin,
                        Map.of("name", "用户性别", "code", "sys_user_gender", "status", "disabled")),
                HttpStatus.CONFLICT,
                100004);
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/dict/update/1", admin, Map.of("name", "性别", "code", "renamed")),
                HttpStatus.CONFLICT,
                100004);
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/dict/create", admin, Map.of("name", "重复", "code", code)),
                HttpStatus.CONFLICT,
                100003);

        IntegrationTestSupport.assertOk(
                this.delete("/api-backend/system/dict/deleteItem/" + dictId + "/" + itemB, admin));
        IntegrationTestSupport.assertOk(this.delete("/api-backend/system/dict/delete/" + dictId, admin));
        final Integer remaining = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_dict_item WHERE group_id = ?", Integer.class, dictId);
        assertThat(remaining).isZero();
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/dict/get/" + dictId, admin), HttpStatus.NOT_FOUND, 100002);
    }

    @Test
    @DisplayName("配置按类型校验值，内置项保护，公开接口只放行 system.general.title 且无需登录")
    void configRules() {
        final String admin = this.adminToken();
        final String suffix = IntegrationTestSupport.unique("cfg");
        final String prefix = "system.general." + suffix;
        final JsonNode groups = IntegrationTestSupport.data(this.get("/api-backend/system/config/listGroups", admin));
        assertThat(groups.findValuesAsText("key"))
                .containsExactly("general", "general", "user", "upload", "system_tpl", "demo");
        assertThat(groups.findValuesAsText("groupKey"))
                .containsExactly(
                        "config_system", "config_sms", "config_system", "config_system", "config_sms", "config_system");
        assertThat(this.jdbc.queryForObject(
                        "SELECT config_value FROM sys_config WHERE config_key = 'system.user.enable_phone_login'",
                        String.class))
                .isEqualTo("false");
        final String customGroup = IntegrationTestSupport.unique("custom");
        final long customGroupId = this.create(
                "/api-backend/system/config/createGroup", admin, Map.of("key", customGroup, "label", "自定义分组"));
        assertThat(this.jdbc.queryForObject("SELECT type FROM sys_group WHERE id = ?", String.class, customGroupId))
                .isEqualTo("config");
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/config/listGroups", admin))
                        .findValuesAsText("key"))
                .contains(customGroup);
        final JsonNode customGroupView =
                IntegrationTestSupport.data(this.get("/api-backend/system/config/listGroups", admin))
                        .findParents("key")
                        .stream()
                        .filter(item -> customGroup.equals(item.path("key").asText()))
                        .findFirst()
                        .orElseThrow();
        assertThat(customGroupView.path("isBuiltin").asBoolean()).isFalse();
        assertThat(customGroupView.path("canDelete").asBoolean()).isTrue();
        assertThat(customGroupView.path("createdAt").asText()).isNotBlank();
        final long customConfigId = this.create(
                "/api-backend/system/config/create",
                admin,
                PlatformIT.config("system." + customGroup + "." + suffix + "_group_item", "x", "string", customGroup));
        final JsonNode populatedGroupView =
                IntegrationTestSupport.data(this.get("/api-backend/system/config/listGroups", admin))
                        .findParents("key")
                        .stream()
                        .filter(item -> customGroup.equals(item.path("key").asText()))
                        .findFirst()
                        .orElseThrow();
        assertThat(populatedGroupView.path("canDelete").asBoolean()).isFalse();
        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/config/deleteGroup/" + customGroup, admin),
                HttpStatus.CONFLICT,
                100004);
        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/config/deleteGroup/general", admin), HttpStatus.CONFLICT, 100004);
        IntegrationTestSupport.assertOk(
                this.put("/api-backend/system/config/updateGroup/" + customGroup, admin, Map.of("label", "已编辑分组")));
        assertThat(this.jdbc.queryForObject("SELECT name FROM sys_group WHERE id = ?", String.class, customGroupId))
                .isEqualTo("已编辑分组");
        IntegrationTestSupport.assertError(
                this.post(
                        "/api-backend/system/config/create",
                        admin,
                        PlatformIT.config(prefix + "_wrong_group", "x", "string", "sys_user_gender")),
                HttpStatus.BAD_REQUEST,
                100001);

        IntegrationTestSupport.assertError(
                this.post(
                        "/api-backend/system/config/create", admin, PlatformIT.config(prefix + "_n", "abc", "number")),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertError(
                this.post(
                        "/api-backend/system/config/create", admin, PlatformIT.config(prefix + "_b", "yes", "boolean")),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertError(
                this.post(
                        "/api-backend/system/config/create",
                        admin,
                        PlatformIT.config(prefix + "_j", "{broken", "json")),
                HttpStatus.BAD_REQUEST,
                100001);
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/config/create", admin, PlatformIT.config(prefix + "_t", "x", "yaml")),
                HttpStatus.BAD_REQUEST,
                100001);

        this.create("/api-backend/system/config/create", admin, PlatformIT.config(prefix + "_n", "3.5", "number"));
        this.create("/api-backend/system/config/create", admin, PlatformIT.config(prefix + "_b", "true", "boolean"));
        final long jsonId = this.create(
                "/api-backend/system/config/create", admin, PlatformIT.config(prefix + "_j", "{\"a\":[1,2]}", "json"));
        IntegrationTestSupport.assertError(
                this.post("/api-backend/system/config/create", admin, PlatformIT.config(prefix + "_j", "{}", "json")),
                HttpStatus.CONFLICT,
                100003);

        final JsonNode view = IntegrationTestSupport.data(this.get("/api-backend/system/config/get/" + jsonId, admin));
        assertThat(view.path("configType").asText()).isEqualTo("json");
        assertThat(view.path("configValue").asText()).isEqualTo("{\"a\":[1,2]}");
        assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/config/list?keyword=" + suffix, admin))
                        .path("total")
                        .asLong())
                .isEqualTo(4L);

        final long builtinId = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT id FROM sys_config WHERE config_key = 'system.general.title'", Long.class));
        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/config/delete/" + builtinId, admin), HttpStatus.CONFLICT, 100004);
        IntegrationTestSupport.assertError(
                this.put(
                        "/api-backend/system/config/update/" + builtinId,
                        admin,
                        PlatformIT.config("system.general.name", "x", "string")),
                HttpStatus.CONFLICT,
                100004);

        final JsonNode title = IntegrationTestSupport.data(
                this.get("/api-backend/n/system/config/getPublic/system.general.title", null));
        assertThat(title.path("configKey").asText()).isEqualTo("system.general.title");
        assertThat(title.path("configValue").asText()).isEqualTo("Weiran Admin");
        assertThat(this.jdbc.queryForObject(
                        "SELECT group_key FROM sys_config WHERE config_key = 'system.general.title'", String.class))
                .isEqualTo("general");
        IntegrationTestSupport.assertError(
                this.get("/api-backend/n/system/config/getPublic/" + prefix + "_n", null),
                HttpStatus.FORBIDDEN,
                100102);
        IntegrationTestSupport.assertError(
                this.get("/api-backend/n/system/config/getPublic/system.site.title", null),
                HttpStatus.FORBIDDEN,
                100102);

        IntegrationTestSupport.assertOk(this.delete("/api-backend/system/config/delete/" + jsonId, admin));
        IntegrationTestSupport.assertOk(this.delete("/api-backend/system/config/delete/" + customConfigId, admin));
        IntegrationTestSupport.assertOk(this.delete("/api-backend/system/config/deleteGroup/" + customGroup, admin));
        IntegrationTestSupport.assertError(
                this.put("/api-backend/system/config/updateGroup/" + customGroup, admin, Map.of("label", "不存在")),
                HttpStatus.NOT_FOUND,
                100002);
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
        this.create("/api-backend/system/user/create", admin, user);
        IntegrationTestSupport.assertError(
                this.delete("/api-backend/system/user/delete/1", admin), HttpStatus.CONFLICT, 100004);

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
        assertThat(row.get("path")).isEqualTo("/api-backend/system/user/create");
        assertThat(row.get("response_code")).isEqualTo(0);
        assertThat(row.get("success")).isIn(true, 1, (byte) 1);
        assertThat((String) row.get("request_body"))
                .contains("\"password\":\"******\"")
                .doesNotContain("Passw0rd1");

        await().atMost(Duration.ofSeconds(10))
                .untilAsserted(() -> assertThat(this.jdbc.queryForObject(
                                "SELECT COUNT(*) FROM sys_operation_log "
                                        + "WHERE path = '/api-backend/system/user/delete/1' AND response_code = 100004",
                                Integer.class))
                        .isPositive());

        final JsonNode failures = IntegrationTestSupport.data(
                this.get("/api-backend/system/operationLog/list?success=false&module=用户管理&username=admin", admin));
        final JsonNode failure = failures.path("list").get(0);
        assertThat(failure.path("success").isBoolean()).isTrue();
        assertThat(failure.path("success").asBoolean()).isFalse();
        assertThat(failure.path("responseCode").asInt()).isEqualTo(100004);
        assertThat(failure.path("errorMessage").asText()).isEqualTo("内置用户不可删除");

        final JsonNode detail = IntegrationTestSupport.data(this.get(
                "/api-backend/system/operationLog/get/" + failure.path("id").asLong(), admin));
        assertThat(detail.path("method").asText()).isEqualTo("DELETE");
        assertThat(detail.path("durationMs").isNumber()).isTrue();
        assertThat(detail.path("createdAt").asText()).matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}");
        IntegrationTestSupport.assertError(
                this.get("/api-backend/system/operationLog/get/987654321", admin), HttpStatus.NOT_FOUND, 100002);
    }

    @Test
    @DisplayName("操作日志线程池不注册为 Bean，不会挤掉 Spring Boot 默认的 applicationTaskExecutor")
    void keepsDefaultTaskExecutor() {
        assertThat(this.context.containsBean("applicationTaskExecutor")).isTrue();
    }

    private static Map<String, Object> config(final String key, final String value, final String type) {
        return PlatformIT.config(key, value, type, "general");
    }

    private static Map<String, Object> config(
            final String key, final String value, final String type, final String groupKey) {
        final String fieldType =
                switch (type) {
                    case "number" -> "number";
                    case "boolean" -> "switch";
                    case "json" -> "json";
                    default -> "input";
                };
        return Map.of(
                "configKey",
                key,
                "configValue",
                value,
                "configType",
                type,
                "groupKey",
                groupKey,
                "fieldType",
                fieldType,
                "required",
                true,
                "description",
                "测试");
    }
}

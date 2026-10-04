package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

/** 常青藤前台账号（注册、登录、资料、重置密码）、短信验证码与赛区的集成测试。 */
class CqtAccountIT extends CqtIntegrationTestSupport {

    /** {@code htpasswd -bnBC 10 "" legacy123} 生成的 Laravel 风格哈希。 */
    private static final String LEGACY_HASH = "$2y$10$8i0rknbNSqH58osQwTv7iuUUZD0rXMS5moCMQX5FfWijAoZ9Wt07u";

    @BeforeEach
    void seedRegion() {
        this.jdbc.update(
                "INSERT IGNORE INTO cqt_regions (legacy_id, parent_legacy_id, name, code) VALUES (15, 0, '河北', '13')");
    }

    @Test
    @DisplayName("sendSms：格式错误 400；开发模式回显 6 位验证码；60 秒内重发 429")
    void sendSms() {
        CqtAccountIT.assertPortalError(this.get("/api-web/auth/sendSms?phone=1234", null), 400, "手机号格式不正确");

        final String phone = CqtIntegrationTestSupport.uniquePhone();
        final ResponseEntity<JsonNode> first = this.get("/api-web/auth/sendSms?phone=" + phone, null);
        CqtAccountIT.assertPortalOk(first);
        assertThat(IntegrationTestSupport.data(first).path("sent").asBoolean()).isTrue();
        assertThat(IntegrationTestSupport.data(first).path("code").asText()).matches("\\d{6}");

        CqtAccountIT.assertPortalError(this.get("/api-web/auth/sendSms?phone=" + phone, null), 429, "发送过于频繁，请稍后再试");
    }

    @Test
    @DisplayName("个人注册后状态 0，可自动登录，userinfo 返回 20 个字段与赛区名称")
    void registerPersonalAndProfile() {
        final String phone = CqtIntegrationTestSupport.uniquePhone();
        final String idCard = CqtIntegrationTestSupport.uniqueIdCard();
        CqtAccountIT.assertPortalOk(this.post(
                "/api-web/auth/register",
                null,
                CqtIntegrationTestSupport.personalForm(phone, idCard, this.smsCode(phone))));

        final ResponseEntity<JsonNode> response =
                this.get("/api-web/auth/userinfo", this.portalToken(phone, CqtIntegrationTestSupport.PASSWORD));
        CqtAccountIT.assertPortalOk(response);
        final JsonNode data = IntegrationTestSupport.data(response);
        final List<String> keys = new ArrayList<>();
        data.fieldNames().forEachRemaining(keys::add);
        assertThat(keys)
                .containsExactly(
                        "id",
                        "name",
                        "type",
                        "uniid",
                        "phone",
                        "schoolid",
                        "idcard",
                        "credential_type",
                        "cities",
                        "cityname",
                        "sex",
                        "school",
                        "contact",
                        "address",
                        "email",
                        "status",
                        "zhizhao",
                        "chengnuoshu",
                        "rejectreason",
                        "source_database");
        assertThat(data.path("status").asInt()).isZero();
        assertThat(data.path("type").asInt()).isEqualTo(1);
        assertThat(data.path("idcard").asText()).isEqualTo(idCard);
        assertThat(data.path("credential_type").asText()).isEqualTo("身份证号");
        assertThat(data.path("cityname").asText()).isEqualTo("河北");
        assertThat(data.path("source_database").asText()).isEqualTo("zhongxi");
        assertThat(this.jdbc.queryForObject(
                        "SELECT token_version FROM cqt_portal_accounts WHERE phone_value = ?", Integer.class, phone))
                .isZero();
    }

    @Test
    @DisplayName("学校注册后状态 1（审核中）")
    void registerSchoolPending() {
        final String phone = CqtIntegrationTestSupport.uniquePhone();
        final Map<String, Object> form = new HashMap<>();
        form.put("type", "2");
        form.put("name", "测试学校");
        form.put("contact", "王老师");
        form.put("phone", phone);
        form.put("code", this.smsCode(phone));
        form.put("cities", "");
        form.put("schoolid", "S-001");
        form.put("email", "school@example.com");
        form.put("zhizhao", "/uploads/license.png");
        form.put("chengnuoshu", "/uploads/commitment.pdf");
        form.put("password", CqtIntegrationTestSupport.PASSWORD);
        form.put("password_confirmation", CqtIntegrationTestSupport.PASSWORD);
        CqtAccountIT.assertPortalOk(this.post("/api-web/auth/register", null, form));

        final JsonNode data = IntegrationTestSupport.data(
                this.get("/api-web/auth/userinfo", this.portalToken(phone, CqtIntegrationTestSupport.PASSWORD)));
        assertThat(data.path("status").asInt()).isEqualTo(1);
        assertThat(data.path("zhizhao").asText()).isEqualTo("/uploads/license.png");
        assertThat(data.path("cityname").asText()).isEmpty();
    }

    @Test
    @DisplayName("注册：重复手机号、重复证件号 409；身份证校验位错误 400；验证码错误 401")
    void registerConflicts() {
        final String idCard = CqtIntegrationTestSupport.uniqueIdCard();
        final String phone = CqtIntegrationTestSupport.uniquePhone();
        CqtAccountIT.assertPortalOk(this.post(
                "/api-web/auth/register",
                null,
                CqtIntegrationTestSupport.personalForm(phone, idCard, this.smsCode(phone))));

        CqtAccountIT.assertPortalError(
                this.post(
                        "/api-web/auth/register",
                        null,
                        CqtIntegrationTestSupport.personalForm(
                                phone, CqtIntegrationTestSupport.uniqueIdCard(), this.smsCode(phone))),
                409,
                "当前手机号已经注册");

        final String other = CqtIntegrationTestSupport.uniquePhone();
        CqtAccountIT.assertPortalError(
                this.post(
                        "/api-web/auth/register",
                        null,
                        CqtIntegrationTestSupport.personalForm(other, idCard, this.smsCode(other))),
                409,
                "该证件号已经注册");

        final String badChecksum = idCard.substring(0, 17) + (idCard.charAt(17) == '0' ? '1' : '0');
        final String third = CqtIntegrationTestSupport.uniquePhone();
        CqtAccountIT.assertPortalError(
                this.post(
                        "/api-web/auth/register",
                        null,
                        CqtIntegrationTestSupport.personalForm(third, badChecksum, "x")),
                400,
                "身份证号校验位错误");
        CqtAccountIT.assertPortalError(
                this.post(
                        "/api-web/auth/register",
                        null,
                        CqtIntegrationTestSupport.personalForm(
                                third, CqtIntegrationTestSupport.uniqueIdCard(), "000000")),
                401,
                "验证码错误");
    }

    @Test
    @DisplayName("登录：验证码 + 密码成功；验证码错误 401；账号不存在与密码错误同码同提示")
    void login() {
        final String phone = this.registerPersonal();

        final ResponseEntity<JsonNode> ok = this.post(
                "/api-web/auth/login",
                null,
                Map.of(
                        "type",
                        1,
                        "phone",
                        phone,
                        "password",
                        CqtIntegrationTestSupport.PASSWORD,
                        "code",
                        this.smsCode(phone)));
        CqtAccountIT.assertPortalOk(ok);
        final JsonNode token = IntegrationTestSupport.data(ok);
        assertThat(token.path("token_type").asText()).isEqualTo("bearer");
        assertThat(token.path("expires_in").asLong()).isEqualTo(3600L);
        CqtAccountIT.assertPortalOk(
                this.get("/api-web/auth/userinfo", token.path("access_token").asText()));

        CqtAccountIT.assertPortalError(
                this.post(
                        "/api-web/auth/login",
                        null,
                        Map.of("phone", phone, "password", CqtIntegrationTestSupport.PASSWORD, "code", "000000")),
                401,
                "验证码错误");

        final ResponseEntity<JsonNode> unknown = this.post(
                "/api-web/auth/autologin",
                null,
                Map.of(
                        "phone",
                        CqtIntegrationTestSupport.uniquePhone(),
                        "password",
                        CqtIntegrationTestSupport.PASSWORD));
        final ResponseEntity<JsonNode> wrongPassword =
                this.post("/api-web/auth/autologin", null, Map.of("phone", phone, "password", "wrong-password"));
        CqtAccountIT.assertPortalError(unknown, 400, "手机号或密码错误");
        CqtAccountIT.assertPortalError(wrongPassword, 400, "手机号或密码错误");
    }

    @Test
    @DisplayName("旧库 $2y$ 哈希的账号可以登录")
    void legacyHashLogin() {
        final String phone = CqtIntegrationTestSupport.uniquePhone();
        this.jdbc.update(
                "INSERT INTO cqt_portal_accounts (source_database, legacy_user_id, name_value, password_hash, user_type,"
                        + " phone_value, audit_status) VALUES ('qudao', ?, '旧账号', ?, 1, ?, 0)",
                Long.parseLong(phone.substring(3)),
                CqtAccountIT.LEGACY_HASH,
                phone);

        CqtAccountIT.assertPortalOk(
                this.post("/api-web/auth/autologin", null, Map.of("phone", phone, "password", "legacy123")));
    }

    @Test
    @DisplayName("改资料：白名单外字段忽略；手机号不同拒绝；驳回的学校改资料回到审核中")
    void updateProfile() {
        final String phone = this.registerPersonal();
        final String token = this.portalToken(phone, CqtIntegrationTestSupport.PASSWORD);
        final long id = this.accountId(phone);
        this.jdbc.update("UPDATE cqt_portal_accounts SET rejection_reason = '原因' WHERE id = ?", id);

        CqtAccountIT.assertPortalOk(this.post(
                "/api-web/auth/updateuserinfo",
                token,
                Map.of("phone", phone, "school", "新学校", "rejectreason", "x", "status", 2, "type", 2, "cities", "15")));
        final Map<String, Object> row = this.jdbc.queryForMap(
                "SELECT school_value, rejection_reason, CONCAT(audit_status, '/', user_type, '/', city_legacy_id) flags"
                        + " FROM cqt_portal_accounts WHERE id = ?",
                id);
        assertThat(row.get("school_value")).isEqualTo("新学校");
        assertThat(row.get("rejection_reason")).isEqualTo("原因");
        assertThat(row.get("flags")).as("audit_status/user_type/city_legacy_id").isEqualTo("0/1/15");

        CqtAccountIT.assertPortalError(
                this.post("/api-web/auth/updateuserinfo", token, Map.of("phone", "13800000000")), 400, "手机号不支持在此修改");
        assertThat(this.jdbc.queryForObject(
                        "SELECT phone_value FROM cqt_portal_accounts WHERE id = ?", String.class, id))
                .isEqualTo(phone);

        this.jdbc.update("UPDATE cqt_portal_accounts SET user_type = 2, audit_status = 2 WHERE id = ?", id);
        CqtAccountIT.assertPortalOk(this.post("/api-web/auth/updateuserinfo", token, Map.of("contact", "李老师")));
        assertThat(this.jdbc.queryForObject(
                        "SELECT audit_status FROM cqt_portal_accounts WHERE id = ?", Integer.class, id))
                .isEqualTo(1);
    }

    @Test
    @DisplayName("重置密码：旧令牌失效、新密码可登录；验证码一次性；输错 5 次作废")
    void resetPassword() {
        final String phone = this.registerPersonal();
        final String oldToken = this.portalToken(phone, CqtIntegrationTestSupport.PASSWORD);
        final String code = this.smsCode(phone);
        final Map<String, Object> reset =
                Map.of("phone", phone, "code", code, "password", "newpass1", "password_confirmation", "newpass1");

        CqtAccountIT.assertPortalOk(this.post("/api-web/auth/resetPassword", null, reset));
        CqtAccountIT.assertPortalError(this.get("/api-web/auth/userinfo", oldToken), 401, "登录失效,请重新登录");
        CqtAccountIT.assertPortalOk(this.get("/api-web/auth/userinfo", this.portalToken(phone, "newpass1")));
        CqtAccountIT.assertPortalError(this.post("/api-web/auth/resetPassword", null, reset), 401, "验证码错误");

        final String other = this.registerPersonal();
        final String otherCode = this.smsCode(other);
        for (int i = 0; i < 5; i++) {
            CqtAccountIT.assertPortalError(
                    this.post(
                            "/api-web/auth/resetPassword",
                            null,
                            Map.of(
                                    "phone",
                                    other,
                                    "code",
                                    "000000",
                                    "password",
                                    "newpass1",
                                    "password_confirmation",
                                    "newpass1")),
                    401,
                    "验证码错误");
        }
        CqtAccountIT.assertPortalError(
                this.post(
                        "/api-web/auth/resetPassword",
                        null,
                        Map.of(
                                "phone",
                                other,
                                "code",
                                otherCode,
                                "password",
                                "newpass1",
                                "password_confirmation",
                                "newpass1")),
                401,
                "验证码错误");

        CqtAccountIT.assertPortalError(
                this.post(
                        "/api-web/auth/resetPassword",
                        null,
                        Map.of("phone", other, "code", "x", "password", "123", "password_confirmation", "123")),
                400,
                "两次密码不一致或密码长度不足");
        final String nobody = CqtIntegrationTestSupport.uniquePhone();
        CqtAccountIT.assertPortalError(
                this.post(
                        "/api-web/auth/resetPassword",
                        null,
                        Map.of(
                                "phone",
                                nobody,
                                "code",
                                this.smsCode(nobody),
                                "password",
                                "newpass1",
                                "password_confirmation",
                                "newpass1")),
                404,
                "用户信息不存在");
    }

    @Test
    @DisplayName("承诺书模板链接与赛区列表（公开）")
    void linkInfoAndRegions() {
        final ResponseEntity<JsonNode> link = this.post("/api-web/auth/getlinkinfo", null, Map.of());
        CqtAccountIT.assertPortalOk(link);
        assertThat(IntegrationTestSupport.data(link).asText())
                .isEqualTo("https://example.com/commitment-template.docx");

        final ResponseEntity<JsonNode> regions = this.get("/api-web/competcategory/regions", null);
        CqtAccountIT.assertPortalOk(regions);
        final List<JsonNode> hebei = new ArrayList<>();
        IntegrationTestSupport.data(regions).forEach(node -> {
            if (node.path("id").asLong() == 15) {
                hebei.add(node);
            }
        });
        assertThat(hebei).hasSize(1);
        assertThat(hebei.get(0).path("pid").asLong()).isZero();
        assertThat(hebei.get(0).path("name").asText()).isEqualTo("河北");
        assertThat(hebei.get(0).has("code")).isTrue();
    }
}

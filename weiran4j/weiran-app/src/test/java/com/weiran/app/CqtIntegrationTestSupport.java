package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * 下游（weiran-cqt）集成测试的公共工具：前台响应断言、唯一手机号 / 身份证号、经接口注册与登录。
 *
 * <p>放在 {@code com.weiran.app} 包只为继承包级私有的 {@link IntegrationTestSupport}，不改任何上游文件。
 */
abstract class CqtIntegrationTestSupport extends IntegrationTestSupport {

    /** 测试账号统一密码。 */
    static final String PASSWORD = "secret123";

    private static final AtomicInteger PHONE_SEQUENCE = new AtomicInteger((int) (System.nanoTime() % 1_000_000));

    private static final AtomicInteger ID_SEQUENCE = new AtomicInteger(0);

    private static final int[] ID_WEIGHTS = {7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2};

    private static final String ID_CHECK_CODES = "10X98765432";

    /** 本次运行内唯一的手机号（139 开头）。 */
    static String uniquePhone() {
        return String.format(Locale.ROOT, "139%08d", CqtIntegrationTestSupport.PHONE_SEQUENCE.incrementAndGet());
    }

    /** 本次运行内唯一、校验位正确的身份证号（出生 2008-01-01，顺序码取自序列与手机号随机段）。 */
    static String uniqueIdCard() {
        final int seq = CqtIntegrationTestSupport.ID_SEQUENCE.incrementAndGet();
        final String body =
                String.format(Locale.ROOT, "1101%02d20080101%03d", (System.nanoTime() / 1000) % 100, seq % 1000);
        int sum = 0;
        for (int i = 0; i < 17; i++) {
            sum += (body.charAt(i) - '0') * CqtIntegrationTestSupport.ID_WEIGHTS[i];
        }
        return body + CqtIntegrationTestSupport.ID_CHECK_CODES.charAt(sum % 11);
    }

    /** 发送验证码并取回（测试 profile 开启了开发模式回显）。 */
    String smsCode(final String phone) {
        final ResponseEntity<JsonNode> response = this.get("/api-web/auth/sendSms?phone=" + phone, null);
        CqtIntegrationTestSupport.assertPortalOk(response);
        return IntegrationTestSupport.data(response).path("code").asText();
    }

    /** 注册请求体（个人）。 */
    static Map<String, Object> personalForm(final String phone, final String idCard, final String code) {
        final Map<String, Object> form = new HashMap<>();
        form.put("type", 1);
        form.put("name", "测试学生");
        form.put("phone", phone);
        form.put("code", code);
        form.put("sex", "1");
        form.put("idcard", idCard);
        form.put("credential_type", "身份证号");
        form.put("cities", 15);
        form.put("school", "测试中学");
        form.put("schoolid", "");
        form.put("password", CqtIntegrationTestSupport.PASSWORD);
        form.put("password_confirmation", CqtIntegrationTestSupport.PASSWORD);
        return form;
    }

    /** 经接口注册一个个人账号，返回手机号。 */
    String registerPersonal() {
        final String phone = CqtIntegrationTestSupport.uniquePhone();
        final ResponseEntity<JsonNode> response = this.post(
                "/api-web/auth/register",
                null,
                CqtIntegrationTestSupport.personalForm(
                        phone, CqtIntegrationTestSupport.uniqueIdCard(), this.smsCode(phone)));
        CqtIntegrationTestSupport.assertPortalOk(response);
        return phone;
    }

    /** 手机号 + 密码登录，返回前台令牌。 */
    String portalToken(final String phone, final String password) {
        final ResponseEntity<JsonNode> response =
                this.post("/api-web/auth/autologin", null, Map.of("phone", phone, "password", password));
        CqtIntegrationTestSupport.assertPortalOk(response);
        return IntegrationTestSupport.data(response).path("access_token").asText();
    }

    /** 按手机号查账号 ID。 */
    long accountId(final String phone) {
        return Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT id FROM cqt_portal_accounts WHERE phone_value = ? ORDER BY id LIMIT 1", Long.class, phone));
    }

    /** 断言前台成功：HTTP 200、code 200、message「成功」。 */
    static void assertPortalOk(final ResponseEntity<JsonNode> response) {
        assertThat(response.getStatusCode())
                .as(String.valueOf(response.getBody()))
                .isEqualTo(HttpStatus.OK);
        final JsonNode body = IntegrationTestSupport.body(response);
        assertThat(body.path("code").asInt()).as(body.toString()).isEqualTo(200);
        assertThat(body.path("message").asText()).isEqualTo("成功");
    }

    /** 断言前台失败：HTTP 200、指定 code 与提示语、data 为 null。 */
    static void assertPortalError(final ResponseEntity<JsonNode> response, final int code, final String message) {
        assertThat(response.getStatusCode())
                .as(String.valueOf(response.getBody()))
                .isEqualTo(HttpStatus.OK);
        final JsonNode body = IntegrationTestSupport.body(response);
        assertThat(body.path("code").asInt()).as(body.toString()).isEqualTo(code);
        assertThat(body.path("message").asText()).isEqualTo(message);
        assertThat(body.path("data").isNull()).isTrue();
    }
}

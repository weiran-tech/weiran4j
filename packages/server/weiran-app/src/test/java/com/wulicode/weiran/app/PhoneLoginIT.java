package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.wulicode.weiran.framework.auth.AuthCookies;
import com.wulicode.weiran.system.infrastructure.sms.LocalSmsSender;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

/** local 短信模式下，手机号验证码登录的真实 HTTP 链路。 */
@TestPropertySource(properties = "weiran.sms.mode=local")
class PhoneLoginIT extends IntegrationTestSupport {

    @Test
    @DisplayName("手机多因素认证先验短信再发令牌，同一设备有效期内免验，未绑定手机号的账号暂时免验")
    void mfaRequiresCodeAndRemembersDevice() {
        final String admin = this.adminToken();
        final String originalTemplate = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT config_value FROM sys_config WHERE config_key = ?", String.class, PhoneLoginIT.TEMPLATE_KEY));
        final Logger logger = (Logger) LoggerFactory.getLogger(LocalSmsSender.class);
        final ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    PhoneLoginIT.TEMPLATE,
                    PhoneLoginIT.TEMPLATE_KEY);
            final String username = IntegrationTestSupport.unique("mfa");
            final String phone = String.format(Locale.ROOT, "139%08d", Math.floorMod(System.nanoTime(), 100_000_000));
            this.create(
                    "/api-backend/system/user/create",
                    admin,
                    Map.of(
                            "username",
                            username,
                            "nickname",
                            "双重验证",
                            "password",
                            "Passw0rd1",
                            "phone",
                            phone,
                            "roleIds",
                            List.of()));
            IntegrationTestSupport.assertOk(this.put(
                    "/api-backend/system/security/updateMfa", admin, Map.of("enabled", true, "rememberDays", 7)));

            final ResponseEntity<JsonNode> first = this.loginWithCookies(username, "Passw0rd1");
            IntegrationTestSupport.assertOk(first);
            assertThat(IntegrationTestSupport.data(first).path("mfaRequired").asBoolean())
                    .isTrue();
            assertThat(first.getHeaders().get(HttpHeaders.SET_COOKIE))
                    .noneMatch(cookie -> cookie.startsWith(AuthCookies.TOKEN_COOKIE + "="));
            final String pending = PhoneLoginIT.cookie(first, AuthCookies.MFA_PENDING_COOKIE);
            final Matcher matcher =
                    PhoneLoginIT.CODE_PATTERN.matcher(appender.list.getLast().getFormattedMessage());
            assertThat(matcher.find()).isTrue();
            final String code = matcher.group(1);

            final HttpHeaders pendingHeaders = new HttpHeaders();
            pendingHeaders.set(HttpHeaders.COOKIE, pending);
            final String incorrect = (code.charAt(0) == '0' ? '1' : '0') + code.substring(1);
            IntegrationTestSupport.assertError(
                    this.exchange(
                            HttpMethod.POST,
                            "/api-backend/n/system/auth/verifyMfa",
                            pendingHeaders,
                            Map.of("code", incorrect)),
                    HttpStatus.BAD_REQUEST,
                    100001);
            final ResponseEntity<JsonNode> verified = this.exchange(
                    HttpMethod.POST, "/api-backend/n/system/auth/verifyMfa", pendingHeaders, Map.of("code", code));
            IntegrationTestSupport.assertOk(verified);
            assertThat(IntegrationTestSupport.data(verified).path("mfaRequired").asBoolean())
                    .isFalse();
            assertThat(PhoneLoginIT.cookie(verified, AuthCookies.TOKEN_COOKIE)).isNotBlank();
            final String trusted = PhoneLoginIT.cookie(verified, AuthCookies.MFA_TRUSTED_COOKIE);

            final HttpHeaders trustedHeaders = new HttpHeaders();
            trustedHeaders.set(HttpHeaders.COOKIE, trusted);
            final ResponseEntity<JsonNode> remembered = this.exchange(
                    HttpMethod.POST,
                    "/api-backend/n/system/auth/login",
                    trustedHeaders,
                    Map.of("username", username, "password", "Passw0rd1"));
            IntegrationTestSupport.assertOk(remembered);
            assertThat(IntegrationTestSupport.data(remembered)
                            .path("mfaRequired")
                            .asBoolean())
                    .isFalse();
            assertThat(PhoneLoginIT.cookie(remembered, AuthCookies.TOKEN_COOKIE))
                    .isNotBlank();

            final String unbound = IntegrationTestSupport.unique("unbound");
            this.create(
                    "/api-backend/system/user/create",
                    admin,
                    Map.of("username", unbound, "nickname", "未绑定", "password", "Passw0rd1", "roleIds", List.of()));
            assertThat(IntegrationTestSupport.data(this.loginWithCookies(unbound, "Passw0rd1"))
                            .path("mfaRequired")
                            .asBoolean())
                    .isFalse();
        } finally {
            this.jdbc.update("UPDATE sys_config SET config_value = json_set(config_value, '$.mfaEnabled', false, "
                    + "'$.revision', cast(json_unquote(json_extract(config_value, '$.revision')) as unsigned) + 1) "
                    + "WHERE config_key = 'system.security.settings'");
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    originalTemplate,
                    PhoneLoginIT.TEMPLATE_KEY);
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private static String cookie(final ResponseEntity<JsonNode> response, final String name) {
        return response.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE).stream()
                .filter(value -> value.startsWith(name + "="))
                .map(value -> value.substring(0, value.indexOf(';')))
                .findFirst()
                .orElseThrow();
    }

    private static final String ENABLED_KEY = "system.user.enable_phone_login";

    private static final String TEMPLATE_KEY = "sms.system_tpl.captcha_local";

    private static final String TEMPLATE = "你的验证码是 ${code} , 5 分钟有效, 请不要告知他人";

    private static final Pattern CODE_PATTERN = Pattern.compile("你的验证码是 (\\d{6}) , 5 分钟有效");

    @Test
    @DisplayName("本人改手机号必须先向新号码发码并验证，验证码只能使用一次")
    void bindsPhoneOnlyAfterVerification() {
        final String originalTemplate = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT config_value FROM sys_config WHERE config_key = ?", String.class, PhoneLoginIT.TEMPLATE_KEY));
        final Logger logger = (Logger) LoggerFactory.getLogger(LocalSmsSender.class);
        final ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    PhoneLoginIT.TEMPLATE,
                    PhoneLoginIT.TEMPLATE_KEY);
            final String username = IntegrationTestSupport.unique("bind");
            this.create(
                    "/api-backend/system/user/create",
                    this.adminToken(),
                    Map.of("username", username, "nickname", "待绑定", "password", "Passw0rd1", "roleIds", List.of()));
            final String token = this.tokenOf(username, "Passw0rd1");
            final String phone = String.format(Locale.ROOT, "137%08d", Math.floorMod(System.nanoTime(), 100_000_000));

            IntegrationTestSupport.assertOk(this.put(
                    "/api-backend/system/auth/updateProfile", token, Map.of("nickname", "已修改", "phone", phone)));
            assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/auth/getCurrentUser", token))
                            .path("phone")
                            .isNull())
                    .isTrue();

            IntegrationTestSupport.assertOk(
                    this.post("/api-backend/system/auth/sendBindPhoneCode", token, Map.of("phone", phone)));
            final Matcher matcher =
                    PhoneLoginIT.CODE_PATTERN.matcher(appender.list.getLast().getFormattedMessage());
            assertThat(matcher.find()).isTrue();
            final String code = matcher.group(1);
            IntegrationTestSupport.assertOk(
                    this.put("/api-backend/system/auth/bindPhone", token, Map.of("phone", phone, "code", code)));
            assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/auth/getCurrentUser", token))
                            .path("phone")
                            .asText())
                    .isEqualTo(phone);
            assertThat(IntegrationTestSupport.body(this.put(
                                    "/api-backend/system/auth/bindPhone", token, Map.of("phone", phone, "code", code)))
                            .path("code")
                            .asInt())
                    .isNotZero();
        } finally {
            logger.detachAppender(appender);
            appender.stop();
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    originalTemplate,
                    PhoneLoginIT.TEMPLATE_KEY);
        }
    }

    @Test
    @DisplayName("启用手机号登录后，local 日志包含替换后的验证码；验证码可登录且只能使用一次")
    void logsRenderedCodeAndCompletesPhoneLogin() {
        final String originalEnabled = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT config_value FROM sys_config WHERE config_key = ?", String.class, PhoneLoginIT.ENABLED_KEY));
        final String originalTemplate = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT config_value FROM sys_config WHERE config_key = ?", String.class, PhoneLoginIT.TEMPLATE_KEY));
        final Logger logger = (Logger) LoggerFactory.getLogger(LocalSmsSender.class);
        final ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?", "false", PhoneLoginIT.ENABLED_KEY);
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    PhoneLoginIT.TEMPLATE,
                    PhoneLoginIT.TEMPLATE_KEY);
            assertThat(this.phoneLoginEnabled()).isFalse();

            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    "没有验证码变量",
                    PhoneLoginIT.TEMPLATE_KEY);
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?", "true", PhoneLoginIT.ENABLED_KEY);
            assertThat(this.phoneLoginEnabled()).isFalse();

            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    PhoneLoginIT.TEMPLATE,
                    PhoneLoginIT.TEMPLATE_KEY);
            assertThat(this.phoneLoginEnabled()).isTrue();

            final String username = IntegrationTestSupport.unique("phone");
            final String phone = String.format(Locale.ROOT, "138%08d", Math.floorMod(System.nanoTime(), 100_000_000));
            this.create(
                    "/api-backend/system/user/create",
                    this.adminToken(),
                    Map.of(
                            "username",
                            username,
                            "nickname",
                            "手机号用户",
                            "password",
                            "Passw0rd1",
                            "phone",
                            phone,
                            "roleIds",
                            List.of()));

            final String unboundPhone = "139" + phone.substring(3);
            final ResponseEntity<JsonNode> unbound =
                    this.post("/api-backend/n/system/auth/sendPhoneCode", null, Map.of("phone", unboundPhone));
            IntegrationTestSupport.assertError(unbound, HttpStatus.BAD_REQUEST, 110106);
            assertThat(IntegrationTestSupport.body(unbound).path("message").asText())
                    .isEqualTo("手机号不存在");
            IntegrationTestSupport.assertError(
                    this.post("/api-backend/n/system/auth/sendPhoneCode", null, Map.of("phone", unboundPhone)),
                    HttpStatus.BAD_REQUEST,
                    110106);
            this.jdbc.update("UPDATE sys_user SET status = 'disabled' WHERE username = ?", username);
            final ResponseEntity<JsonNode> disabled =
                    this.post("/api-backend/n/system/auth/sendPhoneCode", null, Map.of("phone", phone));
            IntegrationTestSupport.assertError(disabled, HttpStatus.BAD_REQUEST, 110107);
            assertThat(IntegrationTestSupport.body(disabled).path("message").asText())
                    .isEqualTo("手机号已禁用");
            assertThat(appender.list).isEmpty();
            this.jdbc.update("UPDATE sys_user SET status = 'enabled' WHERE username = ?", username);

            IntegrationTestSupport.assertOk(
                    this.post("/api-backend/n/system/auth/sendPhoneCode", null, Map.of("phone", phone)));
            assertThat(appender.list).hasSize(1);
            final String log = appender.list.getFirst().getFormattedMessage();
            assertThat(log).contains("138****" + phone.substring(7), "5 分钟有效, 请不要告知他人");
            assertThat(log).doesNotContain(phone, "${code}");
            final Matcher matcher = PhoneLoginIT.CODE_PATTERN.matcher(log);
            assertThat(matcher.find()).isTrue();
            final String code = matcher.group(1);

            IntegrationTestSupport.assertError(
                    this.loginWithPhone(phone, "000000".equals(code) ? "999999" : "000000"),
                    HttpStatus.UNAUTHORIZED,
                    110101);
            final ResponseEntity<JsonNode> login = this.loginWithPhone(phone, code);
            IntegrationTestSupport.assertOk(login);
            final String token =
                    IntegrationTestSupport.data(login).path("accessToken").asText();
            assertThat(token).isNotBlank();
            assertThat(IntegrationTestSupport.data(this.get("/api-backend/system/auth/getCurrentUser", token))
                            .path("username")
                            .asText())
                    .isEqualTo(username);
            IntegrationTestSupport.assertError(this.loginWithPhone(phone, code), HttpStatus.UNAUTHORIZED, 110101);
        } finally {
            logger.detachAppender(appender);
            appender.stop();
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    originalEnabled,
                    PhoneLoginIT.ENABLED_KEY);
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?",
                    originalTemplate,
                    PhoneLoginIT.TEMPLATE_KEY);
        }
    }

    private boolean phoneLoginEnabled() {
        return IntegrationTestSupport.data(this.get("/api-backend/n/system/auth/listProviders", null))
                .path("phoneLoginEnabled")
                .asBoolean();
    }

    private ResponseEntity<JsonNode> loginWithPhone(final String phone, final String code) {
        final HttpHeaders headers = new HttpHeaders();
        headers.set(AuthCookies.AUTH_MODE_HEADER, AuthCookies.AUTH_MODE_TOKEN);
        return this.exchange(
                HttpMethod.POST,
                "/api-backend/n/system/auth/loginWithPhoneCode",
                headers,
                Map.of("phone", phone, "code", code));
    }
}

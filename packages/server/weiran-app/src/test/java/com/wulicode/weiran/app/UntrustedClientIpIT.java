package com.wulicode.weiran.app;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

@TestPropertySource(properties = {"weiran.web.trusted-proxies=", "weiran.sms.mode=local"})
class UntrustedClientIpIT extends ClientIpTestSupport {
    @Test
    @DisplayName("未配可信代理时所有日志忽略伪造转发头")
    void ignoresSpoofedHeaders() {
        final HttpHeaders headers = new HttpHeaders();
        headers.set("X-Forwarded-For", "192.0.2.66");
        headers.set("X-Real-IP", "192.0.2.77");
        headers.set("Forwarded", "for=192.0.2.88");
        this.assertAudits(headers, null);
    }

    @Test
    @DisplayName("同一对端更换伪造头和手机号不能绕过短信登录 IP 尝试限额")
    void spoofingCannotCreateNewRateLimitBuckets() {
        final String key = "system.user.enable_phone_login";
        final String templateKey = "sms.system_tpl.captcha_local";
        final String original = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT config_value FROM sys_config WHERE config_key = ?", String.class, key));
        final String originalTemplate = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT config_value FROM sys_config WHERE config_key = ?", String.class, templateKey));
        try {
            this.jdbc.update("UPDATE sys_config SET config_value = ? WHERE config_key = ?", "true", key);
            this.jdbc.update("UPDATE sys_config SET config_value = ? WHERE config_key = ?", "验证码 ${code}", templateKey);
            final long suffix = Math.floorMod(System.nanoTime(), 90_000_000L);
            for (int index = 0; index < 21; index++) {
                final HttpHeaders headers = new HttpHeaders();
                headers.set("X-Forwarded-For", "203.0.113." + (index + 1));
                headers.set("X-Real-IP", "192.0.2." + (index + 1));
                final String phone = String.format(Locale.ROOT, "139%08d", suffix + index);
                final ResponseEntity<JsonNode> response = this.exchange(
                        HttpMethod.POST,
                        "/api-backend/n/system/auth/loginWithPhoneCode",
                        headers,
                        Map.of("phone", phone, "code", "000000"));
                if (index < 20) {
                    IntegrationTestSupport.assertError(response, HttpStatus.UNAUTHORIZED, 110101);
                } else {
                    IntegrationTestSupport.assertError(response, HttpStatus.CONFLICT, 100004);
                }
            }
        } finally {
            this.jdbc.update("UPDATE sys_config SET config_value = ? WHERE config_key = ?", original, key);
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?", originalTemplate, templateKey);
        }
    }
}

package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;

@TestPropertySource(
        properties = {"weiran.web.trusted-proxies=127.0.0.1/32,::1/128,10.0.0.0/24", "weiran.sms.mode=local"})
class ClientIpIT extends ClientIpTestSupport {
    @Autowired
    private ServerProperties serverProperties;

    @Test
    @DisplayName("可信代理链结果在访问、登录与操作日志保持一致")
    void trustedChainFlowsToAllAudits() {
        assertThat(this.serverProperties.getForwardHeadersStrategy())
                .isEqualTo(ServerProperties.ForwardHeadersStrategy.NONE);
        final HttpHeaders headers = new HttpHeaders();
        headers.set("X-Forwarded-For", "192.0.2.66, 203.0.113.7, 10.0.0.2");
        this.assertAudits(headers, "203.0.113.7");
    }

    @Test
    @DisplayName("短信验证码登录也消费可信代理链的统一 IP")
    void phoneLoginUsesTrustedChain() {
        final String key = "system.user.enable_phone_login";
        final String templateKey = "sms.system_tpl.captcha_local";
        final String original = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT config_value FROM sys_config WHERE config_key = ?", String.class, key));
        final String originalTemplate = Objects.requireNonNull(this.jdbc.queryForObject(
                "SELECT config_value FROM sys_config WHERE config_key = ?", String.class, templateKey));
        final String phone = "13900000001";
        try {
            this.jdbc.update("UPDATE sys_config SET config_value = ? WHERE config_key = ?", "true", key);
            this.jdbc.update("UPDATE sys_config SET config_value = ? WHERE config_key = ?", "验证码 ${code}", templateKey);
            final HttpHeaders headers = new HttpHeaders();
            headers.set("X-Forwarded-For", "192.0.2.66, 203.0.113.9, 10.0.0.2");
            IntegrationTestSupport.assertError(
                    this.exchange(
                            HttpMethod.POST,
                            "/api-backend/n/system/auth/loginWithPhoneCode",
                            headers,
                            Map.of("phone", phone, "code", "000000")),
                    HttpStatus.UNAUTHORIZED,
                    110101);
            assertThat(this.jdbc.queryForList(
                            "SELECT ip FROM sys_login_log WHERE username = ? AND ip = ?",
                            String.class,
                            "139****0001",
                            "203.0.113.9"))
                    .isNotEmpty();
        } finally {
            this.jdbc.update("UPDATE sys_config SET config_value = ? WHERE config_key = ?", original, key);
            this.jdbc.update(
                    "UPDATE sys_config SET config_value = ? WHERE config_key = ?", originalTemplate, templateKey);
        }
    }

    @Test
    @DisplayName("可信代理的非法 XFF 安全回退，不改读 X-Real-IP")
    void malformedForwardingFallsBack() {
        final HttpHeaders headers = new HttpHeaders();
        headers.set("X-Forwarded-For", "unknown");
        headers.set("X-Real-IP", "192.0.2.66");
        this.assertAudits(headers, null);
    }
}

package com.weiran.app;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

/**
 * 短信按客户端 IP 的每小时上限（单独上下文，上限 2）。
 *
 * <p>测试客户端来自回环地址，属于 Tomcat {@code RemoteIpValve} 默认信任的内网代理，因此 {@code X-Forwarded-For} 被采信为客户端 IP，
 * 用它模拟两个不同的真实用户。
 */
@TestPropertySource(properties = "weiran.cqt.sms.ip-hourly-limit=2")
class CqtSmsLimitIT extends CqtIntegrationTestSupport {

    private ResponseEntity<JsonNode> sendFrom(final String forwardedFor) {
        final HttpHeaders headers = new HttpHeaders();
        headers.set("X-Forwarded-For", forwardedFor);
        return this.rest.exchange(
                "/api-web/auth/sendSms?phone=" + CqtIntegrationTestSupport.uniquePhone(),
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class);
    }

    @Test
    @DisplayName("同一真实 IP 第 3 次 429，另一 IP 不受影响")
    void limitsPerForwardedClientIp() {
        CqtSmsLimitIT.assertPortalOk(this.sendFrom("203.0.113.9"));
        CqtSmsLimitIT.assertPortalOk(this.sendFrom("203.0.113.9"));
        CqtSmsLimitIT.assertPortalError(this.sendFrom("203.0.113.9"), 429, "发送过于频繁，请稍后再试");
        CqtSmsLimitIT.assertPortalOk(this.sendFrom("203.0.113.10"));
    }
}

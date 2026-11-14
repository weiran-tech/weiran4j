package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.wulicode.weiran.framework.web.RequestIdFilter;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;
import org.jspecify.annotations.Nullable;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** 共用真实 HTTP 审计断言，不修改日志或客户端 IP 的业务实现。 */
abstract class ClientIpTestSupport extends IntegrationTestSupport {
    void assertAudits(final HttpHeaders headers, final @Nullable String expected) {
        final Logger logger = (Logger) LoggerFactory.getLogger(RequestIdFilter.ACCESS_LOGGER);
        final ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.list = new CopyOnWriteArrayList<>();
        appender.start();
        logger.addAppender(appender);
        try {
            final String ghost = IntegrationTestSupport.unique("ipghost");
            final String requestId = IntegrationTestSupport.unique("iprequest");
            headers.set(RequestIdFilter.HEADER, requestId);
            IntegrationTestSupport.assertError(
                    this.exchange(
                            HttpMethod.POST,
                            "/api-backend/n/system/auth/login",
                            headers,
                            Map.of("username", ghost, "password", "wrong-password1")),
                    HttpStatus.UNAUTHORIZED,
                    110101);
            final String ip = Objects.requireNonNull(
                    this.jdbc.queryForObject("SELECT ip FROM sys_login_log WHERE username = ?", String.class, ghost));
            if (expected == null) {
                assertThat(ip).isIn("127.0.0.1", "0:0:0:0:0:0:0:1");
            } else {
                assertThat(ip).isEqualTo(expected);
            }
            headers.setBearerAuth(this.adminToken());
            final String code = IntegrationTestSupport.unique("ipdict");
            final ResponseEntity<JsonNode> created = this.exchange(
                    HttpMethod.POST,
                    "/api-backend/system/dict/create",
                    headers,
                    Map.of("name", "可信 IP 测试", "code", code));
            IntegrationTestSupport.assertOk(created);
            await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
                final List<String> operationIps = this.jdbc.queryForList(
                        "SELECT ip FROM sys_operation_log WHERE request_body LIKE ?", String.class, "%" + code + "%");
                assertThat(operationIps).containsExactly(ip);
                assertThat(appender.list.stream()
                                .filter(event -> requestId.equals(
                                        event.getMDCPropertyMap().get("requestId")))
                                .map(ILoggingEvent::getFormattedMessage)
                                .toList())
                        .hasSize(2)
                        .allSatisfy(message -> assertThat(message).contains("ip=" + ip));
            });
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}

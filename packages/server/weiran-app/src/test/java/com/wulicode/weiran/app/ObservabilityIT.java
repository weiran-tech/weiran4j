package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.wulicode.weiran.framework.web.RequestIdFilter;
import com.wulicode.weiran.platform.application.operationlog.AsyncOperationLogRecorder;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.context.LifecycleProperties;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.boot.web.server.Shutdown;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.util.ReflectionTestUtils;

/** 请求号、失败体与优雅停机配置（observability FR-001 / FR-006，admin-foundation FR-001）。 */
class ObservabilityIT extends IntegrationTestSupport {

    @Autowired
    ServerProperties serverProperties;

    @Autowired
    LifecycleProperties lifecycleProperties;

    @Autowired
    AsyncOperationLogRecorder operationLogRecorder;

    private static String requestIdHeader(final ResponseEntity<JsonNode> response) {
        final String value = response.getHeaders().getFirst(RequestIdFilter.HEADER);
        assertThat(value).as("响应头 X-Request-Id").isNotBlank();
        return Objects.requireNonNull(value);
    }

    private static void assertErrorCarriesRequestId(
            final ResponseEntity<JsonNode> response, final HttpStatus status, final int code) {
        IntegrationTestSupport.assertError(response, status, code);
        assertThat(IntegrationTestSupport.body(response).path("requestId").asText())
                .isEqualTo(ObservabilityIT.requestIdHeader(response));
    }

    @Test
    @DisplayName("失败体带 requestId 且与响应头一致：400 / 401 / 403 / 404")
    void errorBodiesCarryRequestId() {
        ObservabilityIT.assertErrorCarriesRequestId(
                this.post("/api-backend/n/system/auth/login", null, Map.of("username", "", "password", "x")),
                HttpStatus.BAD_REQUEST,
                100001);
        ObservabilityIT.assertErrorCarriesRequestId(
                this.get("/api-backend/system/auth/getCurrentUser", null), HttpStatus.UNAUTHORIZED, 100101);

        final String username = IntegrationTestSupport.unique("norole");
        this.create(
                "/api-backend/system/user/create",
                this.adminToken(),
                Map.of("username", username, "nickname", "无角色", "password", "Passw0rd1", "roleIds", List.of()));
        ObservabilityIT.assertErrorCarriesRequestId(
                this.get("/api-backend/system/user/list", this.tokenOf(username, "Passw0rd1")),
                HttpStatus.FORBIDDEN,
                100102);

        ObservabilityIT.assertErrorCarriesRequestId(
                this.get("/api-backend/no-such-endpoint", null), HttpStatus.NOT_FOUND, 100002);
    }

    @Test
    @DisplayName("成功体没有 requestId 键，但响应头有")
    void successBodyHasNoRequestId() {
        final ResponseEntity<JsonNode> response =
                this.get("/api-backend/system/auth/getCurrentUser", this.adminToken());
        IntegrationTestSupport.assertOk(response);
        assertThat(IntegrationTestSupport.body(response).has("requestId")).isFalse();
        assertThat(ObservabilityIT.requestIdHeader(response)).matches("[0-9a-f]{32}");
    }

    @Test
    @DisplayName("合法的入站 X-Request-Id 原样沿用，不合法的重新生成")
    void reusesValidInboundRequestId() {
        final HttpHeaders valid = new HttpHeaders();
        valid.set(RequestIdFilter.HEADER, "gw-123_abc");
        assertThat(ObservabilityIT.requestIdHeader(this.exchange(HttpMethod.GET, "/api-backend/n/health", valid, null)))
                .isEqualTo("gw-123_abc");

        final HttpHeaders invalid = new HttpHeaders();
        invalid.set(RequestIdFilter.HEADER, "bad id!");
        assertThat(ObservabilityIT.requestIdHeader(
                        this.exchange(HttpMethod.GET, "/api-backend/n/health", invalid, null)))
                .matches("[0-9a-f]{32}");
    }

    @Test
    @DisplayName("优雅停机：server.shutdown=graceful，停机阶段 30s，操作日志线程池等待不超过它")
    void gracefulShutdownConfigured() {
        assertThat(this.serverProperties.getShutdown()).isEqualTo(Shutdown.GRACEFUL);
        final Duration phase = this.lifecycleProperties.getTimeoutPerShutdownPhase();
        assertThat(phase).isEqualTo(Duration.ofSeconds(30));
        final ThreadPoolTaskExecutor executor =
                (ThreadPoolTaskExecutor) ReflectionTestUtils.getField(this.operationLogRecorder, "executor");
        assertThat(executor).isNotNull();
        final Object awaitMillis = ReflectionTestUtils.getField(executor, "awaitTerminationMillis");
        assertThat((Long) awaitMillis).isPositive().isLessThanOrEqualTo(phase.toMillis());
    }
}

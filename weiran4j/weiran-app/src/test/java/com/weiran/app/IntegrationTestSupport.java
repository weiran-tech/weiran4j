package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 集成测试基类：真 MySQL 8（Testcontainers）+ 真 Flyway 迁移 + 真 HTTP。
 *
 * <p>所有子类共用同一个 Spring 上下文与同一个容器（静态字段 + 上下文缓存），数据在测试之间共享，
 * 因此每个用例都用 {@link #unique(String)} 生成互不冲突的名字，且不修改 admin 的密码与状态。
 * 本机没有 Docker 时整类跳过（{@code disabledWithoutDocker}）。
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = WeiranApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class IntegrationTestSupport {

    /** 种子管理员账号。 */
    static final String ADMIN = "admin";

    /** 种子管理员初始密码（Flyway 种子里预先算好的 BCrypt）。 */
    static final String ADMIN_PASSWORD = "admin123";

    private static final AtomicLong SEQUENCE = new AtomicLong(System.nanoTime() % 100_000);

    /**
     * 单例容器：不用 {@code @Container}，因为那会在每个测试类结束时停掉容器，而 Spring 缓存的上下文
     * 仍指向旧端口。这里启动一次、整个 JVM 共用，退出时由 Testcontainers 的 Ryuk 回收。
     */
    @ServiceConnection
    @SuppressWarnings("resource")
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4").withDatabaseName("weiran4j");

    static {
        IntegrationTestSupport.MYSQL.start();
    }

    @Autowired
    TestRestTemplate rest;

    @Autowired
    JdbcTemplate jdbc;

    /** 生成本次运行内唯一的名字（只含小写字母、数字、下划线）。 */
    static String unique(final String prefix) {
        return prefix + "_" + IntegrationTestSupport.SEQUENCE.incrementAndGet();
    }

    /** 登录并返回原始响应。 */
    ResponseEntity<JsonNode> login(final String username, final String password) {
        return this.call(HttpMethod.POST, "/api/auth/login", null, Map.of("username", username, "password", password));
    }

    /** 登录并返回令牌，登录失败直接让测试失败。 */
    String tokenOf(final String username, final String password) {
        final ResponseEntity<JsonNode> response = this.login(username, password);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return IntegrationTestSupport.data(response).path("accessToken").asText();
    }

    /** 管理员令牌。 */
    String adminToken() {
        return this.tokenOf(IntegrationTestSupport.ADMIN, IntegrationTestSupport.ADMIN_PASSWORD);
    }

    ResponseEntity<JsonNode> get(final String path, final @Nullable String token) {
        return this.call(HttpMethod.GET, path, token, null);
    }

    ResponseEntity<JsonNode> post(final String path, final @Nullable String token, final Object body) {
        return this.call(HttpMethod.POST, path, token, body);
    }

    ResponseEntity<JsonNode> put(final String path, final @Nullable String token, final Object body) {
        return this.call(HttpMethod.PUT, path, token, body);
    }

    ResponseEntity<JsonNode> delete(final String path, final @Nullable String token) {
        return this.call(HttpMethod.DELETE, path, token, null);
    }

    ResponseEntity<JsonNode> call(
            final HttpMethod method, final String path, final @Nullable String token, final @Nullable Object body) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(
                HttpHeaders.USER_AGENT,
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126.0.0.0 Safari/537.36");
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return this.rest.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    /** 新建资源并返回 ID，失败直接让测试失败。 */
    long create(final String path, final String token, final Object body) {
        final ResponseEntity<JsonNode> response = this.post(path, token, body);
        IntegrationTestSupport.assertOk(response);
        return IntegrationTestSupport.data(response).path("id").asLong();
    }

    static JsonNode body(final ResponseEntity<JsonNode> response) {
        return Objects.requireNonNull(response.getBody(), "响应体为空");
    }

    static JsonNode data(final ResponseEntity<JsonNode> response) {
        return IntegrationTestSupport.body(response).path("data");
    }

    /** 断言成功：HTTP 200 且 code 为数字 0。 */
    static void assertOk(final ResponseEntity<JsonNode> response) {
        assertThat(response.getStatusCode())
                .as(String.valueOf(response.getBody()))
                .isEqualTo(HttpStatus.OK);
        final JsonNode code = IntegrationTestSupport.body(response).path("code");
        assertThat(code.isNumber()).as("code 必须是数字").isTrue();
        assertThat(code.asInt()).isZero();
    }

    /** 断言失败：HTTP 状态与错误码。 */
    static void assertError(final ResponseEntity<JsonNode> response, final HttpStatus status, final int code) {
        assertThat(response.getStatusCode())
                .as(String.valueOf(response.getBody()))
                .isEqualTo(status);
        assertThat(IntegrationTestSupport.body(response).path("code").asInt()).isEqualTo(code);
        assertThat(IntegrationTestSupport.body(response).path("data").isNull()).isTrue();
    }
}

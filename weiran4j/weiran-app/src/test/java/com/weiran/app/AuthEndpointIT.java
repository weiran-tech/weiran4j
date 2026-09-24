package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.weiran.system.domain.port.PasswordHasher;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Objects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * 登录闭环的端到端验证：真起容器、真连库（H2 MySQL 模式）、真发 HTTP。
 *
 * <p>这一层要证明的不是某个类的逻辑，而是「装配起来能用」——自动配置是否被加载、
 * 统一响应是否包成了约定的形状、认证错误是否返回了 401 而不是 400。
 * 这些恰恰是单测覆盖不到、又最容易在重构中静默失效的部分。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthEndpointIT {

    private static final String RAW_PASSWORD = "weiran-123456";

    private static final String LEGACY_PASSWORD = "legacy-654321";

    private static final String LEGACY_KEY = "abc123";

    /** PHP 的 Carbon::toDateTimeString() 落库格式，与 seed 里的 created_at 逐字符一致。 */
    private static final String LEGACY_CREATED_AT = "2019-05-01 08:30:00";

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordHasher passwordHasher;

    @BeforeEach
    void seed() {
        this.jdbcTemplate.execute("DELETE FROM pam_role_account");
        this.jdbcTemplate.execute("DELETE FROM pam_permission_role");
        this.jdbcTemplate.execute("DELETE FROM pam_permission");
        this.jdbcTemplate.execute("DELETE FROM pam_role");
        this.jdbcTemplate.execute("DELETE FROM pam_account");

        final String bcrypt =
                this.passwordHasher.hash(AuthEndpointIT.RAW_PASSWORD).hash();
        this.jdbcTemplate.update("""
                INSERT INTO pam_account (id, username, mobile, email, password, password_key, type,
                                         is_enable, created_at)
                VALUES (1, 'zhangsan', '13800138000', 'zhangsan@example.com', ?, '', 'backend', 1, '2019-05-01 08:30:00')
                """, bcrypt);

        // 历史账号：密码仍是 PHP 时代的 md5(sha1(明文 + 注册时间) + password_key)
        this.jdbcTemplate.update(
                """
                INSERT INTO pam_account (id, username, mobile, email, password, password_key, type,
                                         is_enable, created_at)
                VALUES (2, 'lisi', '13800138001', 'lisi@example.com', ?, ?, 'backend', 1, '2019-05-01 08:30:00')
                """,
                AuthEndpointIT.phpLegacyHash(
                        AuthEndpointIT.LEGACY_PASSWORD, AuthEndpointIT.LEGACY_CREATED_AT, AuthEndpointIT.LEGACY_KEY),
                AuthEndpointIT.LEGACY_KEY);

        this.jdbcTemplate.execute(
                "INSERT INTO pam_role (id, name, title, type, is_enable) VALUES (1, 'editor', '编辑', 'backend', 1)");
        this.jdbcTemplate.execute("INSERT INTO pam_permission (id, name, title, module) "
                + "VALUES (1, 'weiran-system:account.index', '账号列表', 'weiran-system')");
        this.jdbcTemplate.execute("INSERT INTO pam_permission_role (permission_id, role_id) VALUES (1, 1)");
        this.jdbcTemplate.execute("INSERT INTO pam_role_account (account_id, role_id) VALUES (1, 1)");
    }

    @Test
    @DisplayName("登录成功后用返回的令牌可以取到当前账号及其角色权限")
    void loginThenFetchCurrentAccount() {
        final ResponseEntity<JsonNode> login = this.login("zhangsan", AuthEndpointIT.RAW_PASSWORD);

        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        // wuli3 的统一响应：成功码是字符串 "0"，不是数字 0
        assertThat(AuthEndpointIT.body(login).path("code").asText()).isEqualTo("0");

        final String token = AuthEndpointIT.tokenOf(login);
        assertThat(token).isNotBlank();
        assertThat(AuthEndpointIT.body(login).path("data").path("accountType").asText())
                .isEqualTo("backend");

        final ResponseEntity<JsonNode> me = this.me(token);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);

        final JsonNode data = AuthEndpointIT.body(me).path("data");
        assertThat(data.path("accountId").asLong()).isEqualTo(1L);
        assertThat(data.path("displayName").asText()).isEqualTo("zhangsan");
        assertThat(data.path("roles").findValuesAsText("").isEmpty()).isTrue();
        assertThat(data.path("roles").toString()).contains("editor");
        assertThat(data.path("permissions").toString()).contains("weiran-system:account.index");
    }

    @Test
    @DisplayName("手机号与邮箱同样可以作为通行证登录")
    void loginByMobileAndEmail() {
        assertThat(this.login("13800138000", AuthEndpointIT.RAW_PASSWORD).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(this.login("zhangsan@example.com", AuthEndpointIT.RAW_PASSWORD)
                        .getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("PHP 历史哈希可以登录，且登录后被就地迁移为 BCrypt")
    void legacyPasswordLoginTriggersRehash() {
        final String before =
                this.jdbcTemplate.queryForObject("SELECT password FROM pam_account WHERE id = 2", String.class);
        assertThat(before).hasSize(32).doesNotStartWith("$2");

        assertThat(this.login("lisi", AuthEndpointIT.LEGACY_PASSWORD).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        final String after =
                this.jdbcTemplate.queryForObject("SELECT password FROM pam_account WHERE id = 2", String.class);
        assertThat(after).startsWith("$2").hasSize(60);

        // 迁移后仍然能用同一个密码登录 —— 否则这次「迁移」就是把用户锁在了门外
        assertThat(this.login("lisi", AuthEndpointIT.LEGACY_PASSWORD).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("密码错误返回 401，且不泄露账号是否存在")
    void wrongPasswordAndUnknownAccountAreIndistinguishable() {
        final ResponseEntity<JsonNode> wrongPassword = this.login("zhangsan", "wrong-password-123");
        final ResponseEntity<JsonNode> unknownAccount = this.login("nobody", "wrong-password-123");

        assertThat(wrongPassword.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unknownAccount.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(AuthEndpointIT.body(unknownAccount).path("message").asText())
                .isEqualTo(AuthEndpointIT.body(wrongPassword).path("message").asText());
    }

    @Test
    @DisplayName("被禁用账号即使密码正确也拿不到令牌，返回 403")
    void disabledAccountCannotLogin() {
        this.jdbcTemplate.update("UPDATE pam_account SET is_enable = 0, disable_reason = ? WHERE id = 1", "恶意刷单");

        final ResponseEntity<JsonNode> response = this.login("zhangsan", AuthEndpointIT.RAW_PASSWORD);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(AuthEndpointIT.body(response).path("message").asText()).isEqualTo("恶意刷单");
    }

    @Test
    @DisplayName("伪造与缺失的令牌都返回 401")
    void invalidTokenIsRejected() {
        assertThat(this.me("not-a-real-token").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        final ResponseEntity<JsonNode> noHeader = this.restTemplate.exchange(
                this.url("/api/v1/auth/me"), HttpMethod.GET, HttpEntity.EMPTY, JsonNode.class);
        assertThat(noHeader.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("改密后旧令牌立即失效，而不是等到自然过期")
    void tokenIsInvalidatedAfterPasswordChange() {
        final String token = AuthEndpointIT.tokenOf(this.login("zhangsan", AuthEndpointIT.RAW_PASSWORD));
        assertThat(this.me(token).getStatusCode()).isEqualTo(HttpStatus.OK);

        final String newHash = this.passwordHasher.hash("brand-new-password").hash();
        this.jdbcTemplate.update("UPDATE pam_account SET password = ? WHERE id = 1", newHash);

        assertThat(this.me(token).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("入参校验失败返回 400，与认证失败的 401 区分开")
    void validationFailureReturnsBadRequest() {
        final ResponseEntity<JsonNode> response = this.postLogin("{\"passport\":\"\",\"password\":\"short\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    /**
     * 取响应体并断言其存在。
     *
     * <p>不用 AssertJ 的 {@code isNotNull()}：NullAway 不认识断言库的空判定，
     * 后续解引用仍会被判为可空。
     */
    private static JsonNode body(final ResponseEntity<JsonNode> response) {
        return Objects.requireNonNull(response.getBody(), "响应体不应为空");
    }

    private static String tokenOf(final ResponseEntity<JsonNode> response) {
        return AuthEndpointIT.body(response).path("data").path("token").asText();
    }

    private ResponseEntity<JsonNode> login(final String passport, final String password) {
        return this.postLogin(
                "{\"passport\":\"%s\",\"password\":\"%s\",\"guard\":\"backend\"}".formatted(passport, password));
    }

    private ResponseEntity<JsonNode> postLogin(final String body) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return this.restTemplate.exchange(
                this.url("/api/v1/auth/login"), HttpMethod.POST, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private ResponseEntity<JsonNode> me(final String token) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return this.restTemplate.exchange(
                this.url("/api/v1/auth/me"), HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
    }

    private String url(final String path) {
        return "http://localhost:" + this.port + path;
    }

    /**
     * 复刻 PHP 版 {@code DefaultPasswordProvider::genPassword}，用于造历史数据。
     *
     * <p>测试里独立实现一遍而不是复用生产代码：如果两边共用同一份实现，
     * 这个实现整体写错时测试照样绿。
     */
    private static String phpLegacyHash(final String password, final String registeredAt, final String key) {
        return AuthEndpointIT.hex("MD5", AuthEndpointIT.hex("SHA-1", password + registeredAt) + key);
    }

    private static String hex(final String algorithm, final String input) {
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance(algorithm).digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (final NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
}

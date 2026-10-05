package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.framework.auth.AuthCookies;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** 浏览器 Cookie 认证、CSRF 双提交、令牌签发方 / 受众校验、跨实例吊销（契约 §4、§6.1，D-014）。 */
class CookieAuthIT extends IntegrationTestSupport {

    private static final String PASSWORD = "Passw0rd1";

    /** 与 application-test.yml 的 {@code weiran.auth.jwt.secret} 一致，用来手工签发不合规的令牌。 */
    private static final String TEST_SECRET = "integration-test-secret-key-at-least-32-bytes";

    /** 浏览器拿到的两个 Cookie。 */
    private record Session(String token, String csrf) {

        HttpHeaders cookies() {
            final HttpHeaders headers = new HttpHeaders();
            headers.add(
                    HttpHeaders.COOKIE,
                    AuthCookies.TOKEN_COOKIE + "=" + this.token + "; " + AuthCookies.CSRF_COOKIE + "=" + this.csrf);
            return headers;
        }

        HttpHeaders cookiesWithCsrf(final String csrfHeader) {
            final HttpHeaders headers = this.cookies();
            headers.set(AuthCookies.CSRF_HEADER, csrfHeader);
            return headers;
        }
    }

    private String newUser(final String prefix) {
        final String username = IntegrationTestSupport.unique(prefix);
        this.create(
                "/api/users",
                this.adminToken(),
                Map.of(
                        "username",
                        username,
                        "nickname",
                        "原昵称",
                        "password",
                        CookieAuthIT.PASSWORD,
                        "roleIds",
                        List.of()));
        return username;
    }

    private static List<String> setCookies(final ResponseEntity<JsonNode> response) {
        return Optional.ofNullable(response.getHeaders().get(HttpHeaders.SET_COOKIE))
                .orElse(List.of());
    }

    private static String setCookie(final ResponseEntity<JsonNode> response, final String name) {
        return CookieAuthIT.setCookies(response).stream()
                .filter(header -> header.startsWith(name + "="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("缺少 Set-Cookie: " + name));
    }

    private static String cookieValue(final String setCookie) {
        final int start = setCookie.indexOf('=') + 1;
        final int end = setCookie.indexOf(';');
        return setCookie.substring(start, end < 0 ? setCookie.length() : end);
    }

    private Session browserLogin(final String username) {
        final ResponseEntity<JsonNode> response = this.loginWithCookies(username, CookieAuthIT.PASSWORD);
        IntegrationTestSupport.assertOk(response);
        return new Session(
                CookieAuthIT.cookieValue(CookieAuthIT.setCookie(response, AuthCookies.TOKEN_COOKIE)),
                CookieAuthIT.cookieValue(CookieAuthIT.setCookie(response, AuthCookies.CSRF_COOKIE)));
    }

    private String nickname(final Session session) {
        return IntegrationTestSupport.data(this.exchange(HttpMethod.GET, "/api/auth/me", session.cookies(), null))
                .path("nickname")
                .asText();
    }

    /** 用测试密钥手工签发 HS256 令牌（只为构造 iss / aud 不合规的情况）。 */
    private static String sign(final Map<String, Object> claims) throws Exception {
        final ObjectMapper mapper = new ObjectMapper();
        final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        final String header = encoder.encodeToString(mapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
        final String payload = encoder.encodeToString(mapper.writeValueAsBytes(claims));
        final Mac mac = Mac.getInstance("HmacSHA256");
        try {
            mac.init(new SecretKeySpec(CookieAuthIT.TEST_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        } catch (final GeneralSecurityException ex) {
            throw new IllegalStateException(ex);
        }
        final byte[] signature = mac.doFinal((header + "." + payload).getBytes(StandardCharsets.US_ASCII));
        return header + "." + payload + "." + encoder.encodeToString(signature);
    }

    @Test
    @DisplayName("浏览器默认登录：响应体没有 accessToken，下发 HttpOnly 的 weiran_token 与非 HttpOnly 的 weiran_csrf")
    void browserLoginSetsCookies() {
        final String username = this.newUser("cookie");
        final ResponseEntity<JsonNode> response = this.loginWithCookies(username, CookieAuthIT.PASSWORD);

        IntegrationTestSupport.assertOk(response);
        final JsonNode data = IntegrationTestSupport.data(response);
        assertThat(data.has("accessToken")).as("响应体不得出现 accessToken").isFalse();
        assertThat(data.path("tokenType").asText()).isEqualTo("Bearer");
        assertThat(data.path("expiresIn").asLong()).isEqualTo(3600L);
        final long userId = data.path("userId").asLong();
        assertThat(userId).isPositive();

        final String token = CookieAuthIT.setCookie(response, AuthCookies.TOKEN_COOKIE);
        assertThat(token).contains("HttpOnly", "SameSite=Strict", "Path=/api", "Max-Age=3600");
        final String csrf = CookieAuthIT.setCookie(response, AuthCookies.CSRF_COOKIE);
        assertThat(csrf).contains("SameSite=Strict", "Path=/", "Max-Age=3600").doesNotContain("HttpOnly");
        assertThat(CookieAuthIT.cookieValue(csrf)).startsWith(userId + ".");
    }

    @Test
    @DisplayName("只凭 Cookie、不带 Authorization 头即可访问受保护接口")
    void cookieAloneAuthenticates() {
        final Session session = this.browserLogin(this.newUser("cookie"));

        final ResponseEntity<JsonNode> me = this.exchange(HttpMethod.GET, "/api/auth/me", session.cookies(), null);

        IntegrationTestSupport.assertOk(me);
        assertThat(IntegrationTestSupport.data(me).path("nickname").asText()).isEqualTo("原昵称");
    }

    @Test
    @DisplayName("Cookie 认证的写请求：缺 CSRF 头或头值不一致返回 403 / 40302 且资料不变；带正确的头才成功")
    void cookieWritesRequireCsrf() {
        final Session session = this.browserLogin(this.newUser("csrf"));
        final Map<String, Object> profile = Map.of("nickname", "被篡改");

        IntegrationTestSupport.assertError(
                this.exchange(HttpMethod.PUT, "/api/auth/profile", session.cookies(), profile),
                HttpStatus.FORBIDDEN,
                40302);
        IntegrationTestSupport.assertError(
                this.exchange(
                        HttpMethod.PUT, "/api/auth/profile", session.cookiesWithCsrf(session.csrf() + "x"), profile),
                HttpStatus.FORBIDDEN,
                40302);
        assertThat(this.nickname(session)).isEqualTo("原昵称");

        IntegrationTestSupport.assertOk(this.exchange(
                HttpMethod.PUT,
                "/api/auth/profile",
                session.cookiesWithCsrf(session.csrf()),
                Map.of("nickname", "新昵称")));
        assertThat(this.nickname(session)).isEqualTo("新昵称");
    }

    @Test
    @DisplayName("令牌模式登录：响应体带 accessToken 且不写 Cookie；Bearer 认证的写请求不查 CSRF")
    void tokenModeSkipsCookiesAndCsrf() {
        final String username = this.newUser("bearer");
        final ResponseEntity<JsonNode> response = this.login(username, CookieAuthIT.PASSWORD);

        IntegrationTestSupport.assertOk(response);
        assertThat(CookieAuthIT.setCookies(response)).isEmpty();
        final String token =
                IntegrationTestSupport.data(response).path("accessToken").asText();
        assertThat(token).isNotBlank();
        IntegrationTestSupport.assertOk(this.put("/api/auth/profile", token, Map.of("nickname", "脚本改的")));
    }

    @Test
    @DisplayName("登出以 Max-Age=0 清除两个 Cookie")
    void logoutClearsCookies() {
        final Session session = this.browserLogin(this.newUser("logout"));

        final ResponseEntity<JsonNode> response =
                this.exchange(HttpMethod.POST, "/api/auth/logout", session.cookiesWithCsrf(session.csrf()), Map.of());

        IntegrationTestSupport.assertOk(response);
        assertThat(CookieAuthIT.setCookie(response, AuthCookies.TOKEN_COOKIE)).contains("Max-Age=0", "Path=/api");
        assertThat(CookieAuthIT.setCookie(response, AuthCookies.CSRF_COOKIE)).contains("Max-Age=0", "Path=/");
    }

    @Test
    @DisplayName("令牌载荷带 iss / aud；同一密钥签发但 iss 缺失、iss 不符、aud 不符的令牌一律 40100")
    void enforcesIssuerAndAudience() throws Exception {
        final String token = IntegrationTestSupport.data(
                        this.login(IntegrationTestSupport.ADMIN, IntegrationTestSupport.ADMIN_PASSWORD))
                .path("accessToken")
                .asText();
        final JsonNode payload =
                new ObjectMapper().readTree(Base64.getUrlDecoder().decode(token.split("\\.", -1)[1]));
        assertThat(payload.path("iss").asText()).isEqualTo("weiran4j");
        assertThat(payload.path("aud").toString()).contains("weiran4j");

        final long exp = Instant.now().plusSeconds(600).getEpochSecond();
        final Map<String, Object> base =
                new LinkedHashMap<>(Map.of("sub", "1", "username", "admin", "ver", 0, "exp", exp));
        final Map<String, Object> noIssuer = new LinkedHashMap<>(base);
        noIssuer.put("aud", "weiran4j");
        final Map<String, Object> otherIssuer = new LinkedHashMap<>(noIssuer);
        otherIssuer.put("iss", "other");
        final Map<String, Object> otherAudience = new LinkedHashMap<>(base);
        otherAudience.put("iss", "weiran4j");
        otherAudience.put("aud", "other");
        for (final Map<String, Object> claims : List.of(noIssuer, otherIssuer, otherAudience)) {
            IntegrationTestSupport.assertError(
                    this.get("/api/auth/me", CookieAuthIT.sign(claims)), HttpStatus.UNAUTHORIZED, 40100);
        }
    }

    @Test
    @DisplayName("绕过应用服务直接改库吊销（模拟另一个实例）：令牌版本加一或禁用后，下一次请求立即 40100")
    void revocationBypassesCache() {
        final String bumped = this.newUser("revoke");
        final String bumpedToken = this.tokenOf(bumped, CookieAuthIT.PASSWORD);
        IntegrationTestSupport.assertOk(this.get("/api/auth/me", bumpedToken));
        this.jdbc.update("UPDATE sys_user SET token_version = token_version + 1 WHERE username = ?", bumped);
        IntegrationTestSupport.assertError(this.get("/api/auth/me", bumpedToken), HttpStatus.UNAUTHORIZED, 40100);

        final String disabled = this.newUser("disable");
        final String disabledToken = this.tokenOf(disabled, CookieAuthIT.PASSWORD);
        IntegrationTestSupport.assertOk(this.get("/api/auth/me", disabledToken));
        this.jdbc.update("UPDATE sys_user SET status = 'disabled' WHERE username = ?", disabled);
        IntegrationTestSupport.assertError(this.get("/api/auth/me", disabledToken), HttpStatus.UNAUTHORIZED, 40100);
    }
}

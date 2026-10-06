package com.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.weiran.framework.auth.AuthCookies;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.MountableFile;

/**
 * 外部身份登录端到端（external-identity FR-001 … FR-010）：真实 Keycloak（OIDC）+ 进程内模拟 CAS。
 *
 * <p>本上下文关闭了密码登录（只有内置超管能用密码），一并覆盖 FR-008。浏览器的跳转由测试手工跟随：
 * 提供方回调的地址是配置的公开地址 {@code http://localhost:5373}，测试把它换成本服务的随机端口再请求。
 */
class ExternalLoginIT extends IntegrationTestSupport {

    private static final String PUBLIC_BASE = "http://localhost:5373";

    private static final String REALM = "weiran-test";

    private static final String ALICE_SUB = "11111111-1111-1111-1111-111111111111";

    @SuppressWarnings("resource")
    static final GenericContainer<?> KEYCLOAK = new GenericContainer<>("quay.io/keycloak/keycloak:26.0")
            .withExposedPorts(8080)
            .withEnv("KC_BOOTSTRAP_ADMIN_USERNAME", "admin")
            .withEnv("KC_BOOTSTRAP_ADMIN_PASSWORD", "admin")
            .withCopyFileToContainer(
                    MountableFile.forClasspathResource("keycloak/weiran-test-realm.json"),
                    "/opt/keycloak/data/import/weiran-test-realm.json")
            .withCommand("start-dev", "--import-realm")
            .waitingFor(Wait.forHttp("/realms/" + REALM + "/.well-known/openid-configuration")
                    .forPort(8080)
                    .withStartupTimeout(Duration.ofMinutes(4)));

    /** 模拟 CAS：ticket 形如 {@code ST-ok-<user>} 验票成功，其余失败；记录收到的验票请求。 */
    static final HttpServer CAS;

    static final List<String> CAS_REQUESTS = new ArrayList<>();

    static {
        KEYCLOAK.start();
        try {
            CAS = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        } catch (final IOException ex) {
            throw new IllegalStateException(ex);
        }
        CAS.createContext("/cas/p3/serviceValidate", exchange -> {
            final String query = exchange.getRequestURI().getRawQuery();
            CAS_REQUESTS.add(query);
            final String ticket = ExternalLoginIT.queryParam(query, "ticket");
            final String body = ticket != null && ticket.startsWith("ST-ok-")
                    ? "{\"serviceResponse\":{\"authenticationSuccess\":{\"user\":\"" + ticket.substring(6)
                            + "\",\"attributes\":{\"displayName\":[\"CAS " + ticket.substring(6) + "\"]}}}}"
                    : "{\"serviceResponse\":{\"authenticationFailure\":{\"code\":\"INVALID_TICKET\"}}}";
            final byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        });
        CAS.start();
    }

    @DynamicPropertySource
    static void providers(final DynamicPropertyRegistry registry) {
        final String issuer = "http://localhost:" + KEYCLOAK.getMappedPort(8080) + "/realms/" + REALM;
        final String cas = "http://" + InetAddress.getLoopbackAddress().getHostAddress() + ":"
                + CAS.getAddress().getPort() + "/cas";
        registry.add("weiran.auth.public-base-url", () -> PUBLIC_BASE);
        registry.add("weiran.auth.password-login.enabled", () -> "false");
        for (final String id : List.of("kc", "kc-auto")) {
            final String prefix = "weiran.auth.providers." + id + ".";
            registry.add(prefix + "type", () -> "oidc");
            registry.add(prefix + "name", () -> "Keycloak " + id);
            registry.add(prefix + "issuer", () -> issuer);
            registry.add(prefix + "client-id", () -> "weiran4j");
            registry.add(prefix + "client-secret", () -> "weiran4j-test-secret");
        }
        registry.add("weiran.auth.providers.kc-auto.auto-provision", () -> "true");
        registry.add("weiran.auth.providers.kc-auto.default-roles", () -> "sso_viewer");
        registry.add("weiran.auth.providers.cas.type", () -> "cas");
        registry.add("weiran.auth.providers.cas.name", () -> "统一认证");
        registry.add("weiran.auth.providers.cas.server-url", () -> cas);
    }

    @LocalServerPort
    int port;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /** 一次浏览器会话：本服务的 Cookie 手工维护，提供方的 Cookie 交给 CookieManager。 */
    private final class Browser {

        /** Keycloak 在 http 下也给 Cookie 打 Secure，JDK 的 CookieManager 会丢掉它们；这里手工维护。 */
        private final HttpClient idp = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();

        private final Map<String, String> idpCookies = new LinkedHashMap<>();

        private HttpResponse<String> idpSend(final HttpRequest.Builder request)
                throws IOException, InterruptedException {
            if (!this.idpCookies.isEmpty()) {
                final StringBuilder cookie = new StringBuilder();
                this.idpCookies.forEach((k, v) -> cookie.append(cookie.length() == 0 ? "" : "; ")
                        .append(k)
                        .append('=')
                        .append(v));
                request.header("Cookie", cookie.toString());
            }
            final HttpResponse<String> response = this.idp.send(request.build(), HttpResponse.BodyHandlers.ofString());
            for (final String header : response.headers().allValues("Set-Cookie")) {
                final int semi = header.indexOf(';');
                final String pair = semi < 0 ? header : header.substring(0, semi);
                final int eq = pair.indexOf('=');
                if (eq > 0) {
                    this.idpCookies.put(pair.substring(0, eq), pair.substring(eq + 1));
                }
            }
            return response;
        }

        private final Map<String, String> appCookies = new LinkedHashMap<>();

        /** 请求本服务，记录 Set-Cookie。 */
        HttpResponse<String> app(final String pathAndQuery) throws IOException, InterruptedException {
            final HttpRequest.Builder request = HttpRequest.newBuilder(
                            URI.create("http://localhost:" + ExternalLoginIT.this.port + pathAndQuery))
                    .GET();
            if (!this.appCookies.isEmpty()) {
                final StringBuilder cookie = new StringBuilder();
                this.appCookies.forEach((k, v) -> cookie.append(cookie.length() == 0 ? "" : "; ")
                        .append(k)
                        .append('=')
                        .append(v));
                request.header("Cookie", cookie.toString());
            }
            final HttpResponse<String> response =
                    HttpClient.newHttpClient().send(request.build(), HttpResponse.BodyHandlers.ofString());
            for (final String header : response.headers().allValues("Set-Cookie")) {
                final String pair = header.substring(0, header.indexOf(';'));
                final String name = pair.substring(0, pair.indexOf('='));
                final String value = pair.substring(pair.indexOf('=') + 1);
                if (header.contains("Max-Age=0")) {
                    this.appCookies.remove(name);
                } else {
                    this.appCookies.put(name, value);
                }
            }
            return response;
        }

        /** 用 Keycloak 账号走完 authorize → 登录表单 → callback，返回回调的 Location。 */
        String keycloak(final String provider, final String mode, final String username, final String password)
                throws IOException, InterruptedException {
            final HttpResponse<String> authorize =
                    this.app("/api/auth/sso/" + provider + "/authorize?redirect=%2Fsystem%2Fusers&mode=" + mode);
            assertThat(authorize.statusCode()).isEqualTo(302);
            final String authUrl = authorize.headers().firstValue("Location").orElseThrow();
            if (!authUrl.startsWith("http://localhost:" + KEYCLOAK.getMappedPort(8080))) {
                return authUrl;
            }
            final HttpResponse<String> loginPage =
                    this.idpSend(HttpRequest.newBuilder(URI.create(authUrl)).GET());
            final Matcher action = Pattern.compile(
                            "id=\"kc-form-login\"[^>]*action=\"([^\"]+)\"|action=\"([^\"]+)\"[^>]*id=\"kc-form-login\"")
                    .matcher(loginPage.body());
            assertThat(action.find()).as("Keycloak 登录表单").isTrue();
            final String formUrl = (action.group(1) != null ? action.group(1) : action.group(2)).replace("&amp;", "&");
            final String form = "username=" + URLEncoder.encode(username, StandardCharsets.UTF_8) + "&password="
                    + URLEncoder.encode(password, StandardCharsets.UTF_8) + "&credentialId=";
            final HttpResponse<String> submitted = this.idpSend(HttpRequest.newBuilder(URI.create(formUrl))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form)));
            assertThat(submitted.statusCode())
                    .as("Keycloak 登录后应 302 回调："
                            + submitted
                                    .body()
                                    .substring(0, Math.min(300, submitted.body().length())))
                    .isEqualTo(302);
            return this.callback(submitted.headers().firstValue("Location").orElseThrow());
        }

        /** 把提供方给的回调地址（公开地址）换成本服务地址并请求，返回本服务回调的 Location。 */
        String callback(final String publicCallback) throws IOException, InterruptedException {
            assertThat(publicCallback).startsWith(PUBLIC_BASE + "/api/auth/sso/");
            final HttpResponse<String> response = this.app(publicCallback.substring(PUBLIC_BASE.length()));
            assertThat(response.statusCode()).isEqualTo(302);
            return response.headers().firstValue("Location").orElseThrow();
        }

        JsonNode me() throws IOException, InterruptedException {
            return ExternalLoginIT.this.objectMapper.readTree(
                    this.app("/api/auth/me").body());
        }

        HttpHeaders authHeaders() {
            final HttpHeaders headers = new HttpHeaders();
            final StringBuilder cookie = new StringBuilder();
            this.appCookies.forEach((k, v) -> cookie.append(cookie.length() == 0 ? "" : "; ")
                    .append(k)
                    .append('=')
                    .append(v));
            headers.add(HttpHeaders.COOKIE, cookie.toString());
            headers.add(AuthCookies.CSRF_HEADER, Objects.requireNonNull(this.appCookies.get(AuthCookies.CSRF_COOKIE)));
            return headers;
        }
    }

    private static @Nullable String queryParam(final @Nullable String query, final String name) {
        if (query == null) {
            return null;
        }
        for (final String pair : query.split("&", -1)) {
            final int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equals(name)) {
                return URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private long createLocalUser(final String username) {
        return this.create(
                "/api/users",
                this.adminToken(),
                Map.of(
                        "username",
                        username,
                        "nickname",
                        "本地" + username,
                        "password",
                        "Passw0rd1",
                        "roleIds",
                        List.of()));
    }

    @Test
    @DisplayName("providers 公开返回三个提供方与 passwordLoginEnabled=false，不含任何密钥与地址")
    void listsProviders() {
        final ResponseEntity<JsonNode> response = this.get("/api/auth/providers", null);
        IntegrationTestSupport.assertOk(response);
        final JsonNode data = IntegrationTestSupport.data(response);
        assertThat(data.path("passwordLoginEnabled").asBoolean(true)).isFalse();
        assertThat(data.path("providers").findValuesAsText("id")).containsExactly("cas", "kc", "kc-auto");
        assertThat(data.toString()).doesNotContain("secret").doesNotContain("http");
    }

    @Test
    @DisplayName("OIDC：已绑定的 Keycloak 用户登录成功，令牌带 idp；登出返回 Keycloak 的登出地址；密码登录关闭但内置超管仍可用")
    void oidcLoginForBoundUser() throws Exception {
        final String username = IntegrationTestSupport.unique("alice");
        final long userId = this.createLocalUser(username);
        IntegrationTestSupport.assertOk(this.post(
                "/api/users/" + userId + "/identities",
                this.adminToken(),
                Map.of("provider", "kc", "externalId", ALICE_SUB)));

        final Browser browser = new Browser();
        assertThat(browser.keycloak("kc", "login", "alice", "alice-pass")).isEqualTo("/system/users");
        assertThat(browser.appCookies)
                .containsKeys(AuthCookies.TOKEN_COOKIE, AuthCookies.CSRF_COOKIE)
                .doesNotContainKey(AuthCookies.SSO_COOKIE);
        final JsonNode me = browser.me();
        assertThat(me.path("data").path("username").asText()).isEqualTo(username);
        assertThat(me.path("data").path("hasPassword").asBoolean()).isTrue();
        final String jwt = Objects.requireNonNull(browser.appCookies.get(AuthCookies.TOKEN_COOKIE));
        assertThat(new String(Base64.getUrlDecoder().decode(jwt.split("\\.", -1)[1]), StandardCharsets.UTF_8))
                .contains("\"idp\":\"kc\"");

        // 本上下文关闭了密码登录：普通用户 40304（不论密码对错），内置超管照常
        IntegrationTestSupport.assertError(this.login(username, "Passw0rd1"), HttpStatus.FORBIDDEN, 40304);
        IntegrationTestSupport.assertOk(
                this.login(IntegrationTestSupport.ADMIN, IntegrationTestSupport.ADMIN_PASSWORD));

        final ResponseEntity<JsonNode> logout =
                this.exchange(HttpMethod.POST, "/api/auth/logout", browser.authHeaders(), Map.of());
        IntegrationTestSupport.assertOk(logout);
        assertThat(IntegrationTestSupport.data(logout).path("ssoLogoutUrl").asText())
                .contains("/realms/" + REALM + "/protocol/openid-connect/logout")
                .contains("post_logout_redirect_uri="
                        + URLEncoder.encode(PUBLIC_BASE + "/login", StandardCharsets.UTF_8));
        final ResponseEntity<JsonNode> adminLogout =
                this.exchange(HttpMethod.POST, "/api/auth/logout", ExternalLoginIT.bearer(this.adminToken()), Map.of());
        assertThat(IntegrationTestSupport.data(adminLogout).path("ssoLogoutUrl").isNull())
                .isTrue();

        final Integer success = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_login_log WHERE user_id = ? AND status = 'success' AND message LIKE '%kc%'",
                Integer.class, userId);
        assertThat(success).isPositive();
    }

    @Test
    @DisplayName("OIDC：未绑定且未开启自动开通 40303；篡改 state 40102 且不下发认证 Cookie")
    void oidcRejectsUnboundAndTampered() throws Exception {
        assertThat(new Browser().keycloak("kc", "login", "bob", "bob-pass")).isEqualTo("/login?ssoError=40303");

        final Browser browser = new Browser();
        final HttpResponse<String> authorize = browser.app("/api/auth/sso/kc/authorize?redirect=%2F");
        final String state = ExternalLoginIT.queryParam(
                URI.create(authorize.headers().firstValue("Location").orElseThrow())
                        .getRawQuery(),
                "state");
        assertThat(state).isNotBlank();
        assertThat(browser.callback(PUBLIC_BASE + "/api/auth/sso/kc/callback?code=x&state=forged"))
                .isEqualTo("/login?ssoError=40102");
        assertThat(browser.appCookies).doesNotContainKey(AuthCookies.TOKEN_COOKIE);
    }

    @Test
    @DisplayName("OIDC 自动开通：第一次登录建出没有本地密码、带默认角色的用户，第二次命中同一用户")
    void oidcAutoProvisions() throws Exception {
        this.create("/api/roles", this.adminToken(), Map.of("name", "SSO 访客", "code", "sso_viewer"));
        final Browser first = new Browser();
        assertThat(first.keycloak("kc-auto", "login", "carol", "carol-pass")).isEqualTo("/system/users");
        final JsonNode me = first.me().path("data");
        assertThat(me.path("username").asText()).isEqualTo("carol");
        assertThat(me.path("hasPassword").asBoolean(true)).isFalse();
        assertThat(me.path("roles").toString()).contains("sso_viewer");

        final Browser second = new Browser();
        second.keycloak("kc-auto", "login", "carol", "carol-pass");
        assertThat(second.me().path("data").path("id").asLong())
                .isEqualTo(me.path("id").asLong());

        // 没有本地密码：本人不能解绑唯一的外部身份（防锁死）
        final ResponseEntity<JsonNode> mine =
                this.exchange(HttpMethod.GET, "/api/auth/identities", second.authHeaders(), null);
        final long identityId =
                IntegrationTestSupport.data(mine).get(0).path("id").asLong();
        IntegrationTestSupport.assertError(
                this.exchange(HttpMethod.DELETE, "/api/auth/identities/" + identityId, second.authHeaders(), null),
                HttpStatus.CONFLICT,
                40901);
    }

    @Test
    @DisplayName("CAS：模拟 CAS 验票成功则登录（service 与跳转时一致）；验票失败 40102 并写失败日志")
    void casLogin() throws Exception {
        final String username = IntegrationTestSupport.unique("casuser");
        final long userId = this.createLocalUser(username);
        IntegrationTestSupport.assertOk(this.post(
                "/api/users/" + userId + "/identities",
                this.adminToken(),
                Map.of("provider", "cas", "externalId", username)));

        final Browser browser = new Browser();
        final String authorize = browser.app("/api/auth/sso/cas/authorize?redirect=%2Fdashboard")
                .headers()
                .firstValue("Location")
                .orElseThrow();
        final String service = ExternalLoginIT.queryParam(URI.create(authorize).getRawQuery(), "service");
        assertThat(service).startsWith(PUBLIC_BASE + "/api/auth/sso/cas/callback?state=");
        assertThat(browser.callback(service + "&ticket=ST-ok-" + username)).isEqualTo("/dashboard");
        assertThat(browser.me().path("data").path("id").asLong()).isEqualTo(userId);
        assertThat(ExternalLoginIT.queryParam(CAS_REQUESTS.get(CAS_REQUESTS.size() - 1), "service"))
                .isEqualTo(service);

        final Browser failed = new Browser();
        final String failedAuthorize = failed.app("/api/auth/sso/cas/authorize")
                .headers()
                .firstValue("Location")
                .orElseThrow();
        final String failedService =
                ExternalLoginIT.queryParam(URI.create(failedAuthorize).getRawQuery(), "service");
        assertThat(failed.callback(failedService + "&ticket=ST-bad")).isEqualTo("/login?ssoError=40102");
        final Integer fails = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_login_log WHERE status = 'fail' AND message LIKE '%cas%' AND message NOT LIKE '%ST-%'",
                Integer.class);
        assertThat(fails).isPositive();
    }

    @Test
    @DisplayName("本人绑定：已登录用户以 bind 模式完成 CAS 登录后，该外部身份绑定到自己；已绑给别人时 40901")
    void bindsOwnIdentity() throws Exception {
        final String username = IntegrationTestSupport.unique("binder");
        final long userId = this.createLocalUser(username);
        final String other = IntegrationTestSupport.unique("other");
        final long otherId = this.createLocalUser(other);
        IntegrationTestSupport.assertOk(this.post(
                "/api/users/" + otherId + "/identities",
                this.adminToken(),
                Map.of("provider", "cas", "externalId", other)));
        // 普通用户不能用密码登录（本上下文关闭了），先用 CAS 登录一个已绑定的身份
        IntegrationTestSupport.assertOk(this.post(
                "/api/users/" + userId + "/identities",
                this.adminToken(),
                Map.of("provider", "cas", "externalId", username)));
        final Browser browser = new Browser();
        browser.callback(ExternalLoginIT.queryParam(
                        URI.create(browser.app("/api/auth/sso/cas/authorize")
                                        .headers()
                                        .firstValue("Location")
                                        .orElseThrow())
                                .getRawQuery(),
                        "service")
                + "&ticket=ST-ok-" + username);

        final String newId = IntegrationTestSupport.unique("ext");
        final String bindService = ExternalLoginIT.queryParam(
                URI.create(browser.app("/api/auth/sso/cas/authorize?mode=bind")
                                .headers()
                                .firstValue("Location")
                                .orElseThrow())
                        .getRawQuery(),
                "service");
        assertThat(browser.callback(bindService + "&ticket=ST-ok-" + newId)).isEqualTo("/profile?bound=cas");
        final ResponseEntity<JsonNode> mine =
                this.exchange(HttpMethod.GET, "/api/auth/identities", browser.authHeaders(), null);
        assertThat(IntegrationTestSupport.data(mine).findValuesAsText("externalId"))
                .contains(username, newId);
        assertThat(browser.me().path("data").path("id").asLong())
                .as("绑定不改变当前会话")
                .isEqualTo(userId);

        final String conflictService = ExternalLoginIT.queryParam(
                URI.create(browser.app("/api/auth/sso/cas/authorize?mode=bind")
                                .headers()
                                .firstValue("Location")
                                .orElseThrow())
                        .getRawQuery(),
                "service");
        assertThat(browser.callback(conflictService + "&ticket=ST-ok-" + other)).isEqualTo("/profile?ssoError=40901");
    }

    @Test
    @DisplayName("管理员接口：无权限 40300；同一外部身份重复绑定 40901；删除用户连带删除绑定")
    void adminIdentityEndpoints() throws Exception {
        final String username = IntegrationTestSupport.unique("victim");
        final long userId = this.createLocalUser(username);
        IntegrationTestSupport.assertOk(this.post(
                "/api/users/" + userId + "/identities",
                this.adminToken(),
                Map.of("provider", "cas", "externalId", username)));
        IntegrationTestSupport.assertError(
                this.post(
                        "/api/users/" + userId + "/identities",
                        this.adminToken(),
                        Map.of("provider", "cas", "externalId", username)),
                HttpStatus.CONFLICT,
                40901);
        IntegrationTestSupport.assertError(
                this.post(
                        "/api/users/" + userId + "/identities",
                        this.adminToken(),
                        Map.of("provider", "nope", "externalId", "x")),
                HttpStatus.BAD_REQUEST,
                40000);

        // 无权限用户（经 CAS 登录，没有任何角色）
        final Browser browser = new Browser();
        browser.callback(ExternalLoginIT.queryParam(
                        URI.create(browser.app("/api/auth/sso/cas/authorize")
                                        .headers()
                                        .firstValue("Location")
                                        .orElseThrow())
                                .getRawQuery(),
                        "service")
                + "&ticket=ST-ok-" + username);
        IntegrationTestSupport.assertError(
                this.exchange(HttpMethod.GET, "/api/users/" + userId + "/identities", browser.authHeaders(), null),
                HttpStatus.FORBIDDEN,
                40300);

        IntegrationTestSupport.assertOk(this.delete("/api/users/" + userId, this.adminToken()));
        final Integer left = this.jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys_user_identity WHERE user_id = ?", Integer.class, userId);
        assertThat(left).isZero();
    }

    private static HttpHeaders bearer(final String token) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }
}

package com.weiran.framework.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.OptionalLong;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

class AuthCookiesTest {

    @Test
    @DisplayName("签发两个 Cookie：令牌 HttpOnly + Path=/api，CSRF 非 HttpOnly + Path=/，都是 SameSite=Strict 且 Max-Age 等于 TTL")
    void issuesCookiesWithContractAttributes() {
        final List<ResponseCookie> cookies =
                new AuthCookies(new AuthCookieProperties(true)).issue("jwt", Duration.ofHours(12), 7L);
        assertThat(cookies).hasSize(2);
        final ResponseCookie token = cookies.get(0);
        final ResponseCookie csrf = cookies.get(1);
        assertThat(token.getName()).isEqualTo(AuthCookies.TOKEN_COOKIE);
        assertThat(token.getValue()).isEqualTo("jwt");
        assertThat(token.isHttpOnly()).isTrue();
        assertThat(token.getPath()).isEqualTo("/api");
        assertThat(token.getSameSite()).isEqualTo("Strict");
        assertThat(token.isSecure()).isTrue();
        assertThat(token.getMaxAge()).isEqualTo(Duration.ofHours(12));
        assertThat(csrf.getName()).isEqualTo(AuthCookies.CSRF_COOKIE);
        assertThat(csrf.isHttpOnly()).isFalse();
        assertThat(csrf.getPath()).isEqualTo("/");
        assertThat(csrf.getSameSite()).isEqualTo("Strict");
        assertThat(csrf.getValue()).matches("7\\.[A-Za-z0-9_-]{43}");
        assertThat(AuthCookies.csrfUserId(csrf.getValue())).hasValue(7L);
    }

    @Test
    @DisplayName("每次签发的 CSRF 随机串不同；Secure 跟随配置")
    void randomizesCsrfAndHonoursSecureFlag() {
        final AuthCookies cookies = new AuthCookies(new AuthCookieProperties(false));
        final String first =
                cookies.issue("a", Duration.ofMinutes(1), 1L).get(1).getValue();
        final String second =
                cookies.issue("a", Duration.ofMinutes(1), 1L).get(1).getValue();
        assertThat(first).isNotEqualTo(second);
        assertThat(cookies.issue("a", Duration.ofMinutes(1), 1L)).noneMatch(ResponseCookie::isSecure);
    }

    @Test
    @DisplayName("清除时两个 Cookie 都是 Max-Age=0，路径与签发时一致")
    void clearsBothCookies() {
        final List<ResponseCookie> cleared = new AuthCookies(new AuthCookieProperties(true)).clear();
        assertThat(cleared)
                .extracting(ResponseCookie::getName)
                .containsExactly(AuthCookies.TOKEN_COOKIE, AuthCookies.CSRF_COOKIE);
        assertThat(cleared).allMatch(cookie -> cookie.getMaxAge().isZero());
        assertThat(cleared).extracting(ResponseCookie::getPath).containsExactly("/api", "/");
    }

    @Test
    @DisplayName("CSRF 值的用户 ID 解析：格式不对一律为空")
    void parsesCsrfUserId() {
        assertThat(AuthCookies.csrfUserId("12.x")).hasValue(12L);
        assertThat(AuthCookies.csrfUserId(null)).isEqualTo(OptionalLong.empty());
        assertThat(AuthCookies.csrfUserId("abc")).isEmpty();
        assertThat(AuthCookies.csrfUserId(".x")).isEmpty();
        assertThat(AuthCookies.csrfUserId("12.")).isEmpty();
        assertThat(AuthCookies.csrfUserId("0.x")).isEmpty();
        assertThat(AuthCookies.csrfUserId("a.x")).isEmpty();
    }
}

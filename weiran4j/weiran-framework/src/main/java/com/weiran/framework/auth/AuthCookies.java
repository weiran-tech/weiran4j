package com.weiran.framework.auth;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.OptionalLong;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ResponseCookie;

/**
 * 浏览器认证 Cookie 的唯一定义处：名称、属性、生成与清除（契约 §4）。
 *
 * <ul>
 *   <li>{@value #TOKEN_COOKIE}：访问令牌，{@code HttpOnly; SameSite=Strict; Path=/api}，页面脚本读不到；
 *   <li>{@value #CSRF_COOKIE}：双提交 CSRF 值 {@code <userId>.<随机串>}，{@code SameSite=Strict; Path=/}，
 *       前端读它判断登录态并回填到 {@value #CSRF_HEADER} 请求头。它不是凭据，单独拿到无法通过认证。
 * </ul>
 *
 * <p>签发由基座的登录接口调用 {@link #issue}，校验由 {@link AuthInterceptor} 完成——
 * 两边共用这里的常量，名称只有一处来源。
 */
public class AuthCookies {

    /** 访问令牌 Cookie。 */
    public static final String TOKEN_COOKIE = "weiran_token";

    /** CSRF 双提交 Cookie。 */
    public static final String CSRF_COOKIE = "weiran_csrf";

    /** 携带 CSRF 值的请求头。 */
    public static final String CSRF_HEADER = "X-CSRF-Token";

    /** 外部登录流程状态 Cookie（签名后的 state / nonce / PKCE verifier / redirect，D-015）。 */
    public static final String SSO_COOKIE = "weiran_sso";

    /** 流程 Cookie 只在 authorize 与 callback 之间用。 */
    public static final String SSO_PATH = "/api/auth/sso";

    /** 流程 Cookie 有效期：IdP 登录页上停留超过 10 分钟就重新发起。 */
    public static final Duration SSO_TTL = Duration.ofMinutes(10);

    /** 登录时选择令牌交付方式的请求头。 */
    public static final String AUTH_MODE_HEADER = "X-Auth-Mode";

    /** {@link #AUTH_MODE_HEADER} 的取值：令牌放进响应体、不写 Cookie（非浏览器调用方）。 */
    public static final String AUTH_MODE_TOKEN = "token";

    private static final String TOKEN_PATH = "/api";

    private static final String CSRF_PATH = "/";

    private static final String SAME_SITE = "Strict";

    private static final int CSRF_RANDOM_BYTES = 32;

    private static final char CSRF_SEPARATOR = '.';

    private final SecureRandom random = new SecureRandom();

    private final boolean secure;

    /** 构造工具。 */
    public AuthCookies(final AuthCookieProperties properties) {
        this.secure = properties.secure();
    }

    /**
     * 登录成功后下发的两个 Cookie。
     *
     * @param token 访问令牌
     * @param ttl 令牌有效期，两个 Cookie 的 {@code Max-Age} 与之一致
     * @param userId 当前用户 ID，写进 CSRF 值的前缀，校验时与认证出的用户比对
     */
    public List<ResponseCookie> issue(final String token, final Duration ttl, final long userId) {
        final byte[] bytes = new byte[AuthCookies.CSRF_RANDOM_BYTES];
        this.random.nextBytes(bytes);
        final String csrf = userId
                + String.valueOf(AuthCookies.CSRF_SEPARATOR)
                + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return List.of(
                this.cookie(AuthCookies.TOKEN_COOKIE, token, AuthCookies.TOKEN_PATH, true, ttl),
                this.cookie(AuthCookies.CSRF_COOKIE, csrf, AuthCookies.CSRF_PATH, false, ttl));
    }

    /** 登出时清除两个 Cookie（{@code Max-Age=0}，路径与下发时一致）。 */
    public List<ResponseCookie> clear() {
        return List.of(
                this.cookie(AuthCookies.TOKEN_COOKIE, "", AuthCookies.TOKEN_PATH, true, Duration.ZERO),
                this.cookie(AuthCookies.CSRF_COOKIE, "", AuthCookies.CSRF_PATH, false, Duration.ZERO));
    }

    /**
     * 外部登录流程 Cookie：HttpOnly、{@code SameSite=Lax}、只发往 {@value #SSO_PATH}。
     *
     * <p>必须是 Lax：IdP 回调是跨站发起的顶级导航，Strict Cookie 不会被带上——认证 Cookie 在回调时同样带不上，
     * 所以绑定模式的当前用户也存在这个（已签名的）值里。
     */
    public ResponseCookie ssoState(final String signedValue) {
        return ResponseCookie.from(AuthCookies.SSO_COOKIE, signedValue)
                .path(AuthCookies.SSO_PATH)
                .httpOnly(true)
                .secure(this.secure)
                .sameSite("Lax")
                .maxAge(AuthCookies.SSO_TTL)
                .build();
    }

    /** 清除外部登录流程 Cookie（回调处理完，无论成败）。 */
    public ResponseCookie clearSsoState() {
        return ResponseCookie.from(AuthCookies.SSO_COOKIE, "")
                .path(AuthCookies.SSO_PATH)
                .httpOnly(true)
                .secure(this.secure)
                .sameSite("Lax")
                .maxAge(Duration.ZERO)
                .build();
    }

    /** 解析 CSRF 值里的用户 ID；格式不对返回空。 */
    public static OptionalLong csrfUserId(final @Nullable String value) {
        if (value == null) {
            return OptionalLong.empty();
        }
        final int dot = value.indexOf(AuthCookies.CSRF_SEPARATOR);
        if (dot <= 0 || dot == value.length() - 1) {
            return OptionalLong.empty();
        }
        try {
            final long id = Long.parseLong(value.substring(0, dot));
            return id > 0 ? OptionalLong.of(id) : OptionalLong.empty();
        } catch (final NumberFormatException ex) {
            return OptionalLong.empty();
        }
    }

    private ResponseCookie cookie(
            final String name, final String value, final String path, final boolean httpOnly, final Duration maxAge) {
        return ResponseCookie.from(name, value)
                .path(path)
                .httpOnly(httpOnly)
                .secure(this.secure)
                .sameSite(AuthCookies.SAME_SITE)
                .maxAge(maxAge)
                .build();
    }
}

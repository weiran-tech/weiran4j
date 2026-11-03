package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.AuthCookies;
import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.auth.PublicApi;
import com.wulicode.weiran.system.api.auth.ExternalLoginCandidate;
import com.wulicode.weiran.system.api.auth.ExternalLoginService;
import com.wulicode.weiran.system.api.auth.LoginResult;
import com.wulicode.weiran.system.api.auth.SsoRedirect;
import com.wulicode.weiran.system.application.auth.MfaLoginApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 外部身份登录的两次浏览器整页导航：authorize（跳去提供方）与 callback（提供方跳回来），契约 §6.1、D-015。
 *
 * <p>两个方法都返回 {@code void} 并直接写 302：它们不是 JSON 接口，统一响应包络不适用。
 * 流程状态在签名的 {@value AuthCookies#SSO_COOKIE} Cookie 里；令牌只通过 HttpOnly Cookie 交付，不出现在任何 URL 里。
 */
@RestController
public class SsoController {

    private final ExternalLoginService externalLoginService;

    private final AuthCookies authCookies;

    /** 构造控制器。 */
    private final MfaLoginApplicationService mfaLoginService;

    public SsoController(
            final ExternalLoginService externalLoginService,
            final AuthCookies authCookies,
            final MfaLoginApplicationService mfaLoginService) {
        this.externalLoginService = externalLoginService;
        this.authCookies = authCookies;
        this.mfaLoginService = mfaLoginService;
    }

    /** 发起外部登录。 */
    @PublicApi
    @GetMapping("/api-backend/n/system/auth/authorizeSso/{provider}")
    public void authorizeLogin(
            @PathVariable final String provider,
            @RequestParam(required = false) final @Nullable String redirect,
            final HttpServletResponse response) {
        this.authorize(provider, redirect, "login", null, response);
    }

    /** 发起外部身份绑定；必须已登录。 */
    @GetMapping("/api-backend/system/auth/authorizeSso/{provider}")
    public void authorizeBind(
            @PathVariable final String provider,
            @RequestParam(required = false) final @Nullable String redirect,
            final HttpServletResponse response) {
        this.authorize(provider, redirect, "bind", CurrentUser.require().id(), response);
    }

    private void authorize(
            final String provider,
            final @Nullable String redirect,
            final String mode,
            final @Nullable Long userId,
            final HttpServletResponse response) {
        final SsoRedirect result = this.externalLoginService.authorize(provider, redirect, mode, userId);
        final String flowCookie = result.flowCookie();
        if (flowCookie != null) {
            SsoController.addCookie(response, this.authCookies.ssoState(flowCookie));
        }
        SsoController.redirect(response, result.location());
    }

    /** 提供方回调。 */
    @PublicApi
    @GetMapping("/api-backend/n/system/auth/callbackSso/{provider}")
    public void callback(
            @PathVariable final String provider,
            @RequestParam final Map<String, String> params,
            @CookieValue(name = AuthCookies.SSO_COOKIE, required = false) final @Nullable String flowCookie,
            final HttpServletRequest http,
            final HttpServletResponse response) {
        final SsoRedirect result =
                this.externalLoginService.callback(provider, params, flowCookie, AuthController.clientOf(http));
        SsoController.addCookie(response, this.authCookies.clearSsoState());
        LoginResult login = null;
        final LoginResult legacyLogin = result.login();
        final ExternalLoginCandidate candidate = result.candidate() != null
                ? result.candidate()
                : legacyLogin == null ? null : new ExternalLoginCandidate(legacyLogin.userId(), provider, "外部身份登录成功");
        if (candidate != null) {
            final MfaLoginApplicationService.BeginResult started = this.mfaLoginService.beginExternal(
                    candidate,
                    AuthController.clientOf(http),
                    AuthController.cookie(http, AuthCookies.MFA_TRUSTED_COOKIE));
            if (started.pendingToken() != null) {
                SsoController.addCookie(response, this.authCookies.mfaPending(started.pendingToken()));
                SsoController.redirect(
                        response,
                        "/login?mfa=1&redirect="
                                + java.net.URLEncoder.encode(
                                        result.location(), java.nio.charset.StandardCharsets.UTF_8));
                return;
            }
            login = java.util.Objects.requireNonNull(started.login());
        }
        if (login != null) {
            for (final ResponseCookie cookie : this.authCookies.issue(
                    login.accessToken(), Duration.ofSeconds(login.expiresIn()), login.userId())) {
                SsoController.addCookie(response, cookie);
            }
        }
        SsoController.redirect(response, result.location());
    }

    /**
     * 302 且 Location 原样写出：站内地址保持相对路径（{@code sendRedirect} 会按请求 Host 拼成绝对地址，
     * 经反向代理时可能拼出内网地址）；提供方地址本身就是绝对地址。
     */
    private static void redirect(final HttpServletResponse response, final String location) {
        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader(HttpHeaders.LOCATION, location);
    }

    private static void addCookie(final HttpServletResponse response, final ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}

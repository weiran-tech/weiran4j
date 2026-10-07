package com.weiran.system.adapter.web;

import com.weiran.framework.auth.AuthCookies;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.LoginUser;
import com.weiran.framework.auth.PublicApi;
import com.weiran.system.api.auth.ExternalLoginService;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.api.auth.SsoRedirect;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 外部身份登录的两次浏览器整页导航：authorize（跳去提供方）与 callback（提供方跳回来），契约 §6.1、D-015。
 *
 * <p>两个方法都返回 {@code void} 并直接写 302：它们不是 JSON 接口，统一响应包络不适用。
 * 流程状态在签名的 {@value AuthCookies#SSO_COOKIE} Cookie 里；令牌只通过 HttpOnly Cookie 交付，不出现在任何 URL 里。
 */
@RestController
@RequestMapping("/api/auth/sso/{provider}")
public class SsoController {

    private final ExternalLoginService externalLoginService;

    private final AuthCookies authCookies;

    /** 构造控制器。 */
    public SsoController(final ExternalLoginService externalLoginService, final AuthCookies authCookies) {
        this.externalLoginService = externalLoginService;
        this.authCookies = authCookies;
    }

    /** 发起外部登录 / 绑定。 */
    @PublicApi
    @GetMapping("/authorize")
    public void authorize(
            @PathVariable final String provider,
            @RequestParam(required = false) final @Nullable String redirect,
            @RequestParam(defaultValue = "login") final String mode,
            final HttpServletResponse response) {
        final SsoRedirect result = this.externalLoginService.authorize(
                provider, redirect, mode, CurrentUser.get().map(LoginUser::id).orElse(null));
        final String flowCookie = result.flowCookie();
        if (flowCookie != null) {
            SsoController.addCookie(response, this.authCookies.ssoState(flowCookie));
        }
        SsoController.redirect(response, result.location());
    }

    /** 提供方回调。 */
    @PublicApi
    @GetMapping("/callback")
    public void callback(
            @PathVariable final String provider,
            @RequestParam final Map<String, String> params,
            @CookieValue(name = AuthCookies.SSO_COOKIE, required = false) final @Nullable String flowCookie,
            final HttpServletRequest http,
            final HttpServletResponse response) {
        final SsoRedirect result =
                this.externalLoginService.callback(provider, params, flowCookie, AuthController.clientOf(http));
        SsoController.addCookie(response, this.authCookies.clearSsoState());
        final LoginResult login = result.login();
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

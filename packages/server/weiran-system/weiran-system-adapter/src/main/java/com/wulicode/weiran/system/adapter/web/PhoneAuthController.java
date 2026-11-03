package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.AuthCookies;
import com.wulicode.weiran.framework.auth.PublicApi;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.system.adapter.web.request.PhoneLoginCodeRequest;
import com.wulicode.weiran.system.adapter.web.request.PhoneLoginRequest;
import com.wulicode.weiran.system.adapter.web.response.LoginResponse;
import com.wulicode.weiran.system.api.auth.LoginResult;
import com.wulicode.weiran.system.application.auth.PhoneLoginApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 手机号验证码认证接口。 */
@RestController
@RequestMapping("/api-backend/n/system/auth")
public class PhoneAuthController {

    private final PhoneLoginApplicationService phoneLoginService;

    private final AuthCookies authCookies;

    public PhoneAuthController(final PhoneLoginApplicationService phoneLoginService, final AuthCookies authCookies) {
        this.phoneLoginService = phoneLoginService;
        this.authCookies = authCookies;
    }

    /** 发送手机号验证码；未知或禁用账号也返回相同响应，避免账号枚举。 */
    @PublicApi
    @PostMapping("/sendPhoneCode")
    public ApiResponse<Void> sendCode(
            @Valid @RequestBody final PhoneLoginCodeRequest request, final HttpServletRequest http) {
        this.phoneLoginService.sendCode(request.phone(), AuthController.clientOf(http));
        return ApiResponse.ok();
    }

    /** 手机号验证码登录；令牌交付方式与密码登录保持一致。 */
    @PublicApi
    @PostMapping("/loginWithPhoneCode")
    public LoginResponse login(
            @Valid @RequestBody final PhoneLoginRequest request,
            final HttpServletRequest http,
            final HttpServletResponse response) {
        final LoginResult result =
                this.phoneLoginService.login(request.phone(), request.code(), AuthController.clientOf(http));
        if (PhoneAuthController.wantsToken(http)) {
            return LoginResponse.withToken(result);
        }
        PhoneAuthController.addCookies(
                response,
                this.authCookies.issue(result.accessToken(), Duration.ofSeconds(result.expiresIn()), result.userId()));
        return LoginResponse.withoutToken(result);
    }

    private static boolean wantsToken(final HttpServletRequest http) {
        final String mode = http.getHeader(AuthCookies.AUTH_MODE_HEADER);
        return mode != null && AuthCookies.AUTH_MODE_TOKEN.equals(mode.strip().toLowerCase(Locale.ROOT));
    }

    private static void addCookies(final HttpServletResponse response, final List<ResponseCookie> cookies) {
        for (final ResponseCookie cookie : cookies) {
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }
    }
}

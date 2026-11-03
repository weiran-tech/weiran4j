package com.wulicode.weiran.system.adapter.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.framework.auth.AuthCookies;
import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.auth.LoginUser;
import com.wulicode.weiran.framework.auth.PublicApi;
import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.log.OperationLog;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.framework.web.ClientIpResolver;
import com.wulicode.weiran.system.adapter.web.request.ChangePasswordRequest;
import com.wulicode.weiran.system.adapter.web.request.LoginRequest;
import com.wulicode.weiran.system.adapter.web.request.SaveFavoriteMenusRequest;
import com.wulicode.weiran.system.adapter.web.request.UpdateOwnUsernameRequest;
import com.wulicode.weiran.system.adapter.web.request.UpdateProfileRequest;
import com.wulicode.weiran.system.adapter.web.request.VerifyPasswordRequest;
import com.wulicode.weiran.system.adapter.web.response.LoginResponse;
import com.wulicode.weiran.system.api.auth.AuthService;
import com.wulicode.weiran.system.api.auth.ChangePasswordCommand;
import com.wulicode.weiran.system.api.auth.ClientContext;
import com.wulicode.weiran.system.api.auth.CurrentUserView;
import com.wulicode.weiran.system.api.auth.ExternalLoginService;
import com.wulicode.weiran.system.api.auth.LoginCommand;
import com.wulicode.weiran.system.api.auth.LoginResult;
import com.wulicode.weiran.system.api.auth.LogoutResult;
import com.wulicode.weiran.system.api.auth.ProvidersView;
import com.wulicode.weiran.system.api.auth.UpdateProfileCommand;
import com.wulicode.weiran.system.api.auth.UserIdentityView;
import com.wulicode.weiran.system.api.menu.MenuNode;
import com.wulicode.weiran.system.api.user.UpdateUserAccountFieldCommand;
import com.wulicode.weiran.system.api.user.UserService;
import com.wulicode.weiran.system.application.auth.MfaLoginApplicationService;
import com.wulicode.weiran.system.application.auth.PhoneLoginSettings;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证与当前用户接口。
 *
 * <p>登录 / 登出写的是登录日志（sys_login_log），不再重复记操作日志。
 *
 * <p>令牌交付（契约 §4、§6.1）：浏览器默认走 HttpOnly Cookie，响应体不含令牌；
 * 请求头 {@code X-Auth-Mode: token} 时改为响应体返回令牌、不写 Cookie，供脚本等非浏览器调用方用 Bearer 头。
 */
@RestController
public class AuthController {

    private final AuthService authService;

    private final UserService userService;

    private final ObjectMapper objectMapper;

    private final AuthCookies authCookies;

    private final ExternalLoginService externalLoginService;

    private final PhoneLoginSettings phoneLoginSettings;

    private final MfaLoginApplicationService mfaLoginService;

    /** 构造控制器。 */
    public AuthController(
            final AuthService authService,
            final UserService userService,
            final ObjectMapper objectMapper,
            final AuthCookies authCookies,
            final ExternalLoginService externalLoginService,
            final PhoneLoginSettings phoneLoginSettings,
            final MfaLoginApplicationService mfaLoginService) {
        this.authService = authService;
        this.userService = userService;
        this.objectMapper = objectMapper;
        this.authCookies = authCookies;
        this.externalLoginService = externalLoginService;
        this.phoneLoginSettings = phoneLoginSettings;
        this.mfaLoginService = mfaLoginService;
    }

    /** 登录。 */
    @PublicApi
    @PostMapping("/api-backend/n/system/auth/login")
    public LoginResponse login(
            @Valid @RequestBody final LoginRequest request,
            final HttpServletRequest http,
            final HttpServletResponse response) {
        final MfaLoginApplicationService.BeginResult started = this.mfaLoginService.beginPassword(
                new LoginCommand(request.username(), request.password()),
                AuthController.clientOf(http),
                AuthController.cookie(http, AuthCookies.MFA_TRUSTED_COOKIE));
        if (started.pendingToken() != null) {
            response.addHeader(
                    HttpHeaders.SET_COOKIE,
                    this.authCookies.mfaPending(started.pendingToken()).toString());
            return LoginResponse.pending(java.util.Objects.requireNonNull(started.maskedPhone()));
        }
        final LoginResult result = java.util.Objects.requireNonNull(started.login());
        if (AuthController.wantsToken(http)) {
            return LoginResponse.withToken(result);
        }
        AuthController.addCookies(
                response,
                this.authCookies.issue(result.accessToken(), Duration.ofSeconds(result.expiresIn()), result.userId()));
        return LoginResponse.withoutToken(result);
    }

    /** 完成手机二次验证，验证前不发放访问令牌。 */
    @PublicApi
    @PostMapping("/api-backend/n/system/auth/verifyMfa")
    public LoginResponse verifyMfa(
            @Valid @RequestBody final VerifyMfaRequest request,
            final HttpServletRequest http,
            final HttpServletResponse response) {
        final MfaLoginApplicationService.VerifiedResult verified = this.mfaLoginService.verify(
                AuthController.cookie(http, AuthCookies.MFA_PENDING_COOKIE), request.code());
        response.addHeader(
                HttpHeaders.SET_COOKIE, this.authCookies.clearMfaPending().toString());
        if (verified.trustedToken() != null) {
            response.addHeader(
                    HttpHeaders.SET_COOKIE,
                    this.authCookies
                            .mfaTrusted(verified.trustedToken(), verified.rememberDays())
                            .toString());
        }
        final LoginResult login = verified.login();
        if (AuthController.wantsToken(http)) {
            return LoginResponse.withToken(login);
        }
        AuthController.addCookies(
                response,
                this.authCookies.issue(login.accessToken(), Duration.ofSeconds(login.expiresIn()), login.userId()));
        return LoginResponse.withoutToken(login);
    }

    public record VerifyMfaRequest(
            @jakarta.validation.constraints.Pattern(regexp = "\\d{6}")
            String code) {}

    /** 登出。 */
    @PostMapping("/api-backend/system/auth/logout")
    public LogoutResult logout(final HttpServletRequest http, final HttpServletResponse response) {
        final LoginUser user = CurrentUser.require();
        final LogoutResult result = this.authService.logout(user.id(), AuthController.clientOf(http), user.idp());
        AuthController.addCookies(response, this.authCookies.clear());
        return result;
    }

    /** 登录页需要的认证方式：外部身份提供方与密码登录开关（不含任何密钥与地址）。 */
    @PublicApi
    @GetMapping("/api-backend/n/system/auth/listProviders")
    public ProvidersView providers() {
        final ProvidersView providers = this.externalLoginService.providers();
        return new ProvidersView(
                providers.passwordLoginEnabled(), this.phoneLoginSettings.isEnabled(), providers.providers());
    }

    /** 本人的外部身份。 */
    @GetMapping("/api-backend/system/auth/listCurrentIdentities")
    public List<UserIdentityView> identities() {
        return this.externalLoginService.identitiesOf(CurrentUser.require().id());
    }

    /** 本人解绑外部身份（没有本地密码时不能解绑最后一个）。 */
    @OperationLog(module = "个人中心", description = "解绑外部账号")
    @DeleteMapping("/api-backend/system/auth/deleteCurrentIdentity/{id}")
    public ApiResponse<Void> unbindIdentity(@PathVariable final long id) {
        this.externalLoginService.unbindOwn(CurrentUser.require().id(), id);
        return ApiResponse.ok();
    }

    /** 当前用户。 */
    @GetMapping("/api-backend/system/auth/getCurrentUser")
    public CurrentUserView me() {
        return this.authService.me(CurrentUser.require().id());
    }

    /** 当前用户可见菜单树。 */
    @GetMapping("/api-backend/system/auth/listCurrentMenus")
    public List<MenuNode> menus() {
        return this.authService.menus(CurrentUser.require().id());
    }

    /** 修改个人资料。 */
    @OperationLog(module = "个人中心", description = "修改个人资料")
    @PutMapping("/api-backend/system/auth/updateProfile")
    public ApiResponse<Void> updateProfile(@Valid @RequestBody final UpdateProfileRequest request) {
        this.authService.updateProfile(
                CurrentUser.require().id(),
                new UpdateProfileCommand(request.nickname(), request.avatar(), request.gender()));
        return ApiResponse.ok();
    }

    /** 修改本人的用户名。 */
    @OperationLog(module = "个人中心", description = "修改用户名")
    @PutMapping("/api-backend/system/auth/updateUsername")
    public ApiResponse<Void> updateUsername(@Valid @RequestBody final UpdateOwnUsernameRequest request) {
        this.userService.updateAccountField(
                CurrentUser.require().id(), new UpdateUserAccountFieldCommand("username", request.username()));
        return ApiResponse.ok();
    }

    /** 修改自己的密码。 */
    @OperationLog(module = "个人中心", description = "修改密码")
    @PutMapping("/api-backend/system/auth/updatePassword")
    public ApiResponse<Void> changePassword(@Valid @RequestBody final ChangePasswordRequest request) {
        this.authService.changePassword(
                CurrentUser.require().id(), new ChangePasswordCommand(request.oldPassword(), request.newPassword()));
        return ApiResponse.ok();
    }

    /** 当前用户的界面偏好；从未保存过返回 null。 */
    @GetMapping("/api-backend/system/auth/getPreferences")
    public ApiResponse<JsonNode> preferences() {
        final String json = this.authService.preferences(CurrentUser.require().id());
        if (json == null) {
            return ApiResponse.ok(null);
        }
        try {
            return ApiResponse.ok(this.objectMapper.readTree(json));
        } catch (final JsonProcessingException ex) {
            throw new IllegalStateException("sys_user.preferences 不是合法的 JSON", ex);
        }
    }

    /**
     * 全量覆盖界面偏好。
     *
     * <p>不记操作日志：前端改任何设置都会防抖后自动保存，记下来只会淹没真正有意义的操作。
     */
    @PutMapping("/api-backend/system/auth/updatePreferences")
    public ApiResponse<Void> updatePreferences(@RequestBody final JsonNode body) {
        if (!body.isObject()) {
            throw BizException.badRequest("preferences: 必须是 JSON 对象");
        }
        final String json;
        try {
            json = this.objectMapper.writeValueAsString(body);
        } catch (final JsonProcessingException ex) {
            throw new IllegalStateException("偏好序列化失败", ex);
        }
        this.authService.updatePreferences(CurrentUser.require().id(), json);
        return ApiResponse.ok();
    }

    /** 收藏的菜单 ID（按收藏顺序，已失效的自动过滤）。 */
    @GetMapping("/api-backend/system/auth/listFavoriteMenus")
    public List<Long> favoriteMenus() {
        return this.authService.favoriteMenus(CurrentUser.require().id());
    }

    /** 全量覆盖收藏菜单。 */
    @PutMapping("/api-backend/system/auth/updateFavoriteMenus")
    public ApiResponse<Void> updateFavoriteMenus(@Valid @RequestBody final SaveFavoriteMenusRequest request) {
        this.authService.updateFavoriteMenus(CurrentUser.require().id(), request.menuIds());
        return ApiResponse.ok();
    }

    /** 校验当前用户密码（锁屏解锁）：不改令牌、不写登录日志。 */
    @PostMapping("/api-backend/system/auth/verifyPassword")
    public ApiResponse<Void> verifyPassword(@Valid @RequestBody final VerifyPasswordRequest request) {
        this.authService.verifyPassword(CurrentUser.require().id(), request.password());
        return ApiResponse.ok();
    }

    private static boolean wantsToken(final HttpServletRequest http) {
        final String mode = http.getHeader(AuthCookies.AUTH_MODE_HEADER);
        return mode != null && AuthCookies.AUTH_MODE_TOKEN.equals(mode.strip().toLowerCase(Locale.ROOT));
    }

    static @org.jspecify.annotations.Nullable String cookie(final HttpServletRequest http, final String name) {
        final jakarta.servlet.http.Cookie[] cookies = http.getCookies();
        if (cookies == null) {
            return null;
        }
        for (final jakarta.servlet.http.Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private static void addCookies(final HttpServletResponse response, final List<ResponseCookie> cookies) {
        for (final ResponseCookie cookie : cookies) {
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }
    }

    static ClientContext clientOf(final HttpServletRequest http) {
        final String userAgent = http.getHeader(HttpHeaders.USER_AGENT);
        return new ClientContext(ClientIpResolver.resolve(http), userAgent == null ? "" : userAgent);
    }
}

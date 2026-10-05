package com.weiran.system.adapter.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.common.error.BizException;
import com.weiran.common.response.ApiResponse;
import com.weiran.framework.auth.AuthCookies;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.PublicApi;
import com.weiran.framework.log.OperationLog;
import com.weiran.framework.web.ClientIpResolver;
import com.weiran.system.adapter.web.request.ChangePasswordRequest;
import com.weiran.system.adapter.web.request.LoginRequest;
import com.weiran.system.adapter.web.request.SaveFavoriteMenusRequest;
import com.weiran.system.adapter.web.request.UpdateProfileRequest;
import com.weiran.system.adapter.web.request.VerifyPasswordRequest;
import com.weiran.system.adapter.web.response.LoginResponse;
import com.weiran.system.api.auth.AuthService;
import com.weiran.system.api.auth.ChangePasswordCommand;
import com.weiran.system.api.auth.ClientContext;
import com.weiran.system.api.auth.CurrentUserView;
import com.weiran.system.api.auth.LoginCommand;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.api.auth.UpdateProfileCommand;
import com.weiran.system.api.menu.MenuNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口 {@code /api/auth}。
 *
 * <p>登录 / 登出写的是登录日志（sys_login_log），不再重复记操作日志。
 *
 * <p>令牌交付（契约 §4、§6.1）：浏览器默认走 HttpOnly Cookie，响应体不含令牌；
 * 请求头 {@code X-Auth-Mode: token} 时改为响应体返回令牌、不写 Cookie，供脚本等非浏览器调用方用 Bearer 头。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    private final ObjectMapper objectMapper;

    private final AuthCookies authCookies;

    /** 构造控制器。 */
    public AuthController(
            final AuthService authService, final ObjectMapper objectMapper, final AuthCookies authCookies) {
        this.authService = authService;
        this.objectMapper = objectMapper;
        this.authCookies = authCookies;
    }

    /** 登录。 */
    @PublicApi
    @PostMapping("/login")
    public LoginResponse login(
            @Valid @RequestBody final LoginRequest request,
            final HttpServletRequest http,
            final HttpServletResponse response) {
        final LoginResult result = this.authService.login(
                new LoginCommand(request.username(), request.password()), AuthController.clientOf(http));
        if (AuthController.wantsToken(http)) {
            return LoginResponse.withToken(result);
        }
        AuthController.addCookies(
                response,
                this.authCookies.issue(result.accessToken(), Duration.ofSeconds(result.expiresIn()), result.userId()));
        return LoginResponse.withoutToken(result);
    }

    /** 登出。 */
    @PostMapping("/logout")
    public ApiResponse<Void> logout(final HttpServletRequest http, final HttpServletResponse response) {
        this.authService.logout(CurrentUser.require().id(), AuthController.clientOf(http));
        AuthController.addCookies(response, this.authCookies.clear());
        return ApiResponse.ok();
    }

    /** 当前用户。 */
    @GetMapping("/me")
    public CurrentUserView me() {
        return this.authService.me(CurrentUser.require().id());
    }

    /** 当前用户可见菜单树。 */
    @GetMapping("/menus")
    public List<MenuNode> menus() {
        return this.authService.menus(CurrentUser.require().id());
    }

    /** 修改个人资料。 */
    @OperationLog(module = "个人中心", description = "修改个人资料")
    @PutMapping("/profile")
    public ApiResponse<Void> updateProfile(@Valid @RequestBody final UpdateProfileRequest request) {
        this.authService.updateProfile(
                CurrentUser.require().id(),
                new UpdateProfileCommand(
                        request.nickname(), request.email(), request.phone(), request.avatar(), request.gender()));
        return ApiResponse.ok();
    }

    /** 修改自己的密码。 */
    @OperationLog(module = "个人中心", description = "修改密码")
    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody final ChangePasswordRequest request) {
        this.authService.changePassword(
                CurrentUser.require().id(), new ChangePasswordCommand(request.oldPassword(), request.newPassword()));
        return ApiResponse.ok();
    }

    /** 当前用户的界面偏好；从未保存过返回 null。 */
    @GetMapping("/preferences")
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
    @PutMapping("/preferences")
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
    @GetMapping("/favorite-menus")
    public List<Long> favoriteMenus() {
        return this.authService.favoriteMenus(CurrentUser.require().id());
    }

    /** 全量覆盖收藏菜单。 */
    @PutMapping("/favorite-menus")
    public ApiResponse<Void> updateFavoriteMenus(@Valid @RequestBody final SaveFavoriteMenusRequest request) {
        this.authService.updateFavoriteMenus(CurrentUser.require().id(), request.menuIds());
        return ApiResponse.ok();
    }

    /** 校验当前用户密码（锁屏解锁）：不改令牌、不写登录日志。 */
    @PostMapping("/verify-password")
    public ApiResponse<Void> verifyPassword(@Valid @RequestBody final VerifyPasswordRequest request) {
        this.authService.verifyPassword(CurrentUser.require().id(), request.password());
        return ApiResponse.ok();
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

    static ClientContext clientOf(final HttpServletRequest http) {
        final String userAgent = http.getHeader(HttpHeaders.USER_AGENT);
        return new ClientContext(ClientIpResolver.resolve(http), userAgent == null ? "" : userAgent);
    }
}

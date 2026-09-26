package com.weiran.system.adapter.web;

import com.weiran.common.response.ApiResponse;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.PublicApi;
import com.weiran.framework.log.OperationLog;
import com.weiran.framework.web.ClientIpResolver;
import com.weiran.system.adapter.web.request.ChangePasswordRequest;
import com.weiran.system.adapter.web.request.LoginRequest;
import com.weiran.system.adapter.web.request.UpdateProfileRequest;
import com.weiran.system.api.auth.AuthService;
import com.weiran.system.api.auth.ChangePasswordCommand;
import com.weiran.system.api.auth.ClientContext;
import com.weiran.system.api.auth.CurrentUserView;
import com.weiran.system.api.auth.LoginCommand;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.api.auth.UpdateProfileCommand;
import com.weiran.system.api.menu.MenuNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
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
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    /** 构造控制器。 */
    public AuthController(final AuthService authService) {
        this.authService = authService;
    }

    /** 登录。 */
    @PublicApi
    @PostMapping("/login")
    public LoginResult login(@Valid @RequestBody final LoginRequest request, final HttpServletRequest http) {
        return this.authService.login(
                new LoginCommand(request.username(), request.password()), AuthController.clientOf(http));
    }

    /** 登出。 */
    @PostMapping("/logout")
    public ApiResponse<Void> logout(final HttpServletRequest http) {
        this.authService.logout(CurrentUser.require().id(), AuthController.clientOf(http));
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

    static ClientContext clientOf(final HttpServletRequest http) {
        final String userAgent = http.getHeader(HttpHeaders.USER_AGENT);
        return new ClientContext(ClientIpResolver.resolve(http), userAgent == null ? "" : userAgent);
    }
}

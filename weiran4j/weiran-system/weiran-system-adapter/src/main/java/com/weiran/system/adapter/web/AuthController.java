package com.weiran.system.adapter.web;

import com.kjs.wuli3.web.context.ClientIpResolver;
import com.weiran.system.adapter.auth.PrincipalHolder;
import com.weiran.system.adapter.web.dto.LoginRequest;
import com.weiran.system.api.auth.AuthService;
import com.weiran.system.api.auth.CurrentAccountView;
import com.weiran.system.api.auth.LoginCommand;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.domain.rbac.AuthorizedPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口。
 *
 * <p>返回值是裸的业务对象——wuli3 的 {@code ApiResponseBodyAdvice} 会统一包成
 * {@code {code, message, timestamp, requestId, data}}，这里手动包一层反而会套两层。
 *
 * <p>路径沿用 PHP 版的 {@code /api/v1/...} 前缀，让前端可以逐接口灰度切流，
 * 而不是必须整体切换。
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    private final PrincipalHolder principalHolder;

    private final ClientIpResolver clientIpResolver;

    /** 通行证 + 密码登录。 */
    @PostMapping("/login")
    public LoginResult login(@Valid @RequestBody final LoginRequest request, final HttpServletRequest servletRequest) {
        final LoginCommand command = new LoginCommand(
                request.passport(),
                request.password(),
                request.effectiveGuard(),
                request.effectiveDeviceId(),
                this.clientIpResolver.resolve(servletRequest));

        return this.authService.login(command);
    }

    /**
     * 取当前登录账号及其角色、权限。
     *
     * <p>前端据此渲染菜单与按钮，因此权限集合必须完整下发，不能分页或裁剪。
     *
     * <p>直接读 {@link PrincipalHolder} 而不是再解析一次令牌：认证已在
     * {@code WeiranAuthContextResolver} 里完成，重新解析等于每个请求多一次验签与多一轮查库。
     */
    @GetMapping("/me")
    public CurrentAccountView me() {
        final AuthorizedPrincipal principal = this.principalHolder.require();
        final List<String> roles = new ArrayList<>(principal.roleNames());
        final List<String> permissions = new ArrayList<>(principal.permissionNames());
        roles.sort(null);
        permissions.sort(null);

        return new CurrentAccountView(
                principal.accountId(), principal.displayName(), principal.accountType(), roles, permissions);
    }
}

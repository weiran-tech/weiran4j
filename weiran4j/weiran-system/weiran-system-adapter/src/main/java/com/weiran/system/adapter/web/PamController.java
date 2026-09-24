package com.weiran.system.adapter.web;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.adapter.auth.PrincipalHolder;
import com.weiran.system.adapter.web.dto.CreateAccountRequest;
import com.weiran.system.adapter.web.dto.ResetPasswordRequest;
import com.weiran.system.adapter.web.dto.UpdateAccountRequest;
import com.weiran.system.api.rbac.AccountQuery;
import com.weiran.system.api.rbac.AccountView;
import com.weiran.system.api.rbac.CreateAccountCommand;
import com.weiran.system.api.rbac.LoginLogView;
import com.weiran.system.api.rbac.PamService;
import com.weiran.system.api.rbac.UpdateAccountCommand;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 账号管理接口。 */
@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class PamController {

    private static final String PERMISSION_INDEX = "weiran-system:account.index";

    private static final String PERMISSION_MANAGE = "weiran-system:account.manage";

    private final PamService pamService;

    private final PrincipalHolder principalHolder;

    /** 分页查询账号列表。 */
    @GetMapping
    public PageResult<AccountView> list(
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int size,
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String accountType) {
        this.principalHolder.require().ensure(PamController.PERMISSION_INDEX);
        return this.pamService.list(new AccountQuery(new PageQuery(page, size), keyword, accountType));
    }

    /** 查账号详情。 */
    @GetMapping("/{id}")
    public AccountView findById(@PathVariable final long id) {
        this.principalHolder.require().ensure(PamController.PERMISSION_INDEX);
        return this.pamService.findById(id);
    }

    /** 新增账号。 */
    @PostMapping
    public AccountView create(@Valid @RequestBody final CreateAccountRequest request) {
        this.principalHolder.require().ensure(PamController.PERMISSION_MANAGE);
        return this.pamService.create(new CreateAccountCommand(
                request.username(), request.password(), request.mobile(), request.email(), request.accountType()));
    }

    /** 编辑账号可变资料字段（不含密码）。 */
    @PostMapping("/{id}/update")
    public AccountView update(@PathVariable final long id, @Valid @RequestBody final UpdateAccountRequest request) {
        this.principalHolder.require().ensure(PamController.PERMISSION_MANAGE);
        return this.pamService.update(id, new UpdateAccountCommand(request.mobile(), request.email()));
    }

    /** 启用账号。 */
    @PostMapping("/{id}/enable")
    public void enable(@PathVariable final long id) {
        this.principalHolder.require().ensure(PamController.PERMISSION_MANAGE);
        this.pamService.enable(id);
    }

    /** 禁用账号，禁用后现有登录接口拒绝该账号登录。 */
    @PostMapping("/{id}/disable")
    public void disable(@PathVariable final long id) {
        this.principalHolder.require().ensure(PamController.PERMISSION_MANAGE);
        this.pamService.disable(id);
    }

    /** 重置密码，复用 {@code PasswordHasher.hash()} 产出 BCrypt 哈希。 */
    @PostMapping("/{id}/reset-password")
    public void resetPassword(@PathVariable final long id, @Valid @RequestBody final ResetPasswordRequest request) {
        this.principalHolder.require().ensure(PamController.PERMISSION_MANAGE);
        this.pamService.resetPassword(id, request.newPassword());
    }

    /** 查登录日志（复用 {@code pam_account.logined_at}/{@code login_ip}）。 */
    @GetMapping("/{id}/login-logs")
    public PageResult<LoginLogView> loginLogs(@PathVariable final long id) {
        this.principalHolder.require().ensure(PamController.PERMISSION_INDEX);
        return this.pamService.loginLogs(id);
    }
}

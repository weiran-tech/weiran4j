package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.log.OperationLog;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.framework.response.IdResult;
import com.wulicode.weiran.system.adapter.web.request.BindIdentityRequest;
import com.wulicode.weiran.system.adapter.web.request.CreateUserRequest;
import com.wulicode.weiran.system.adapter.web.request.ResetPasswordRequest;
import com.wulicode.weiran.system.adapter.web.request.UpdateUserRequest;
import com.wulicode.weiran.system.api.auth.BindIdentityCommand;
import com.wulicode.weiran.system.api.auth.ExternalLoginService;
import com.wulicode.weiran.system.api.auth.UserIdentityView;
import com.wulicode.weiran.system.api.user.CreateUserCommand;
import com.wulicode.weiran.system.api.user.UpdateUserCommand;
import com.wulicode.weiran.system.api.user.UserOption;
import com.wulicode.weiran.system.api.user.UserQuery;
import com.wulicode.weiran.system.api.user.UserService;
import com.wulicode.weiran.system.api.user.UserView;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 用户管理接口。 */
@RestController
@RequestMapping("/api-backend/system/user")
public class UserController {

    private static final String MODULE = "用户管理";

    private final UserService userService;

    private final ExternalLoginService externalLoginService;

    /** 构造控制器。 */
    public UserController(final UserService userService, final ExternalLoginService externalLoginService) {
        this.userService = userService;
        this.externalLoginService = externalLoginService;
    }

    /** 分页查询：{@code keyword} 为三列模糊的快速搜索，其余为高级筛选的单字段条件（契约 §6.2）。 */
    @RequiresPermission("system:user:list")
    @GetMapping("/list")
    public PageResult<UserView> page(
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String status,
            @RequestParam(required = false) final @Nullable String username,
            @RequestParam(required = false) final @Nullable Long userId,
            @RequestParam(required = false) final @Nullable String phone,
            @RequestParam(required = false) final @Nullable Long roleId,
            @RequestParam(required = false) final @Nullable String gender,
            @RequestParam(required = false) final @Nullable LocalDateTime createdStartTime,
            @RequestParam(required = false) final @Nullable LocalDateTime createdEndTime,
            @RequestParam(required = false) final @Nullable LocalDateTime lastLoginStartTime,
            @RequestParam(required = false) final @Nullable LocalDateTime lastLoginEndTime,
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize) {
        final UserQuery query = new UserQuery(
                keyword,
                status,
                username,
                userId,
                phone,
                roleId,
                gender,
                createdStartTime,
                createdEndTime,
                lastLoginStartTime,
                lastLoginEndTime);
        return this.userService.page(query, new PageQuery(page, pageSize));
    }

    /** 启用用户下拉。 */
    @GetMapping("/listOptions")
    public List<UserOption> options() {
        return this.userService.options();
    }

    /** 详情。 */
    @RequiresPermission("system:user:list")
    @GetMapping("/get/{id}")
    public UserView get(@PathVariable final long id) {
        return this.userService.get(id);
    }

    /** 新增。 */
    @RequiresPermission("system:user:create")
    @OperationLog(module = UserController.MODULE, description = "新增用户")
    @PostMapping("/create")
    public IdResult create(@Valid @RequestBody final CreateUserRequest request) {
        return new IdResult(this.userService.create(new CreateUserCommand(
                request.username(),
                request.nickname(),
                request.password(),
                request.phone(),
                request.gender(),
                request.status(),
                request.roleIds())));
    }

    /** 修改。 */
    @RequiresPermission("system:user:update")
    @OperationLog(module = UserController.MODULE, description = "修改用户")
    @PutMapping("/update/{id}")
    public ApiResponse<Void> update(@PathVariable final long id, @Valid @RequestBody final UpdateUserRequest request) {
        this.userService.update(
                id, new UpdateUserCommand(request.nickname(), request.gender(), request.status(), request.roleIds()));
        return ApiResponse.ok();
    }

    /** 删除。 */
    @RequiresPermission("system:user:delete")
    @OperationLog(module = UserController.MODULE, description = "删除用户")
    @DeleteMapping("/delete/{id}")
    public ApiResponse<Void> delete(@PathVariable final long id) {
        this.userService.delete(id, CurrentUser.require().id());
        return ApiResponse.ok();
    }

    /** 重置密码。 */
    @RequiresPermission("system:user:reset-password")
    @OperationLog(module = UserController.MODULE, description = "重置密码")
    @PutMapping("/updatePassword/{id}")
    public ApiResponse<Void> resetPassword(
            @PathVariable final long id, @Valid @RequestBody final ResetPasswordRequest request) {
        this.userService.resetPassword(id, request.password());
        return ApiResponse.ok();
    }

    /** 用户的外部身份。 */
    @RequiresPermission("system:user:identity")
    @GetMapping("/listIdentities/{id}")
    public List<UserIdentityView> identities(@PathVariable final long id) {
        return this.externalLoginService.identitiesOf(id);
    }

    /** 手工绑定外部身份。 */
    @RequiresPermission("system:user:identity")
    @OperationLog(module = UserController.MODULE, description = "绑定外部身份")
    @PostMapping("/createIdentity/{id}")
    public IdResult bindIdentity(@PathVariable final long id, @Valid @RequestBody final BindIdentityRequest request) {
        return new IdResult(this.externalLoginService.bind(
                id, new BindIdentityCommand(request.provider(), request.externalId(), request.displayName())));
    }

    /** 解绑外部身份。 */
    @RequiresPermission("system:user:identity")
    @OperationLog(module = UserController.MODULE, description = "解绑外部身份")
    @DeleteMapping("/deleteIdentity/{id}/{identityId}")
    public ApiResponse<Void> unbindIdentity(@PathVariable final long id, @PathVariable final long identityId) {
        this.externalLoginService.unbind(id, identityId);
        return ApiResponse.ok();
    }
}

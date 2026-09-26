package com.weiran.system.adapter.web;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.response.ApiResponse;
import com.weiran.common.response.IdResult;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.RequiresPermission;
import com.weiran.framework.log.OperationLog;
import com.weiran.system.adapter.web.request.CreateUserRequest;
import com.weiran.system.adapter.web.request.ResetPasswordRequest;
import com.weiran.system.adapter.web.request.UpdateUserRequest;
import com.weiran.system.api.user.CreateUserCommand;
import com.weiran.system.api.user.UpdateUserCommand;
import com.weiran.system.api.user.UserOption;
import com.weiran.system.api.user.UserQuery;
import com.weiran.system.api.user.UserService;
import com.weiran.system.api.user.UserView;
import jakarta.validation.Valid;
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

/** 用户管理接口 {@code /api/users}。 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final String MODULE = "用户管理";

    private final UserService userService;

    /** 构造控制器。 */
    public UserController(final UserService userService) {
        this.userService = userService;
    }

    /** 分页查询。 */
    @RequiresPermission("system:user:list")
    @GetMapping
    public PageResult<UserView> page(
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String status,
            @RequestParam(required = false) final @Nullable Long departmentId,
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize) {
        return this.userService.page(new UserQuery(keyword, status, departmentId), new PageQuery(page, pageSize));
    }

    /** 启用用户下拉。 */
    @GetMapping("/options")
    public List<UserOption> options() {
        return this.userService.options();
    }

    /** 详情。 */
    @RequiresPermission("system:user:list")
    @GetMapping("/{id}")
    public UserView get(@PathVariable final long id) {
        return this.userService.get(id);
    }

    /** 新增。 */
    @RequiresPermission("system:user:create")
    @OperationLog(module = UserController.MODULE, description = "新增用户")
    @PostMapping
    public IdResult create(@Valid @RequestBody final CreateUserRequest request) {
        return new IdResult(this.userService.create(new CreateUserCommand(
                request.username(),
                request.nickname(),
                request.password(),
                request.email(),
                request.phone(),
                request.gender(),
                request.departmentId(),
                request.status(),
                request.roleIds())));
    }

    /** 修改。 */
    @RequiresPermission("system:user:update")
    @OperationLog(module = UserController.MODULE, description = "修改用户")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable final long id, @Valid @RequestBody final UpdateUserRequest request) {
        this.userService.update(
                id,
                new UpdateUserCommand(
                        request.nickname(),
                        request.email(),
                        request.phone(),
                        request.gender(),
                        request.departmentId(),
                        request.status(),
                        request.roleIds()));
        return ApiResponse.ok();
    }

    /** 删除。 */
    @RequiresPermission("system:user:delete")
    @OperationLog(module = UserController.MODULE, description = "删除用户")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable final long id) {
        this.userService.delete(id, CurrentUser.require().id());
        return ApiResponse.ok();
    }

    /** 重置密码。 */
    @RequiresPermission("system:user:reset-password")
    @OperationLog(module = UserController.MODULE, description = "重置密码")
    @PutMapping("/{id}/password")
    public ApiResponse<Void> resetPassword(
            @PathVariable final long id, @Valid @RequestBody final ResetPasswordRequest request) {
        this.userService.resetPassword(id, request.password());
        return ApiResponse.ok();
    }
}

package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.log.OperationLog;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.system.adapter.web.request.UpdateUserAccountFieldRequest;
import com.wulicode.weiran.system.api.user.UpdateUserAccountFieldCommand;
import com.wulicode.weiran.system.api.user.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 管理员单字段修改用户账号标识。 */
@RestController
@RequestMapping("/api-backend/system/user")
public class UserAccountFieldController {

    private static final String MODULE = "用户管理";

    private final UserService userService;

    /** 构造控制器。 */
    public UserAccountFieldController(final UserService userService) {
        this.userService = userService;
    }

    /** 单独设置用户名或手机号。 */
    @RequiresPermission("system:user:update")
    @OperationLog(module = UserAccountFieldController.MODULE, description = "设置用户账号信息")
    @PutMapping("/updateAccountField/{id}")
    public ApiResponse<Void> updateAccountField(
            @PathVariable final long id, @Valid @RequestBody final UpdateUserAccountFieldRequest request) {
        this.userService.updateAccountField(id, new UpdateUserAccountFieldCommand(request.field(), request.value()));
        return ApiResponse.ok();
    }
}

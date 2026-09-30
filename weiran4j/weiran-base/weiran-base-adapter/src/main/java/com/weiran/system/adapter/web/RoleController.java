package com.weiran.system.adapter.web;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.response.ApiResponse;
import com.weiran.common.response.IdResult;
import com.weiran.framework.auth.RequiresPermission;
import com.weiran.framework.log.OperationLog;
import com.weiran.system.adapter.web.request.AssignMenusRequest;
import com.weiran.system.adapter.web.request.SaveRoleRequest;
import com.weiran.system.api.role.RoleDetailView;
import com.weiran.system.api.role.RoleOption;
import com.weiran.system.api.role.RoleQuery;
import com.weiran.system.api.role.RoleService;
import com.weiran.system.api.role.RoleView;
import com.weiran.system.api.role.SaveRoleCommand;
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

/** 角色管理接口 {@code /api/roles}。 */
@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private static final String MODULE = "角色管理";

    private final RoleService roleService;

    /** 构造控制器。 */
    public RoleController(final RoleService roleService) {
        this.roleService = roleService;
    }

    /** 分页查询。 */
    @RequiresPermission("system:role:list")
    @GetMapping
    public PageResult<RoleView> page(
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String status,
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize) {
        return this.roleService.page(new RoleQuery(keyword, status), new PageQuery(page, pageSize));
    }

    /** 启用角色下拉。 */
    @GetMapping("/options")
    public List<RoleOption> options() {
        return this.roleService.options();
    }

    /** 详情（含菜单 ID）。 */
    @RequiresPermission("system:role:list")
    @GetMapping("/{id}")
    public RoleDetailView get(@PathVariable final long id) {
        return this.roleService.get(id);
    }

    /** 新增。 */
    @RequiresPermission("system:role:create")
    @OperationLog(module = RoleController.MODULE, description = "新增角色")
    @PostMapping
    public IdResult create(@Valid @RequestBody final SaveRoleRequest request) {
        return new IdResult(this.roleService.create(RoleController.toCommand(request)));
    }

    /** 修改。 */
    @RequiresPermission("system:role:update")
    @OperationLog(module = RoleController.MODULE, description = "修改角色")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable final long id, @Valid @RequestBody final SaveRoleRequest request) {
        this.roleService.update(id, RoleController.toCommand(request));
        return ApiResponse.ok();
    }

    /** 删除。 */
    @RequiresPermission("system:role:delete")
    @OperationLog(module = RoleController.MODULE, description = "删除角色")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable final long id) {
        this.roleService.delete(id);
        return ApiResponse.ok();
    }

    /** 分配菜单（全量覆盖）。 */
    @RequiresPermission("system:role:assign-menu")
    @OperationLog(module = RoleController.MODULE, description = "分配菜单")
    @PutMapping("/{id}/menus")
    public ApiResponse<Void> assignMenus(
            @PathVariable final long id, @Valid @RequestBody final AssignMenusRequest request) {
        this.roleService.assignMenus(id, request.menuIds());
        return ApiResponse.ok();
    }

    private static SaveRoleCommand toCommand(final SaveRoleRequest request) {
        return new SaveRoleCommand(
                request.name(), request.code(), request.description(), request.sort(), request.status());
    }
}

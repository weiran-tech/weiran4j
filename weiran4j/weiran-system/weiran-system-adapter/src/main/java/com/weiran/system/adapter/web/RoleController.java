package com.weiran.system.adapter.web;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.adapter.auth.PrincipalHolder;
import com.weiran.system.adapter.web.dto.AssignPermissionsRequest;
import com.weiran.system.adapter.web.dto.CreateRoleRequest;
import com.weiran.system.adapter.web.dto.UpdateRoleRequest;
import com.weiran.system.api.rbac.AssignPermissionsCommand;
import com.weiran.system.api.rbac.CreateRoleCommand;
import com.weiran.system.api.rbac.RoleDetailView;
import com.weiran.system.api.rbac.RoleQuery;
import com.weiran.system.api.rbac.RoleService;
import com.weiran.system.api.rbac.RoleView;
import com.weiran.system.api.rbac.UpdateRoleCommand;
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

/**
 * 角色管理接口。
 *
 * <p>返回值是裸的业务对象，由 wuli3 的 {@code ApiResponseBodyAdvice} 统一包装，与
 * {@code AuthController} 一致。权限拦截显式调用 {@code AuthorizedPrincipal#ensure}——
 * 本仓库目前没有声明式权限注解机制，design.md 提到的"沿用现有鉴权基础设施"具体所指即此。
 */
@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private static final String PERMISSION_INDEX = "weiran-system:role.index";

    private static final String PERMISSION_MANAGE = "weiran-system:role.manage";

    private static final String PERMISSION_ASSIGN = "weiran-system:role.permissions";

    private final RoleService roleService;

    private final PrincipalHolder principalHolder;

    /** 分页查询角色列表。 */
    @GetMapping
    public PageResult<RoleView> list(
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int size,
            @RequestParam(required = false) final @Nullable String accountType,
            @RequestParam(required = false) final @Nullable Boolean enabled) {
        this.principalHolder.require().ensure(RoleController.PERMISSION_INDEX);
        return this.roleService.list(new RoleQuery(new PageQuery(page, size), accountType, enabled));
    }

    /** 查角色详情，附带已绑定权限 ID 集合。 */
    @GetMapping("/{id}")
    public RoleDetailView findById(@PathVariable final long id) {
        this.principalHolder.require().ensure(RoleController.PERMISSION_INDEX);
        return this.roleService.findById(id);
    }

    /** 新增角色。 */
    @PostMapping
    public RoleView create(@Valid @RequestBody final CreateRoleRequest request) {
        this.principalHolder.require().ensure(RoleController.PERMISSION_MANAGE);
        return this.roleService.create(
                new CreateRoleCommand(request.name(), request.title(), request.description(), request.accountType()));
    }

    /** 编辑角色。系统内置角色的 {@code name} 不在请求体里，天然不可改。 */
    @PostMapping("/{id}/update")
    public RoleView update(@PathVariable final long id, @Valid @RequestBody final UpdateRoleRequest request) {
        this.principalHolder.require().ensure(RoleController.PERMISSION_MANAGE);
        return this.roleService.update(
                id, new UpdateRoleCommand(request.title(), request.description(), request.enabled()));
    }

    /** 删除角色。系统内置角色拒绝删除。走 POST 语义化路径而非 DELETE 动词——design.md 已决定不引入 PUT/DELETE，避免扩展前端 `api.ts`。 */
    @PostMapping("/{id}/delete")
    public void delete(@PathVariable final long id) {
        this.principalHolder.require().ensure(RoleController.PERMISSION_MANAGE);
        this.roleService.delete(id);
    }

    /** 整体替换角色的权限集合。 */
    @PostMapping("/{id}/permissions")
    public void assignPermissions(
            @PathVariable final long id, @Valid @RequestBody final AssignPermissionsRequest request) {
        this.principalHolder.require().ensure(RoleController.PERMISSION_ASSIGN);
        this.roleService.assignPermissions(id, new AssignPermissionsCommand(request.permissionIds()));
    }
}

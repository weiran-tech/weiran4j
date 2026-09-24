package com.weiran.system.adapter.web;

import com.weiran.system.adapter.auth.PrincipalHolder;
import com.weiran.system.api.rbac.PermissionView;
import com.weiran.system.api.rbac.RoleService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 权限点查询接口。
 *
 * <p>独立于 {@link RoleController}：权限点是跨角色的全局资源，不是某个角色的子资源，
 * 因此走独立顶级路径 {@code /api/v1/permissions} 而不是 {@code /api/v1/roles/permissions}
 * （design.md API Design 已定），复用同一个 {@link RoleService}（权限点查询用例定义在那里）。
 */
@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private static final String PERMISSION_INDEX = "weiran-system:role.index";

    private final RoleService roleService;

    private final PrincipalHolder principalHolder;

    /** 查全部权限点，供权限树渲染。 */
    @GetMapping
    public List<PermissionView> list() {
        this.principalHolder.require().ensure(PermissionController.PERMISSION_INDEX);
        return this.roleService.listPermissions();
    }
}

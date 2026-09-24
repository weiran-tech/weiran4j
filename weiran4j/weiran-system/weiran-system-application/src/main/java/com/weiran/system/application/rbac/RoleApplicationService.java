package com.weiran.system.application.rbac;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.common.page.PageResult;
import com.weiran.system.api.rbac.AssignPermissionsCommand;
import com.weiran.system.api.rbac.CreateRoleCommand;
import com.weiran.system.api.rbac.PermissionView;
import com.weiran.system.api.rbac.RoleDetailView;
import com.weiran.system.api.rbac.RoleQuery;
import com.weiran.system.api.rbac.RoleService;
import com.weiran.system.api.rbac.RoleView;
import com.weiran.system.api.rbac.UpdateRoleCommand;
import com.weiran.system.domain.error.SystemErrors;
import com.weiran.system.domain.port.RoleRepository;
import com.weiran.system.domain.rbac.PermissionRef;
import com.weiran.system.domain.rbac.RoleAggregate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

/**
 * 角色管理用例。
 *
 * <p>权限分配保存是整体替换语义（{@link #assignPermissions}），包裹在事务内，
 * 避免"删了旧的、插新的一半失败"这种中间态被其他请求读到。
 */
@RequiredArgsConstructor
public class RoleApplicationService implements RoleService {

    private final RoleRepository roleRepository;

    @Override
    public PageResult<RoleView> list(final RoleQuery query) {
        final PageResult<RoleAggregate> page =
                this.roleRepository.list(query.page(), query.accountType(), query.enabled());
        return new PageResult<>(
                page.items().stream().map(RoleApplicationService::toView).toList(),
                page.total(),
                page.page(),
                page.size());
    }

    @Override
    public RoleDetailView findById(final long roleId) {
        final RoleAggregate role = this.requireRole(roleId);
        final List<Long> permissionIds = this.roleRepository.findPermissionIds(roleId);
        return new RoleDetailView(RoleApplicationService.toView(role), permissionIds);
    }

    @Override
    @Transactional
    public RoleView create(final CreateRoleCommand command) {
        final RoleAggregate role = RoleAggregate.builder()
                .name(command.name())
                .title(command.title())
                .description(command.description())
                .accountType(command.accountType())
                .enabled(true)
                .system(false)
                .build();
        return RoleApplicationService.toView(this.roleRepository.insert(role));
    }

    @Override
    @Transactional
    public RoleView update(final long roleId, final UpdateRoleCommand command) {
        final RoleAggregate role = this.requireRole(roleId);
        final RoleAggregate updated = role.updateProfile(command.title(), command.description(), command.enabled());
        this.roleRepository.update(updated);
        return RoleApplicationService.toView(updated);
    }

    @Override
    @Transactional
    public void delete(final long roleId) {
        final RoleAggregate role = this.requireRole(roleId);
        role.ensureDeletable();
        this.roleRepository.delete(roleId);
    }

    @Override
    @Transactional
    public void assignPermissions(final long roleId, final AssignPermissionsCommand command) {
        this.requireRole(roleId);
        this.roleRepository.replacePermissions(roleId, command.permissionIds());
    }

    @Override
    public List<PermissionView> listPermissions() {
        return this.roleRepository.listAllPermissions().stream()
                .map(RoleApplicationService::toView)
                .toList();
    }

    private RoleAggregate requireRole(final long roleId) {
        return this.roleRepository
                .findById(roleId)
                .orElseThrow(() -> new ErrorCodeException(SystemErrors.ROLE_NOT_FOUND));
    }

    private static RoleView toView(final RoleAggregate role) {
        return new RoleView(
                role.getId(),
                role.getName(),
                role.getTitle(),
                role.getDescription(),
                role.getAccountType(),
                role.isEnabled(),
                role.isSystem());
    }

    private static PermissionView toView(final PermissionRef permission) {
        return new PermissionView(
                permission.getId(),
                permission.getName(),
                permission.getTitle(),
                permission.getGroup(),
                permission.getModule());
    }
}

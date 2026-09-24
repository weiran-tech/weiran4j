package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.domain.port.RoleRepository;
import com.weiran.system.domain.rbac.PermissionRef;
import com.weiran.system.domain.rbac.RoleAggregate;
import com.weiran.system.infrastructure.persistence.entity.PamPermissionDO;
import com.weiran.system.infrastructure.persistence.entity.PamRoleDO;
import com.weiran.system.infrastructure.persistence.mapper.PamPermissionMapper;
import com.weiran.system.infrastructure.persistence.mapper.PamPermissionRoleMapper;
import com.weiran.system.infrastructure.persistence.mapper.PamRoleAccountMapper;
import com.weiran.system.infrastructure.persistence.mapper.PamRoleMapper;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;

/**
 * 基于 MyBatis-Plus 的角色仓储实现。
 *
 * <p>与只读的 {@code MyBatisRbacRepository}（登录鉴权链路）各自持有独立的 Mapper，
 * 不共享同一个 Mapper 类——见 design.md「Role/Permission 写模型设计决策」。
 */
@RequiredArgsConstructor
public class MyBatisRoleRepository implements RoleRepository {

    private final PamRoleMapper roleMapper;

    private final PamPermissionMapper permissionMapper;

    private final PamPermissionRoleMapper permissionRoleMapper;

    private final PamRoleAccountMapper roleAccountMapper;

    @Override
    public PageResult<RoleAggregate> list(
            final PageQuery page, final @Nullable String accountType, final @Nullable Boolean enabled) {
        final IPage<PamRoleDO> result = this.roleMapper.selectPage(
                new Page<>(page.page(), page.size()),
                Wrappers.<PamRoleDO>lambdaQuery()
                        .eq(accountType != null, PamRoleDO::getType, accountType)
                        .eq(enabled != null, PamRoleDO::getIsEnable, enabled != null && enabled ? 1 : 0));
        return PageResult.of(
                result.getRecords().stream()
                        .map(MyBatisRoleRepository::toDomain)
                        .toList(),
                result.getTotal(),
                page);
    }

    @Override
    public Optional<RoleAggregate> findById(final long roleId) {
        return Optional.ofNullable(this.roleMapper.selectById(roleId)).map(MyBatisRoleRepository::toDomain);
    }

    @Override
    public RoleAggregate insert(final RoleAggregate role) {
        final PamRoleDO record = MyBatisRoleRepository.toDO(role);
        this.roleMapper.insert(record);
        return role.toBuilder().id(record.getId()).build();
    }

    @Override
    public void update(final RoleAggregate role) {
        this.roleMapper.update(
                null,
                Wrappers.<PamRoleDO>lambdaUpdate()
                        .eq(PamRoleDO::getId, role.getId())
                        .set(PamRoleDO::getTitle, role.getTitle())
                        .set(PamRoleDO::getDescription, role.getDescription())
                        .set(PamRoleDO::getIsEnable, role.isEnabled() ? 1 : 0));
    }

    @Override
    public void delete(final long roleId) {
        this.roleMapper.deleteById(roleId);
        this.roleAccountMapper.deleteByRoleId(roleId);
        this.permissionRoleMapper.deleteByRoleId(roleId);
    }

    @Override
    public List<Long> findPermissionIds(final long roleId) {
        return this.permissionRoleMapper.selectPermissionIdsByRoleId(roleId);
    }

    @Override
    public void replacePermissions(final long roleId, final List<Long> permissionIds) {
        this.permissionRoleMapper.deleteByRoleId(roleId);
        for (final Long permissionId : permissionIds) {
            this.permissionRoleMapper.insert(permissionId, roleId);
        }
    }

    @Override
    public List<PermissionRef> listAllPermissions() {
        return this.permissionMapper.selectList(null).stream()
                .map(MyBatisRoleRepository::toDomain)
                .toList();
    }

    private static RoleAggregate toDomain(final PamRoleDO record) {
        return RoleAggregate.builder()
                .id(record.getId())
                .name(record.getName())
                .title(record.getTitle())
                .description(record.getDescription())
                .accountType(record.getType())
                .enabled(record.getIsEnable() != null && record.getIsEnable() == 1)
                .system(record.getIsSystem() != null && record.getIsSystem() == 1)
                .build();
    }

    private static PamRoleDO toDO(final RoleAggregate role) {
        final PamRoleDO record = new PamRoleDO();
        record.setName(role.getName());
        record.setTitle(role.getTitle());
        record.setDescription(role.getDescription());
        record.setType(role.getAccountType());
        record.setIsEnable(role.isEnabled() ? 1 : 0);
        record.setIsSystem(role.isSystem() ? 1 : 0);
        return record;
    }

    private static PermissionRef toDomain(final PamPermissionDO record) {
        return PermissionRef.builder()
                .id(record.getId())
                .name(record.getName())
                .title(record.getTitle())
                .group(record.getGroup())
                .module(record.getModule())
                .build();
    }
}

package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.status.EnableStatus;
import com.weiran.framework.persistence.Likes;
import com.weiran.framework.persistence.MybatisPages;
import com.weiran.system.domain.role.Role;
import com.weiran.system.domain.role.RoleCriteria;
import com.weiran.system.domain.role.RoleRepository;
import com.weiran.system.infrastructure.persistence.entity.SysRoleDO;
import com.weiran.system.infrastructure.persistence.entity.SysRoleMenuDO;
import com.weiran.system.infrastructure.persistence.entity.SysUserRoleDO;
import com.weiran.system.infrastructure.persistence.mapper.SysRoleMapper;
import com.weiran.system.infrastructure.persistence.mapper.SysRoleMenuMapper;
import com.weiran.system.infrastructure.persistence.mapper.SysUserRoleMapper;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/** {@link RoleRepository} 的 MyBatis-Plus 实现。 */
public class MybatisRoleRepository implements RoleRepository {

    private final SysRoleMapper roleMapper;

    private final SysRoleMenuMapper roleMenuMapper;

    private final SysUserRoleMapper userRoleMapper;

    /** 构造仓储。 */
    public MybatisRoleRepository(
            final SysRoleMapper roleMapper,
            final SysRoleMenuMapper roleMenuMapper,
            final SysUserRoleMapper userRoleMapper) {
        this.roleMapper = roleMapper;
        this.roleMenuMapper = roleMenuMapper;
        this.userRoleMapper = userRoleMapper;
    }

    @Override
    public Optional<Role> findById(final long id) {
        return Optional.ofNullable(this.roleMapper.selectById(id)).map(MybatisRoleRepository::toDomain);
    }

    @Override
    public boolean existsByCode(final String code) {
        return this.roleMapper.exists(Wrappers.lambdaQuery(SysRoleDO.class).eq(SysRoleDO::getCode, code));
    }

    @Override
    public long save(final Role role) {
        final SysRoleDO row = MybatisRoleRepository.toDataObject(role);
        if (row.getId() == null) {
            this.roleMapper.insert(row);
        } else {
            this.roleMapper.updateById(row);
        }
        return row.getId();
    }

    @Override
    public void deleteById(final long id) {
        this.roleMenuMapper.delete(Wrappers.lambdaQuery(SysRoleMenuDO.class).eq(SysRoleMenuDO::getRoleId, id));
        this.roleMapper.deleteById(id);
    }

    @Override
    public PageResult<Role> page(final RoleCriteria criteria, final PageQuery pageQuery) {
        final String keyword = criteria.keyword();
        final EnableStatus status = criteria.status();
        final LambdaQueryWrapper<SysRoleDO> wrapper = Wrappers.lambdaQuery(SysRoleDO.class)
                .and(
                        keyword != null,
                        w -> w.like(SysRoleDO::getName, Likes.escape(keyword))
                                .or()
                                .like(SysRoleDO::getCode, Likes.escape(keyword)))
                .eq(status != null, SysRoleDO::getStatus, status == null ? null : status.value())
                .orderByAsc(SysRoleDO::getSort)
                .orderByAsc(SysRoleDO::getId);
        return MybatisPages.toResult(
                this.roleMapper.selectPage(MybatisPages.of(pageQuery), wrapper),
                pageQuery,
                MybatisRoleRepository::toDomain);
    }

    @Override
    public List<Role> findEnabled() {
        return this.roleMapper
                .selectList(Wrappers.lambdaQuery(SysRoleDO.class)
                        .eq(SysRoleDO::getStatus, EnableStatus.ENABLED.value())
                        .orderByAsc(SysRoleDO::getSort)
                        .orderByAsc(SysRoleDO::getId))
                .stream()
                .map(MybatisRoleRepository::toDomain)
                .toList();
    }

    @Override
    public List<Role> findByIds(final Collection<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return this.roleMapper
                .selectList(Wrappers.lambdaQuery(SysRoleDO.class)
                        .in(SysRoleDO::getId, ids)
                        .orderByAsc(SysRoleDO::getSort)
                        .orderByAsc(SysRoleDO::getId))
                .stream()
                .map(MybatisRoleRepository::toDomain)
                .toList();
    }

    @Override
    public long countUsers(final long roleId) {
        return this.userRoleMapper.selectCount(
                Wrappers.lambdaQuery(SysUserRoleDO.class).eq(SysUserRoleDO::getRoleId, roleId));
    }

    @Override
    public Map<Long, Long> countUsersByRoleIds(final Collection<Long> roleIds) {
        final Map<Long, Long> result = new HashMap<>();
        if (roleIds.isEmpty()) {
            return result;
        }
        final QueryWrapper<SysUserRoleDO> wrapper = new QueryWrapper<SysUserRoleDO>()
                .select("role_id AS roleId", "COUNT(*) AS userCount")
                .in("role_id", roleIds)
                .groupBy("role_id");
        for (final Map<String, Object> row : this.userRoleMapper.selectMaps(wrapper)) {
            final Object roleId = row.get("roleId");
            final Object count = row.get("userCount");
            if (roleId instanceof final Number id && count instanceof final Number value) {
                result.put(id.longValue(), value.longValue());
            }
        }
        return result;
    }

    @Override
    public Set<Long> findMenuIds(final long roleId) {
        return this.findMenuIdsByRoleIds(List.of(roleId));
    }

    @Override
    public Set<Long> findMenuIdsByRoleIds(final Collection<Long> roleIds) {
        if (roleIds.isEmpty()) {
            return Set.of();
        }
        return this.roleMenuMapper
                .selectList(Wrappers.lambdaQuery(SysRoleMenuDO.class)
                        .in(SysRoleMenuDO::getRoleId, roleIds)
                        .orderByAsc(SysRoleMenuDO::getMenuId))
                .stream()
                .map(SysRoleMenuDO::getMenuId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    public void replaceMenus(final long roleId, final Collection<Long> menuIds) {
        this.roleMenuMapper.delete(Wrappers.lambdaQuery(SysRoleMenuDO.class).eq(SysRoleMenuDO::getRoleId, roleId));
        for (final Long menuId : new LinkedHashSet<>(menuIds)) {
            final SysRoleMenuDO link = new SysRoleMenuDO();
            link.setRoleId(roleId);
            link.setMenuId(menuId);
            this.roleMenuMapper.insert(link);
        }
    }

    private static Role toDomain(final SysRoleDO row) {
        return Role.builder()
                .id(row.getId())
                .name(row.getName())
                .code(row.getCode())
                .description(row.getDescription())
                .sort(row.getSort() == null ? 0 : row.getSort())
                .status(EnableStatus.of(row.getStatus()))
                .builtin(Boolean.TRUE.equals(row.getIsBuiltin()))
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }

    private static SysRoleDO toDataObject(final Role role) {
        final SysRoleDO row = new SysRoleDO();
        row.setId(role.getId());
        row.setName(role.getName());
        row.setCode(role.getCode());
        row.setDescription(role.getDescription());
        row.setSort(role.getSort());
        row.setStatus(role.getStatus().value());
        row.setIsBuiltin(role.isBuiltin());
        return row;
    }
}

package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.common.status.EnableStatus;
import com.weiran.system.domain.menu.Menu;
import com.weiran.system.domain.menu.MenuRepository;
import com.weiran.system.domain.menu.MenuType;
import com.weiran.system.infrastructure.persistence.entity.SysMenuDO;
import com.weiran.system.infrastructure.persistence.entity.SysRoleMenuDO;
import com.weiran.system.infrastructure.persistence.mapper.SysMenuMapper;
import com.weiran.system.infrastructure.persistence.mapper.SysRoleMenuMapper;
import java.util.List;
import java.util.Optional;

/** {@link MenuRepository} 的 MyBatis-Plus 实现。 */
public class MybatisMenuRepository implements MenuRepository {

    private final SysMenuMapper menuMapper;

    private final SysRoleMenuMapper roleMenuMapper;

    /** 构造仓储。 */
    public MybatisMenuRepository(final SysMenuMapper menuMapper, final SysRoleMenuMapper roleMenuMapper) {
        this.menuMapper = menuMapper;
        this.roleMenuMapper = roleMenuMapper;
    }

    @Override
    public Optional<Menu> findById(final long id) {
        return Optional.ofNullable(this.menuMapper.selectById(id)).map(MybatisMenuRepository::toDomain);
    }

    @Override
    public List<Menu> findAll() {
        return this.menuMapper
                .selectList(Wrappers.lambdaQuery(SysMenuDO.class)
                        .orderByAsc(SysMenuDO::getSort)
                        .orderByAsc(SysMenuDO::getId))
                .stream()
                .map(MybatisMenuRepository::toDomain)
                .toList();
    }

    @Override
    public long save(final Menu menu) {
        final SysMenuDO row = MybatisMenuRepository.toDataObject(menu);
        if (row.getId() == null) {
            this.menuMapper.insert(row);
        } else {
            this.menuMapper.updateById(row);
        }
        return row.getId();
    }

    @Override
    public void deleteById(final long id) {
        this.roleMenuMapper.delete(Wrappers.lambdaQuery(SysRoleMenuDO.class).eq(SysRoleMenuDO::getMenuId, id));
        this.menuMapper.deleteById(id);
    }

    private static Menu toDomain(final SysMenuDO row) {
        return Menu.builder()
                .id(row.getId())
                .parentId(row.getParentId() == null ? 0L : row.getParentId())
                .title(row.getTitle())
                .type(MenuType.of(row.getType()))
                .path(row.getPath())
                .component(row.getComponent())
                .icon(row.getIcon())
                .permission(row.getPermission())
                .sort(row.getSort() == null ? 0 : row.getSort())
                .visible(Boolean.TRUE.equals(row.getVisible()))
                .keepAlive(Boolean.TRUE.equals(row.getKeepAlive()))
                .external(Boolean.TRUE.equals(row.getIsExternal()))
                .status(EnableStatus.of(row.getStatus()))
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }

    private static SysMenuDO toDataObject(final Menu menu) {
        final SysMenuDO row = new SysMenuDO();
        row.setId(menu.getId());
        row.setParentId(menu.getParentId());
        row.setTitle(menu.getTitle());
        row.setType(menu.getType().value());
        row.setPath(menu.getPath());
        row.setComponent(menu.getComponent());
        row.setIcon(menu.getIcon());
        row.setPermission(menu.getPermission());
        row.setSort(menu.getSort());
        row.setVisible(menu.isVisible());
        row.setKeepAlive(menu.isKeepAlive());
        row.setIsExternal(menu.isExternal());
        row.setStatus(menu.getStatus().value());
        return row;
    }
}

package com.weiran.system.domain.role;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** 角色仓储端口（含角色-菜单关联与角色用户数统计）。 */
public interface RoleRepository {

    /** 按 ID 查找。 */
    Optional<Role> findById(long id);

    /** 编码是否已存在。 */
    boolean existsByCode(String code);

    /** 新增或更新，返回 ID。 */
    long save(Role role);

    /** 删除角色及其菜单关联。 */
    void deleteById(long id);

    /** 分页查询，按 sort、id 升序。 */
    PageResult<Role> page(RoleCriteria criteria, PageQuery pageQuery);

    /** 全部启用角色。 */
    List<Role> findEnabled();

    /** 批量按 ID 查找。 */
    List<Role> findByIds(Collection<Long> ids);

    /** 绑定了该角色的用户数。 */
    long countUsers(long roleId);

    /** 批量统计角色的用户数。 */
    Map<Long, Long> countUsersByRoleIds(Collection<Long> roleIds);

    /** 角色的菜单 ID。 */
    Set<Long> findMenuIds(long roleId);

    /** 多个角色的菜单 ID 并集。 */
    Set<Long> findMenuIdsByRoleIds(Collection<Long> roleIds);

    /** 全量覆盖角色的菜单。 */
    void replaceMenus(long roleId, Collection<Long> menuIds);
}

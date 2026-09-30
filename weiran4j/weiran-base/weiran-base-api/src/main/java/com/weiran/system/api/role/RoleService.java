package com.weiran.system.api.role;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import java.util.List;

/** 角色管理服务。 */
public interface RoleService {

    /** 分页查询。 */
    PageResult<RoleView> page(RoleQuery query, PageQuery pageQuery);

    /** 启用角色下拉。 */
    List<RoleOption> options();

    /** 详情（含菜单 ID）；不存在抛 40400。 */
    RoleDetailView get(long id);

    /** 新增，返回 ID。 */
    long create(SaveRoleCommand command);

    /** 修改；内置角色编码不可改。 */
    void update(long id, SaveRoleCommand command);

    /** 删除；内置角色或仍有用户时 40901。 */
    void delete(long id);

    /** 全量覆盖角色的菜单。 */
    void assignMenus(long id, List<Long> menuIds);
}

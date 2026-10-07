package com.weiran.system.api.menu;

import java.util.List;

/** 菜单管理服务。 */
public interface MenuService {

    /** 全量菜单树（含按钮与禁用节点），按 sort 排序。 */
    List<MenuNode> tree();

    /** 详情（children 为空）；不存在抛 40400。 */
    MenuNode get(long id);

    /** 新增，返回 ID。 */
    long create(SaveMenuCommand command);

    /** 修改；父节点不能是自己或后代（40901）。 */
    void update(long id, SaveMenuCommand command);

    /** 删除；有子节点时 40901，同时删除角色关联。 */
    void delete(long id);
}

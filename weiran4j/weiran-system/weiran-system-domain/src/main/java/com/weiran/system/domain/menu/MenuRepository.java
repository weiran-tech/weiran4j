package com.weiran.system.domain.menu;

import java.util.List;
import java.util.Optional;

/** 菜单仓储端口。菜单总量小（百级），读全量在内存里组树。 */
public interface MenuRepository {

    /** 按 ID 查找。 */
    Optional<Menu> findById(long id);

    /** 全部菜单，按 sort、id 升序。 */
    List<Menu> findAll();

    /** 新增或更新，返回 ID。 */
    long save(Menu menu);

    /** 删除菜单及其角色关联。 */
    void deleteById(long id);
}

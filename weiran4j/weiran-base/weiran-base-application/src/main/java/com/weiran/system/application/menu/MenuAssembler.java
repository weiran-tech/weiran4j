package com.weiran.system.application.menu;

import com.weiran.common.tree.Trees;
import com.weiran.system.api.menu.MenuNode;
import com.weiran.system.domain.menu.Menu;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;

/** 领域菜单 → {@link MenuNode} 与菜单树。 */
public final class MenuAssembler {

    private static final Comparator<Menu> ORDER =
            Comparator.comparingInt(Menu::getSort).thenComparingLong(Menu::requireId);

    private MenuAssembler() {}

    /** 组装菜单树，同级按 sort、id 升序。 */
    public static List<MenuNode> tree(final Collection<Menu> menus) {
        return Trees.build(menus, Menu::requireId, Menu::getParentId, MenuAssembler.ORDER, MenuAssembler::toNode);
    }

    /** 单个节点（无子节点）。 */
    public static MenuNode toNode(final Menu menu) {
        return MenuAssembler.toNode(menu, List.of());
    }

    private static MenuNode toNode(final Menu menu, final List<MenuNode> children) {
        return new MenuNode(
                menu.requireId(),
                menu.getParentId(),
                menu.getTitle(),
                menu.getType().value(),
                menu.getPath(),
                menu.getComponent(),
                menu.getIcon(),
                menu.getPermission(),
                menu.getSort(),
                menu.isVisible(),
                menu.isKeepAlive(),
                menu.isExternal(),
                menu.getStatus().value(),
                children);
    }
}

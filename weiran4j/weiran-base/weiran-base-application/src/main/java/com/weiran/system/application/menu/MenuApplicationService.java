package com.weiran.system.application.menu;

import com.weiran.common.error.BizException;
import com.weiran.common.status.EnableStatus;
import com.weiran.common.text.Texts;
import com.weiran.system.api.menu.MenuNode;
import com.weiran.system.api.menu.MenuService;
import com.weiran.system.api.menu.SaveMenuCommand;
import com.weiran.system.application.auth.AuthSnapshotCache;
import com.weiran.system.domain.hierarchy.Hierarchy;
import com.weiran.system.domain.menu.Menu;
import com.weiran.system.domain.menu.MenuRepository;
import com.weiran.system.domain.menu.MenuType;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;

/** 菜单管理用例。菜单变化会影响权限码与可见菜单，因此全部授权快照失效。 */
public class MenuApplicationService implements MenuService {

    private final MenuRepository menuRepository;

    private final AuthSnapshotCache cache;

    /** 构造服务。 */
    public MenuApplicationService(final MenuRepository menuRepository, final AuthSnapshotCache cache) {
        this.menuRepository = menuRepository;
        this.cache = cache;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuNode> tree() {
        return MenuAssembler.tree(this.menuRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public MenuNode get(final long id) {
        return MenuAssembler.toNode(this.requireMenu(id));
    }

    @Override
    @Transactional
    public long create(final SaveMenuCommand command) {
        final Menu parent = this.parentOf(command.parentId());
        final Menu menu =
                MenuApplicationService.apply(Menu.builder(), command, null).build();
        menu.validate(parent);
        final long id = this.menuRepository.save(menu);
        this.cache.evictAll();
        return id;
    }

    @Override
    @Transactional
    public void update(final long id, final SaveMenuCommand command) {
        final Menu existing = this.requireMenu(id);
        final Hierarchy hierarchy = this.hierarchy();
        hierarchy.ensureValidParent(id, command.parentId(), "菜单");
        if (MenuType.of(command.type()) == MenuType.BUTTON && hierarchy.hasChildren(id)) {
            throw BizException.badRequest("type: 有子节点的菜单不能改为按钮");
        }
        final Menu parent = this.parentOf(command.parentId());
        final Menu updated = MenuApplicationService.apply(existing.toBuilder(), command, existing)
                .build();
        updated.validate(parent);
        this.menuRepository.save(updated);
        this.cache.evictAll();
    }

    @Override
    @Transactional
    public void delete(final long id) {
        this.requireMenu(id);
        if (this.hierarchy().hasChildren(id)) {
            throw BizException.conflict("请先删除子菜单");
        }
        this.menuRepository.deleteById(id);
        this.cache.evictAll();
    }

    private Menu requireMenu(final long id) {
        return this.menuRepository.findById(id).orElseThrow(() -> BizException.notFound("菜单不存在"));
    }

    private @Nullable Menu parentOf(final long parentId) {
        if (parentId == Hierarchy.ROOT) {
            return null;
        }
        return this.menuRepository.findById(parentId).orElseThrow(() -> BizException.badRequest("parentId: 上级菜单不存在"));
    }

    private Hierarchy hierarchy() {
        final Map<Long, Long> parentById = new HashMap<>();
        this.menuRepository.findAll().forEach(menu -> parentById.put(menu.requireId(), menu.getParentId()));
        return Hierarchy.of(parentById);
    }

    /** 把命令写入 builder；可选字段为空时，新建取默认值，修改保持原值（{@code base}）。 */
    private static Menu.MenuBuilder apply(
            final Menu.MenuBuilder builder, final SaveMenuCommand command, final @Nullable Menu base) {
        return builder.parentId(command.parentId())
                .title(command.title().strip())
                .type(MenuType.of(command.type()))
                .path(Texts.trimToNull(command.path()))
                .component(Texts.trimToNull(command.component()))
                .icon(Texts.trimToNull(command.icon()))
                .permission(Texts.trimToNull(command.permission()))
                .sort(command.sort() != null ? command.sort() : base == null ? 0 : base.getSort())
                .visible(command.visible() != null ? command.visible() : base == null || base.isVisible())
                .keepAlive(command.keepAlive() != null ? command.keepAlive() : base != null && base.isKeepAlive())
                .external(command.isExternal() != null ? command.isExternal() : base != null && base.isExternal())
                .status(EnableStatus.ofNullable(
                        command.status(), base == null ? EnableStatus.ENABLED : base.getStatus()));
    }
}

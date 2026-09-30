package com.weiran.system.adapter.web;

import com.weiran.common.response.ApiResponse;
import com.weiran.common.response.IdResult;
import com.weiran.framework.auth.RequiresPermission;
import com.weiran.framework.log.OperationLog;
import com.weiran.system.adapter.web.request.SaveMenuRequest;
import com.weiran.system.api.menu.MenuNode;
import com.weiran.system.api.menu.MenuService;
import com.weiran.system.api.menu.SaveMenuCommand;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 菜单管理接口 {@code /api/menus}。 */
@RestController
@RequestMapping("/api/menus")
public class MenuController {

    private static final String MODULE = "菜单管理";

    private final MenuService menuService;

    /** 构造控制器。 */
    public MenuController(final MenuService menuService) {
        this.menuService = menuService;
    }

    /** 全量菜单树。 */
    @RequiresPermission("system:menu:list")
    @GetMapping
    public List<MenuNode> tree() {
        return this.menuService.tree();
    }

    /** 详情。 */
    @RequiresPermission("system:menu:list")
    @GetMapping("/{id}")
    public MenuNode get(@PathVariable final long id) {
        return this.menuService.get(id);
    }

    /** 新增。 */
    @RequiresPermission("system:menu:create")
    @OperationLog(module = MenuController.MODULE, description = "新增菜单")
    @PostMapping
    public IdResult create(@Valid @RequestBody final SaveMenuRequest request) {
        return new IdResult(this.menuService.create(MenuController.toCommand(request)));
    }

    /** 修改。 */
    @RequiresPermission("system:menu:update")
    @OperationLog(module = MenuController.MODULE, description = "修改菜单")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable final long id, @Valid @RequestBody final SaveMenuRequest request) {
        this.menuService.update(id, MenuController.toCommand(request));
        return ApiResponse.ok();
    }

    /** 删除。 */
    @RequiresPermission("system:menu:delete")
    @OperationLog(module = MenuController.MODULE, description = "删除菜单")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable final long id) {
        this.menuService.delete(id);
        return ApiResponse.ok();
    }

    private static SaveMenuCommand toCommand(final SaveMenuRequest request) {
        return new SaveMenuCommand(
                request.parentId(),
                request.title(),
                request.type(),
                request.path(),
                request.component(),
                request.icon(),
                request.permission(),
                request.sort(),
                request.visible(),
                request.keepAlive(),
                request.isExternal(),
                request.status());
    }
}

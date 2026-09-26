package com.weiran.platform.adapter.web;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.response.ApiResponse;
import com.weiran.common.response.IdResult;
import com.weiran.framework.auth.RequiresPermission;
import com.weiran.framework.log.OperationLog;
import com.weiran.platform.adapter.web.request.SaveDictItemRequest;
import com.weiran.platform.adapter.web.request.SaveDictRequest;
import com.weiran.platform.api.dict.DictItemView;
import com.weiran.platform.api.dict.DictQuery;
import com.weiran.platform.api.dict.DictService;
import com.weiran.platform.api.dict.DictView;
import com.weiran.platform.api.dict.SaveDictCommand;
import com.weiran.platform.api.dict.SaveDictItemCommand;
import jakarta.validation.Valid;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 字典管理接口 {@code /api/dicts}。 */
@RestController
@RequestMapping("/api/dicts")
public class DictController {

    private static final String MODULE = "字典管理";

    private final DictService dictService;

    /** 构造控制器。 */
    public DictController(final DictService dictService) {
        this.dictService = dictService;
    }

    /** 分页查询。 */
    @RequiresPermission("system:dict:list")
    @GetMapping
    public PageResult<DictView> page(
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String status,
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize) {
        return this.dictService.page(new DictQuery(keyword, status), new PageQuery(page, pageSize));
    }

    /** 按编码取启用的字典项，供前端下拉与标签。 */
    @GetMapping("/code/{code}/items")
    public List<DictItemView> itemsByCode(@PathVariable final String code) {
        return this.dictService.enabledItemsByCode(code);
    }

    /** 详情。 */
    @RequiresPermission("system:dict:list")
    @GetMapping("/{id}")
    public DictView get(@PathVariable final long id) {
        return this.dictService.get(id);
    }

    /** 新增。 */
    @RequiresPermission("system:dict:create")
    @OperationLog(module = DictController.MODULE, description = "新增字典")
    @PostMapping
    public IdResult create(@Valid @RequestBody final SaveDictRequest request) {
        return new IdResult(this.dictService.create(DictController.toCommand(request)));
    }

    /** 修改。 */
    @RequiresPermission("system:dict:update")
    @OperationLog(module = DictController.MODULE, description = "修改字典")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable final long id, @Valid @RequestBody final SaveDictRequest request) {
        this.dictService.update(id, DictController.toCommand(request));
        return ApiResponse.ok();
    }

    /** 删除（级联删除字典项）。 */
    @RequiresPermission("system:dict:delete")
    @OperationLog(module = DictController.MODULE, description = "删除字典")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable final long id) {
        this.dictService.delete(id);
        return ApiResponse.ok();
    }

    /** 字典项列表。 */
    @RequiresPermission("system:dict:list")
    @GetMapping("/{id}/items")
    public List<DictItemView> items(@PathVariable final long id) {
        return this.dictService.items(id);
    }

    /** 新增字典项。 */
    @RequiresPermission("system:dict:update")
    @OperationLog(module = DictController.MODULE, description = "新增字典项")
    @PostMapping("/{id}/items")
    public IdResult createItem(@PathVariable final long id, @Valid @RequestBody final SaveDictItemRequest request) {
        return new IdResult(this.dictService.createItem(id, DictController.toCommand(request)));
    }

    /** 修改字典项。 */
    @RequiresPermission("system:dict:update")
    @OperationLog(module = DictController.MODULE, description = "修改字典项")
    @PutMapping("/{id}/items/{itemId}")
    public ApiResponse<Void> updateItem(
            @PathVariable final long id,
            @PathVariable final long itemId,
            @Valid @RequestBody final SaveDictItemRequest request) {
        this.dictService.updateItem(id, itemId, DictController.toCommand(request));
        return ApiResponse.ok();
    }

    /** 删除字典项。 */
    @RequiresPermission("system:dict:update")
    @OperationLog(module = DictController.MODULE, description = "删除字典项")
    @DeleteMapping("/{id}/items/{itemId}")
    public ApiResponse<Void> deleteItem(@PathVariable final long id, @PathVariable final long itemId) {
        this.dictService.deleteItem(id, itemId);
        return ApiResponse.ok();
    }

    private static SaveDictCommand toCommand(final SaveDictRequest request) {
        return new SaveDictCommand(request.name(), request.code(), request.description(), request.status());
    }

    private static SaveDictItemCommand toCommand(final SaveDictItemRequest request) {
        return new SaveDictItemCommand(
                request.label(), request.value(), request.color(), request.sort(), request.status(), request.remark());
    }
}

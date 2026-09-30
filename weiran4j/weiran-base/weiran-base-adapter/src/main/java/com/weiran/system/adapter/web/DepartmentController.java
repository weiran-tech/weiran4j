package com.weiran.system.adapter.web;

import com.weiran.common.response.ApiResponse;
import com.weiran.common.response.IdResult;
import com.weiran.framework.auth.RequiresPermission;
import com.weiran.framework.log.OperationLog;
import com.weiran.system.adapter.web.request.SaveDepartmentRequest;
import com.weiran.system.api.department.DepartmentNode;
import com.weiran.system.api.department.DepartmentService;
import com.weiran.system.api.department.SaveDepartmentCommand;
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

/** 部门管理接口 {@code /api/departments}。部门树只需登录，供各处下拉共用。 */
@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private static final String MODULE = "部门管理";

    private final DepartmentService departmentService;

    /** 构造控制器。 */
    public DepartmentController(final DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    /** 部门树。 */
    @GetMapping
    public List<DepartmentNode> tree(@RequestParam(required = false) final @Nullable String status) {
        return this.departmentService.tree(status);
    }

    /** 详情。 */
    @RequiresPermission("system:department:list")
    @GetMapping("/{id}")
    public DepartmentNode get(@PathVariable final long id) {
        return this.departmentService.get(id);
    }

    /** 新增。 */
    @RequiresPermission("system:department:create")
    @OperationLog(module = DepartmentController.MODULE, description = "新增部门")
    @PostMapping
    public IdResult create(@Valid @RequestBody final SaveDepartmentRequest request) {
        return new IdResult(this.departmentService.create(DepartmentController.toCommand(request)));
    }

    /** 修改。 */
    @RequiresPermission("system:department:update")
    @OperationLog(module = DepartmentController.MODULE, description = "修改部门")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(
            @PathVariable final long id, @Valid @RequestBody final SaveDepartmentRequest request) {
        this.departmentService.update(id, DepartmentController.toCommand(request));
        return ApiResponse.ok();
    }

    /** 删除。 */
    @RequiresPermission("system:department:delete")
    @OperationLog(module = DepartmentController.MODULE, description = "删除部门")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable final long id) {
        this.departmentService.delete(id);
        return ApiResponse.ok();
    }

    private static SaveDepartmentCommand toCommand(final SaveDepartmentRequest request) {
        return new SaveDepartmentCommand(
                request.parentId(),
                request.name(),
                request.code(),
                request.leaderId(),
                request.phone(),
                request.sort(),
                request.status());
    }
}

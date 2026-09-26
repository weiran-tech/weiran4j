package com.weiran.platform.adapter.web;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.framework.auth.RequiresPermission;
import com.weiran.platform.api.operationlog.OperationLogQuery;
import com.weiran.platform.api.operationlog.OperationLogService;
import com.weiran.platform.api.operationlog.OperationLogView;
import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 操作日志接口 {@code /api/operation-logs}。 */
@RestController
@RequestMapping("/api/operation-logs")
public class OperationLogController {

    private final OperationLogService operationLogService;

    /** 构造控制器。 */
    public OperationLogController(final OperationLogService operationLogService) {
        this.operationLogService = operationLogService;
    }

    /** 分页查询，按 ID 倒序；{@code success} 传 {@code true / false}。 */
    @RequiresPermission("system:operation-log:list")
    @GetMapping
    public PageResult<OperationLogView> page(
            @RequestParam(required = false) final @Nullable String username,
            @RequestParam(required = false) final @Nullable String module,
            @RequestParam(required = false) final @Nullable Boolean success,
            @RequestParam(required = false) final @Nullable LocalDateTime startTime,
            @RequestParam(required = false) final @Nullable LocalDateTime endTime,
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize) {
        return this.operationLogService.page(
                new OperationLogQuery(username, module, success, startTime, endTime), new PageQuery(page, pageSize));
    }

    /** 详情。 */
    @RequiresPermission("system:operation-log:list")
    @GetMapping("/{id}")
    public OperationLogView get(@PathVariable final long id) {
        return this.operationLogService.get(id);
    }
}

package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.log.OperationLog;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.system.api.batch.BatchJobService;
import com.wulicode.weiran.system.api.batch.BatchJobView;
import com.wulicode.weiran.system.api.batch.BatchTaskDetailView;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** 批处理任务入口；所有读写均绑定当前登录用户。 */
@RestController
@RequestMapping("/api-backend/system/batchJob")
public class BatchJobController {

    private final BatchJobService service;

    public BatchJobController(final BatchJobService service) {
        this.service = service;
    }

    @PostMapping("/create")
    @RequiresPermission("system:batch-job:create")
    @OperationLog(module = "批处理", description = "创建批处理任务")
    public BatchJobView create(@RequestParam final String kind, @RequestParam final MultipartFile file)
            throws IOException {
        if (file.isEmpty() || file.getOriginalFilename() == null) {
            throw BizException.badRequest("文件无效");
        }
        try (InputStream input = file.getInputStream()) {
            return this.service.create(
                    kind,
                    file.getOriginalFilename(),
                    input,
                    file.getSize(),
                    CurrentUser.require().id());
        }
    }

    @GetMapping("/get/{id}")
    @RequiresPermission("system:batch-job:list")
    public BatchJobView get(@PathVariable final long id) {
        return this.service.get(id, CurrentUser.require().id());
    }

    @GetMapping("/list")
    @RequiresPermission("system:batch-job:list")
    public List<BatchJobView> list(@RequestParam(defaultValue = "") final String kinds) {
        final List<String> filter = kinds.isBlank() ? List.of() : Arrays.asList(kinds.split(",", -1));
        return this.service.recent(CurrentUser.require().id(), filter);
    }

    @PostMapping("/cancel/{id}")
    @RequiresPermission("system:batch-job:cancel")
    @OperationLog(module = "批处理", description = "取消批处理任务")
    public BatchJobView cancel(@PathVariable final long id) {
        return this.service.cancel(id, CurrentUser.require().id());
    }

    @GetMapping("/listDetails/{id}")
    @RequiresPermission("system:batch-job:list")
    public PageResult<BatchTaskDetailView> listDetails(
            @PathVariable final long id,
            @RequestParam(required = false) final String stage,
            @RequestParam(required = false) final String status,
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize) {
        return this.service.details(id, CurrentUser.require().id(), stage, status, new PageQuery(page, pageSize));
    }
}

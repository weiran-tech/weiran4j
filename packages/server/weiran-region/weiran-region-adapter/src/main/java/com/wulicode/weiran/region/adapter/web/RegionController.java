package com.wulicode.weiran.region.adapter.web;

import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.log.OperationLog;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.region.adapter.web.request.CreateRegionRequest;
import com.wulicode.weiran.region.adapter.web.request.UpdateRegionRequest;
import com.wulicode.weiran.region.api.region.RegionNode;
import com.wulicode.weiran.region.api.region.RegionView;
import com.wulicode.weiran.region.application.region.RegionApplicationService;
import com.wulicode.weiran.region.application.region.RegionFilter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 行政区划管理与登录态 lookup API。 */
@RestController
@RequestMapping("/api-backend/region/area")
public class RegionController {

    private static final String MODULE = "行政区划管理";

    private static final String CSV_HEADER = "\uFEFFID,名称,区划代码,级别,父级代码,排序,状态,创建时间\r\n";

    private final RegionApplicationService regionService;

    /** 构造地区控制器。 */
    public RegionController(final RegionApplicationService regionService) {
        this.regionService = regionService;
    }

    /** 管理树。 */
    @RequiresPermission("region:list")
    @GetMapping("/listTree")
    public List<RegionNode> tree(
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String level,
            @RequestParam(required = false) final @Nullable String status) {
        return this.regionService.tree(new RegionFilter(keyword, level, status));
    }

    /** 管理平铺列表。 */
    @RequiresPermission("region:list")
    @GetMapping("/list")
    public List<RegionView> flat(
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String level,
            @RequestParam(required = false) final @Nullable String status) {
        return this.regionService.flat(new RegionFilter(keyword, level, status));
    }

    /** 启用地区树；仅要求登录，不要求管理权限。 */
    @GetMapping("/getEnabledTree")
    public List<RegionNode> lookup() {
        return this.regionService.enabledTree();
    }

    /** 地区详情。 */
    @RequiresPermission("region:list")
    @GetMapping("/get/{id}")
    public RegionView get(@PathVariable final long id) {
        return this.regionService.get(id);
    }

    /** 新增地区。 */
    @RequiresPermission("region:create")
    @OperationLog(module = RegionController.MODULE, description = "新增地区")
    @PostMapping("/create")
    public RegionView create(@jakarta.validation.Valid @RequestBody final CreateRegionRequest request) {
        return this.regionService.create(request.toCommand());
    }

    /** 修改地区。 */
    @RequiresPermission("region:update")
    @OperationLog(module = RegionController.MODULE, description = "修改地区")
    @PutMapping("/update/{id}")
    public RegionView update(
            @PathVariable final long id, @jakarta.validation.Valid @RequestBody final UpdateRegionRequest request) {
        return this.regionService.update(id, request.toCommand());
    }

    /** 删除地区。 */
    @RequiresPermission("region:delete")
    @OperationLog(module = RegionController.MODULE, description = "删除地区")
    @DeleteMapping("/delete/{id}")
    public ApiResponse<Void> delete(@PathVariable final long id) {
        this.regionService.delete(id);
        return ApiResponse.ok();
    }

    /** 导出当前筛选条件下的全部匹配地区。 */
    @RequiresPermission("region:export")
    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String level,
            @RequestParam(required = false) final @Nullable String status) {
        final List<RegionView> rows = this.regionService.flat(new RegionFilter(keyword, level, status));
        final StringBuilder csv = new StringBuilder(RegionController.CSV_HEADER);
        rows.forEach(row -> csv.append(row.id())
                .append(',')
                .append(RegionController.csv(row.name()))
                .append(',')
                .append(RegionController.csv(row.code()))
                .append(',')
                .append(RegionController.csv(row.level()))
                .append(',')
                .append(RegionController.csv(row.parentCode()))
                .append(',')
                .append(row.sort())
                .append(',')
                .append(RegionController.csv(row.status()))
                .append(',')
                .append(RegionController.csv(row.createdAt().toString()))
                .append("\r\n"));
        final byte[] body = csv.toString().getBytes(StandardCharsets.UTF_8);
        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("regions.csv", StandardCharsets.UTF_8)
                .build());
        return ResponseEntity.ok().headers(headers).body(body);
    }

    private static String csv(final @Nullable String value) {
        if (value == null) {
            return "";
        }
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}

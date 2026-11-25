package com.wulicode.weiran.demo.batch;

import com.wulicode.weiran.demo.batch.DemoBatchItemStore.DemoBatchItem;
import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.web.SkipApiResponse;
import com.wulicode.weiran.system.api.batch.BatchJobService;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** local/test 演示结果查询。 */
@RestController
@RequestMapping("/api-backend/demo/batchItem")
public class DemoBatchController {

    private final BatchJobService jobs;
    private final DemoBatchItemStore items;

    public DemoBatchController(final BatchJobService jobs, final DemoBatchItemStore items) {
        this.jobs = jobs;
        this.items = items;
    }

    @GetMapping("/list/{jobId}")
    @RequiresPermission("system:batch-job:list")
    public PageResult<DemoBatchItem> list(
            @PathVariable final long jobId,
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize) {
        this.jobs.get(jobId, CurrentUser.require().id());
        return this.items.list(jobId, new PageQuery(page, pageSize));
    }

    @GetMapping("/excelTemplate")
    @RequiresPermission("system:batch-job:create")
    @SkipApiResponse
    public ResponseEntity<byte[]> excelTemplate() throws IOException {
        return this.excelSample(false);
    }

    @GetMapping("/excelErrorTemplate")
    @RequiresPermission("system:batch-job:create")
    @SkipApiResponse
    public ResponseEntity<byte[]> excelErrorTemplate() throws IOException {
        return this.excelSample(true);
    }

    private ResponseEntity<byte[]> excelSample(final boolean invalid) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            final var sheet = workbook.createSheet("data");
            final var header = sheet.createRow(0);
            header.createCell(0).setCellValue("name");
            header.createCell(1).setCellValue("value");
            final var example = sheet.createRow(1);
            example.createCell(0).setCellValue("示例名称");
            example.createCell(1).setCellValue("示例值");
            if (invalid) {
                sheet.createRow(2).createCell(1).setCellValue("缺少 name");
                sheet.createRow(3).createCell(0).setCellValue("缺少 value");
            }
            workbook.write(output);
            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=" + (invalid ? "demo-batch-errors.xlsx" : "demo-batch.xlsx"))
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(output.toByteArray());
        }
    }

    @GetMapping("/zipTemplate")
    @RequiresPermission("system:batch-job:create")
    @SkipApiResponse
    public ResponseEntity<byte[]> zipTemplate() throws IOException {
        return this.zipSample(false);
    }

    @GetMapping("/zipErrorTemplate")
    @RequiresPermission("system:batch-job:create")
    @SkipApiResponse
    public ResponseEntity<byte[]> zipErrorTemplate() throws IOException {
        return this.zipSample(true);
    }

    private ResponseEntity<byte[]> zipSample(final boolean invalid) throws IOException {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
                ZipOutputStream zip = new ZipOutputStream(output)) {
            final List<String> names = invalid
                    ? List.of("first.txt", "unsupported.exe", "unsupported.bat")
                    : List.of("first.txt", "second.txt");
            for (final String name : names) {
                zip.putNextEntry(new ZipEntry(name));
                zip.write(("批处理演示文件：" + name).getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
            zip.finish();
            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=" + (invalid ? "demo-batch-errors.zip" : "demo-batch.zip"))
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .body(output.toByteArray());
        }
    }
}

package com.weiran.cqt.adapter.portal;

import com.weiran.cqt.api.file.FileUploadService;
import com.weiran.cqt.api.file.UploadedFileView;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

/** 前台文件上传（沿用原系统 {@code /api/local-files/upload} 的路径与返回字段；需登录）。 */
@PortalController
@RequestMapping("/api-web/local-files")
public class LocalFilesController {

    private final FileUploadService fileUploadService;

    /** 构造 Controller。 */
    public LocalFilesController(final FileUploadService fileUploadService) {
        this.fileUploadService = fileUploadService;
    }

    /** 上传一个文件（multipart 字段 {@code file}），返回 {@code {url, name, path, size}}。 */
    @PostMapping("/upload")
    public PortalResult<UploadedFileView> upload(
            @RequestParam(value = "file", required = false) final @Nullable MultipartFile file) {
        final long accountId = PortalAccount.current().orElseThrow();
        if (file == null) {
            return PortalResult.ok(this.fileUploadService.upload(
                    accountId,
                    null,
                    0,
                    () -> {
                        throw new IllegalStateException("无文件");
                    },
                    null));
        }
        return PortalResult.ok(this.fileUploadService.upload(
                accountId, file.getOriginalFilename(), file.getSize(), file::getInputStream, file.getContentType()));
    }
}

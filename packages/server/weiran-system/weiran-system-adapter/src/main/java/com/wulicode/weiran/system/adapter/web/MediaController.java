package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.log.OperationLog;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.system.api.media.CompleteDirectUploadRequest;
import com.wulicode.weiran.system.api.media.DirectUploadView;
import com.wulicode.weiran.system.api.media.FileUploadView;
import com.wulicode.weiran.system.api.media.MediaService;
import com.wulicode.weiran.system.api.media.MediaUploadSettingsView;
import com.wulicode.weiran.system.api.media.MediaView;
import java.io.IOException;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** 系统文件上传和资源库管理接口。 */
@RestController
public class MediaController {

    private final MediaService service;

    public MediaController(final MediaService service) {
        this.service = service;
    }

    @GetMapping("/api-backend/system/media/getUploadSettings")
    public MediaUploadSettingsView uploadSettings() {
        return this.service.uploadSettings();
    }

    @GetMapping("/api-backend/system/media/getDirectUploadAuthorization")
    @OperationLog(module = "资源库", description = "获取直传授权")
    public @Nullable DirectUploadView directUploadAuthorization() {
        return this.service.directUploadAuthorization(CurrentUser.require().id());
    }

    @PostMapping("/api-backend/system/media/completeDirectUpload")
    public FileUploadView completeDirectUpload(@RequestBody final CompleteDirectUploadRequest request) {
        return this.service.completeDirectUpload(request, CurrentUser.require().id());
    }

    @PostMapping({"/api-backend/system/media/uploadImage", "/api-backend/system/media/uploadFile"})
    @OperationLog(module = "资源库", description = "上传文件")
    public FileUploadView upload(@RequestParam("file") final MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getOriginalFilename() == null) {
            throw BizException.badRequest("文件无效");
        }
        return this.service.upload(
                file.getOriginalFilename(),
                file.getInputStream(),
                file.getSize(),
                CurrentUser.require().id());
    }

    @GetMapping("/api-backend/system/mediaLibrary/list")
    @RequiresPermission("system:media-library:list")
    public PageResult<MediaView> page(
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize,
            @RequestParam(required = false) final @Nullable String keyword,
            @RequestParam(required = false) final @Nullable String category) {
        if (category != null && !category.matches("image|video|document|archive")) {
            throw BizException.badRequest("文件类型无效");
        }
        return this.service.page(keyword, category, new PageQuery(page, pageSize));
    }

    @DeleteMapping("/api-backend/system/mediaLibrary/delete/{id}")
    @RequiresPermission("system:media-library:delete")
    @OperationLog(module = "资源库", description = "删除文件")
    public ApiResponse<Void> delete(@PathVariable final long id) {
        this.service.delete(id);
        return ApiResponse.ok();
    }
}

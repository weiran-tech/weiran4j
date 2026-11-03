package com.wulicode.weiran.system.api.media;

import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import java.io.IOException;
import java.io.InputStream;
import org.jspecify.annotations.Nullable;

/** 文件资源管理服务。 */
public interface MediaService {

    MediaUploadSettingsView uploadSettings();

    @Nullable
    DirectUploadView directUploadAuthorization(long userId);

    FileUploadView completeDirectUpload(CompleteDirectUploadRequest request, long userId);

    FileUploadView upload(String originalName, InputStream content, long size, long uploadedBy) throws IOException;

    PageResult<MediaView> page(@Nullable String keyword, @Nullable String category, PageQuery pageQuery);

    default PageResult<MediaView> page(final @Nullable String keyword, final PageQuery pageQuery) {
        return this.page(keyword, null, pageQuery);
    }

    void delete(long id);
}

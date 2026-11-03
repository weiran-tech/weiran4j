package com.wulicode.weiran.system.domain.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MediaUploadPolicyTest {

    private static final long MB = 1024L * 1024L;

    @Test
    @DisplayName("上传配置分别控制图片格式与大小、视频大小、普通文件格式")
    void configuredLimitsApplyToEachCategory() {
        final MediaUploadPolicy policy = MediaUploadPolicy.from(Map.of(
                "system.upload.image_formats", "png,gif",
                "system.upload.image_max_size_mb", "2",
                "system.upload.video_formats", "mp4",
                "system.upload.video_max_size_mb", "5",
                "system.upload.file_formats", "pdf,txt",
                "system.upload.file_max_size_mb", "3"));

        assertThat(policy.imageFormats()).containsExactly("png", "gif");
        assertThatCode(() -> policy.validate("png", 2 * MediaUploadPolicyTest.MB))
                .doesNotThrowAnyException();
        assertThatCode(() -> policy.validate("mp4", 5 * MediaUploadPolicyTest.MB))
                .doesNotThrowAnyException();
        assertThatCode(() -> policy.validate("pdf", MediaUploadPolicyTest.MB)).doesNotThrowAnyException();
        assertThatCode(() -> policy.validate("txt", 3 * MediaUploadPolicyTest.MB))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.validate("txt", 4 * MediaUploadPolicyTest.MB))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> policy.validate("jpg", 1)).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> policy.validate("png", 3 * MediaUploadPolicyTest.MB))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> policy.validate("mp4", 6 * MediaUploadPolicyTest.MB))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> policy.validate("webm", 1)).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> policy.validate("zip", 1)).isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("缺失或非法配置回退默认值")
    void invalidSettingsFallBack() {
        final MediaUploadPolicy policy = MediaUploadPolicy.from(Map.of(
                "system.upload.image_formats", "svg",
                "system.upload.image_max_size_mb", "101",
                "system.upload.video_formats", "exe",
                "system.upload.video_max_size_mb", "1025",
                "system.upload.file_formats", "exe",
                "system.upload.file_max_size_mb", "1025"));
        assertThat(policy).isEqualTo(MediaUploadPolicy.defaults());
        assertThatThrownBy(() -> policy.validate("png", 0)).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> policy.validate("png", -1)).isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("视频上限可设为 1024 MB，超过上限的文件被拒绝")
    void acceptsOneGigabyteVideoLimit() {
        final MediaUploadPolicy policy = MediaUploadPolicy.from(Map.of("system.upload.video_max_size_mb", "1024"));
        assertThat(policy.videoMaxSizeMb()).isEqualTo(1024);
        assertThatCode(() -> policy.validate("mp4", 1024 * MediaUploadPolicyTest.MB))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.validate("mp4", 1024 * MediaUploadPolicyTest.MB + 1))
                .isInstanceOf(BizException.class);
    }

    @Test
    @DisplayName("普通文件扩展名可增删，但可执行或网页格式不能启用")
    void configurableFileExtensions() {
        final MediaUploadPolicy policy = MediaUploadPolicy.from(Map.of("system.upload.file_formats", "pdf,md"));
        assertThatCode(() -> policy.validate("md", 1)).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.validate("zip", 1)).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> MediaUploadPolicy.from(Map.of("system.upload.file_formats", "html"))
                        .validate("html", 1))
                .isInstanceOf(BizException.class);
    }
}

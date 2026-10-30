package com.wulicode.weiran.system.domain.media;

import com.wulicode.weiran.framework.error.BizException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.jspecify.annotations.Nullable;

/** 从系统配置生成的上传约束；缺失或无效的配置回退到安全默认值。 */
public record MediaUploadPolicy(
        List<String> imageFormats, int imageMaxSizeMb, int videoMaxSizeMb, List<String> fileFormats) {

    private static final Set<String> IMAGE_CHOICES = Set.of("gif", "jpg", "jpeg", "png");
    private static final long MEBIBYTE = 1024L * 1024L;

    public static MediaUploadPolicy defaults() {
        return new MediaUploadPolicy(List.of("gif", "jpg", "jpeg", "png"), 10, 100, List.of("pdf", "gif"));
    }

    public static MediaUploadPolicy from(final Map<String, String> values) {
        final MediaUploadPolicy defaults = MediaUploadPolicy.defaults();
        return new MediaUploadPolicy(
                MediaUploadPolicy.formats(
                        values.get("system.upload.image_formats"), IMAGE_CHOICES, defaults.imageFormats()),
                MediaUploadPolicy.size(values.get("system.upload.image_max_size_mb"), defaults.imageMaxSizeMb(), 100),
                MediaUploadPolicy.size(values.get("system.upload.video_max_size_mb"), defaults.videoMaxSizeMb(), 1024),
                MediaUploadPolicy.formats(
                        values.get("system.upload.file_formats"),
                        Set.of(
                                "pdf", "gif", "jpg", "jpeg", "png", "webp", "txt", "csv", "doc", "docx", "xls", "xlsx",
                                "ppt", "pptx", "zip"),
                        defaults.fileFormats()));
    }

    public void validate(final String extension, final long size) {
        if (!MediaFileTypes.allowed(extension)) {
            throw BizException.badRequest("不支持该文件类型");
        }
        final int maxSize;
        if (MediaFileTypes.video(extension)) {
            maxSize = this.videoMaxSizeMb;
        } else if (MediaFileTypes.image(extension)) {
            if (!this.imageFormats.contains(extension)) {
                throw BizException.badRequest("该图片格式未启用");
            }
            maxSize = this.imageMaxSizeMb;
        } else {
            if (!this.fileFormats.contains(extension)) {
                throw BizException.badRequest("该文件格式未启用");
            }
            maxSize = 10;
        }
        if (size == 0 || size > maxSize * MediaUploadPolicy.MEBIBYTE) {
            throw BizException.badRequest("文件须大于 0 且不超过 " + maxSize + " MB");
        }
    }

    private static int size(final @Nullable String value, final int fallback, final int maximum) {
        if (value == null) {
            return fallback;
        }
        try {
            final int parsed = Integer.parseInt(value);
            return parsed >= 1 && parsed <= maximum ? parsed : fallback;
        } catch (final NumberFormatException ignored) {
            return fallback;
        }
    }

    private static List<String> formats(
            final @Nullable String value, final Set<String> choices, final List<String> fallback) {
        if (value == null) {
            return fallback;
        }
        final LinkedHashSet<String> parsed = new LinkedHashSet<>();
        for (final String item : value.toLowerCase(Locale.ROOT).split(",", -1)) {
            parsed.add(item.trim());
        }
        return !parsed.isEmpty() && choices.containsAll(parsed) && !parsed.contains("")
                ? List.copyOf(parsed)
                : fallback;
    }
}

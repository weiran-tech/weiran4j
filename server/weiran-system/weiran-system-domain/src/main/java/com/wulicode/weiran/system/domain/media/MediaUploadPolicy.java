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
        List<String> imageFormats,
        int imageMaxSizeMb,
        List<String> videoFormats,
        int videoMaxSizeMb,
        List<String> fileFormats,
        int fileMaxSizeMb) {

    private static final Set<String> IMAGE_CHOICES = Set.of("gif", "jpg", "jpeg", "png", "webp");
    private static final Set<String> VIDEO_CHOICES = Set.of("mp4", "webm", "mov");
    private static final long MEBIBYTE = 1024L * 1024L;

    public static MediaUploadPolicy defaults() {
        return new MediaUploadPolicy(
                List.of("gif", "jpg", "jpeg", "png"), 10, List.of("mp4", "webm", "mov"), 100, List.of("pdf"), 10);
    }

    public static MediaUploadPolicy from(final Map<String, String> values) {
        final MediaUploadPolicy defaults = MediaUploadPolicy.defaults();
        return new MediaUploadPolicy(
                MediaUploadPolicy.formats(
                        values.get("system.upload.image_formats"), IMAGE_CHOICES, defaults.imageFormats()),
                MediaUploadPolicy.size(values.get("system.upload.image_max_size_mb"), defaults.imageMaxSizeMb(), 100),
                MediaUploadPolicy.formats(
                        values.get("system.upload.video_formats"), VIDEO_CHOICES, defaults.videoFormats()),
                MediaUploadPolicy.size(values.get("system.upload.video_max_size_mb"), defaults.videoMaxSizeMb(), 1024),
                MediaUploadPolicy.formats(values.get("system.upload.file_formats"), null, defaults.fileFormats()),
                MediaUploadPolicy.size(values.get("system.upload.file_max_size_mb"), defaults.fileMaxSizeMb(), 1024));
    }

    public void validate(final String extension, final long size) {
        if (!MediaFileTypes.allowed(extension)) {
            throw BizException.badRequest("不支持该文件类型");
        }
        final int maxSize;
        if (MediaFileTypes.video(extension)) {
            if (!this.videoFormats.contains(extension)) {
                throw BizException.badRequest("该视频格式未启用");
            }
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
            maxSize = this.fileMaxSizeMb;
        }
        if (size <= 0 || size > maxSize * MediaUploadPolicy.MEBIBYTE) {
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
            final @Nullable String value, final @Nullable Set<String> choices, final List<String> fallback) {
        if (value == null) {
            return fallback;
        }
        final LinkedHashSet<String> parsed = new LinkedHashSet<>();
        for (final String item : value.toLowerCase(Locale.ROOT).split(",", -1)) {
            parsed.add(item.trim());
        }
        return !parsed.isEmpty()
                        && !parsed.contains("")
                        && parsed.stream()
                                .allMatch(item ->
                                        MediaFileTypes.allowed(item) && (choices == null || choices.contains(item)))
                ? List.copyOf(parsed)
                : fallback;
    }
}

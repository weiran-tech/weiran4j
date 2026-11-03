package com.wulicode.weiran.system.infrastructure.storage;

import com.wulicode.weiran.system.domain.media.MediaFileTypes;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import org.hashids.Hashids;

/** 文件对象名规则；日期按 UTC 计算。 */
final class MediaObjectNames {

    private static final Hashids USER_IDS =
            new Hashids("weiran-media-user-v1", 8, "abcdefghijklmnopqrstuvwxyz0123456789");
    private static final DateTimeFormatter DAY = DateTimeFormatter.BASIC_ISO_DATE;
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyyMM", Locale.ROOT);
    private static final DateTimeFormatter DAY_OF_MONTH = DateTimeFormatter.ofPattern("dd", Locale.ROOT);
    private static final String UUID_PART = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    private static final String FILE_PART = UUID_PART + "\\.[a-z0-9]{2,10}";
    private static final String USER_KEY = "media/u/[a-z0-9]{8,}/[0-9]{8}/" + FILE_PART;
    private static final String ANONYMOUS_KEY = "media/n/[0-9]{6}/[0-9]{2}/" + FILE_PART;
    private static final String LEGACY_LOCAL = "media/[0-9]{6}/[0-9a-fA-F-]{36}\\.[a-z0-9]{2,10}";
    private static final String LEGACY_DIRECT = "media/[0-9]{6}/[0-9a-f-]{36}/" + FILE_PART;

    private MediaObjectNames() {}

    static String userPrefix(final long userId, final Clock clock) {
        if (userId <= 0) {
            throw new IllegalArgumentException("用户标识无效");
        }
        return "media/u/" + MediaObjectNames.USER_IDS.encode(userId) + "/"
                + LocalDate.now(clock).format(MediaObjectNames.DAY) + "/";
    }

    /** 为将来的未授权上传预留路径；当前没有公开上传入口。 */
    static String anonymousPrefix(final Clock clock) {
        final LocalDate day = LocalDate.now(clock);
        return "media/n/" + day.format(MediaObjectNames.MONTH) + "/" + day.format(MediaObjectNames.DAY_OF_MONTH) + "/";
    }

    static String newUserObjectName(final String originalName, final long userId, final Clock clock) {
        final String extension = MediaFileTypes.extension(originalName);
        if (!MediaFileTypes.allowed(extension)) {
            throw new IllegalArgumentException("文件扩展名无效");
        }
        return MediaObjectNames.userPrefix(userId, clock) + UUID.randomUUID() + "." + extension;
    }

    static boolean validDirectKey(final String objectName) {
        return (objectName.matches(MediaObjectNames.USER_KEY) || objectName.matches(MediaObjectNames.LEGACY_DIRECT))
                && MediaFileTypes.allowed(MediaFileTypes.extension(objectName));
    }

    static boolean validStoredKey(final String objectName) {
        return (MediaObjectNames.validDirectKey(objectName)
                        || objectName.matches(MediaObjectNames.ANONYMOUS_KEY)
                        || objectName.matches(MediaObjectNames.LEGACY_LOCAL))
                && MediaFileTypes.allowed(MediaFileTypes.extension(objectName));
    }
}

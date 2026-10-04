package com.weiran.cqt.domain.file;

import java.time.YearMonth;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** 上传文件规则：允许的扩展名（沿用原系统白名单）与对象命名。 */
public final class UploadedFiles {

    /** 允许的扩展名（含点、小写）。 */
    public static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".zip", ".xlsx", ".xls", ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".mp3", ".mp4", ".mov",
            ".avi");

    private UploadedFiles() {}

    /**
     * 取原始文件名的扩展名（含点、小写），且必须在白名单内。
     *
     * @param originalName 原始文件名（可能带路径）
     * @return 扩展名；无扩展名或不在白名单时为空
     */
    public static Optional<String> extensionOf(final @Nullable String originalName) {
        if (originalName == null) {
            return Optional.empty();
        }
        final String name = originalName.replace('\\', '/');
        final String base = name.substring(name.lastIndexOf('/') + 1);
        final int dot = base.lastIndexOf('.');
        if (dot <= 0 || dot == base.length() - 1) {
            return Optional.empty();
        }
        final String extension = base.substring(dot).toLowerCase(Locale.ROOT);
        return UploadedFiles.ALLOWED_EXTENSIONS.contains(extension) ? Optional.of(extension) : Optional.empty();
    }

    /**
     * 对象名：{@code <前缀>user_files/<账号ID>/<yyyyMM>/<UUID><扩展名>}。UUID 让公共读地址不可猜。
     *
     * @param prefix 配置的前缀（如 {@code cqt/}，可为空串）
     * @param accountId 上传者账号 ID
     * @param month 上传年月
     * @param id 随机 UUID
     * @param extension 扩展名（含点）
     */
    public static String objectName(
            final String prefix, final long accountId, final YearMonth month, final UUID id, final String extension) {
        return String.format(
                Locale.ROOT,
                "%suser_files/%d/%04d%02d/%s%s",
                prefix,
                accountId,
                month.getYear(),
                month.getMonthValue(),
                id.toString().replace("-", ""),
                extension);
    }
}

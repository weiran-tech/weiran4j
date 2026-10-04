package com.weiran.cqt.application.file;

import com.weiran.common.error.BizException;
import com.weiran.cqt.api.error.CqtErrors;
import com.weiran.cqt.api.file.FileUploadService;
import com.weiran.cqt.api.file.UploadContent;
import com.weiran.cqt.api.file.UploadedFileView;
import com.weiran.cqt.domain.file.FileStorage;
import com.weiran.cqt.domain.file.FileStorageException;
import com.weiran.cqt.domain.file.UploadedFiles;
import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.time.YearMonth;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;

/**
 * {@link FileUploadService} 实现：先校验（非空、扩展名白名单），再按 {@code <前缀>user_files/<账号>/<年月>/<UUID><扩展名>}
 * 命名并写入存储。没有任何 {@link FileStorage} 时返回「文件存储未配置」。
 */
@Slf4j
public class FileUploadApplicationService implements FileUploadService {

    private final ObjectProvider<FileStorage> storages;

    private final Clock clock;

    private final String keyPrefix;

    /**
     * 构造服务。
     *
     * @param keyPrefix 对象名前缀（如 {@code cqt/}）
     */
    public FileUploadApplicationService(
            final ObjectProvider<FileStorage> storages,
            final Clock clock,
            @Value("${weiran.cqt.storage.key-prefix:cqt/}") final String keyPrefix) {
        this.storages = storages;
        this.clock = clock;
        this.keyPrefix = keyPrefix;
    }

    @Override
    public UploadedFileView upload(
            final long accountId,
            final @Nullable String originalName,
            final long size,
            final UploadContent content,
            final @Nullable String contentType) {
        if (originalName == null || originalName.isBlank() || size <= 0) {
            throw BizException.badRequest("请选择文件");
        }
        final String extension =
                UploadedFiles.extensionOf(originalName).orElseThrow(() -> BizException.badRequest("不支持的文件类型"));
        final FileStorage storage = this.storages.getIfAvailable();
        if (storage == null) {
            throw new BizException(CqtErrors.STORAGE_NOT_CONFIGURED);
        }
        final String objectName = UploadedFiles.objectName(
                this.keyPrefix, accountId, YearMonth.now(this.clock), UUID.randomUUID(), extension);
        final String url;
        try (InputStream input = content.open()) {
            url = storage.store(objectName, input, size, contentType);
        } catch (final IOException | FileStorageException ex) {
            FileUploadApplicationService.log.warn(
                    "文件上传失败 account={} object={} error={}",
                    accountId,
                    objectName,
                    ex.getClass().getSimpleName());
            throw new BizException(CqtErrors.UPLOAD_FAILED, ex);
        }
        final String name = FileUploadApplicationService.baseName(originalName);
        FileUploadApplicationService.log.info(
                "文件已上传 account={} object={} size={} name={}", accountId, objectName, size, name);
        return new UploadedFileView(url, name, objectName, size);
    }

    private static String baseName(final String originalName) {
        final String normalized = originalName.replace('\\', '/');
        return normalized.substring(normalized.lastIndexOf('/') + 1);
    }
}

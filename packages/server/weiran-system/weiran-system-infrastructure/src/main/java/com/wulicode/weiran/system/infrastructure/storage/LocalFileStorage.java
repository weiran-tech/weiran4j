package com.wulicode.weiran.system.infrastructure.storage;

import com.wulicode.weiran.system.domain.storage.FileStorage;
import com.wulicode.weiran.system.domain.storage.FileStorage.StoredFile;
import com.wulicode.weiran.system.domain.storage.FileStorageException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;

/** 本地文件存储，仅供开发与测试环境使用。 */
public final class LocalFileStorage implements FileStorage {

    private final Path root;
    private final String urlPrefix;

    public LocalFileStorage(final Path root, final String urlPrefix) {
        this.root = root.toAbsolutePath().normalize();
        this.urlPrefix = LocalFileStorage.trimSlash(urlPrefix);
    }

    @Override
    public StoredFile store(final String originalName, final InputStream input, final long size, final long userId) {
        final String objectName = MediaObjectNames.newUserObjectName(originalName, userId, Clock.systemUTC());
        final Path target = this.resolve(objectName);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(input, target);
        } catch (final IOException ex) {
            throw new FileStorageException("文件上传失败，请稍后重试", ex);
        }
        return new StoredFile(this.urlPrefix + "/" + objectName, objectName, size);
    }

    @Override
    public void delete(final String objectName) {
        try {
            Files.deleteIfExists(this.resolve(objectName));
        } catch (final IOException ex) {
            throw new FileStorageException("文件删除失败，请稍后重试", ex);
        }
    }

    private Path resolve(final String objectName) {
        if (!MediaObjectNames.validStoredKey(objectName)) {
            throw new IllegalArgumentException("文件对象名无效");
        }
        final Path path = this.root.resolve(objectName).normalize();
        if (!path.startsWith(this.root)) {
            throw new IllegalArgumentException("文件对象名越出存储目录");
        }
        return path;
    }

    private static String trimSlash(final String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}

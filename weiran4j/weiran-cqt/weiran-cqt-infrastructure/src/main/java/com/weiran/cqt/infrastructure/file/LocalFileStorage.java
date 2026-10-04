package com.weiran.cqt.infrastructure.file;

import com.weiran.cqt.domain.file.FileStorage;
import com.weiran.cqt.domain.file.FileStorageException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.jspecify.annotations.Nullable;

/** 本地目录存储（{@code weiran.cqt.storage.mode=local}，仅开发 / 测试）：写入 {@code <root>/<对象名>}，经 {@code /uploads/**} 访问。 */
public final class LocalFileStorage implements FileStorage {

    private final Path root;

    private final String urlPrefix;

    /**
     * 构造存储。
     *
     * @param root 根目录
     * @param urlPrefix 访问前缀（如 {@code /uploads}）
     */
    public LocalFileStorage(final Path root, final String urlPrefix) {
        this.root = root.toAbsolutePath().normalize();
        this.urlPrefix = urlPrefix.replaceAll("/+$", "");
    }

    /** 根目录。 */
    public Path root() {
        return this.root;
    }

    @Override
    public String store(
            final String objectName, final InputStream content, final long size, final @Nullable String contentType) {
        final Path target = this.root.resolve(objectName).normalize();
        if (!target.startsWith(this.root) || target.equals(this.root)) {
            throw new FileStorageException("对象名越出存储目录", new IllegalArgumentException(objectName));
        }
        try {
            Files.createDirectories(target.getParent());
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (final IOException ex) {
            throw new FileStorageException("本地写入失败: " + ex.getClass().getSimpleName(), ex);
        }
        return this.urlPrefix + "/" + objectName;
    }
}

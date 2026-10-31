package com.wulicode.weiran.system.infrastructure.storage;

import com.wulicode.weiran.system.domain.storage.FileStorage;
import com.wulicode.weiran.system.domain.storage.FileStorage.StoredFile;
import com.wulicode.weiran.system.domain.storage.FileStorageException;
import java.io.InputStream;

/** 未配置存储时的失败实现。 */
public final class DisabledFileStorage implements FileStorage {

    @Override
    public StoredFile store(final String originalName, final InputStream input, final long size, final long userId) {
        throw new FileStorageException("文件存储未配置");
    }

    @Override
    public void delete(final String objectName) {
        throw new FileStorageException("文件存储未配置");
    }
}

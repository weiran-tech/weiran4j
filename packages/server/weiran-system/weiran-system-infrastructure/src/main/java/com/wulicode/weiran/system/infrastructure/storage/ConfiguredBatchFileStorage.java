package com.wulicode.weiran.system.infrastructure.storage;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.CannedAccessControlList;
import com.aliyun.oss.model.ObjectMetadata;
import com.wulicode.weiran.system.domain.batch.BatchFileStorage;
import com.wulicode.weiran.system.domain.storage.FileStorageException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** 批处理输入文件专用对象，位于资源库目录之外，不进入 sys_media。 */
public final class ConfiguredBatchFileStorage implements BatchFileStorage, AutoCloseable {

    private final String mode;
    private final @Nullable Path root;
    private final @Nullable OSS client;
    private final @Nullable String bucket;

    public ConfiguredBatchFileStorage(final SystemStorageProperties properties) {
        this.mode = properties.mode();
        this.root = properties.local() == null
                ? null
                : properties.local().root().toAbsolutePath().normalize().resolveSibling("batch-private");
        final SystemStorageProperties.Aliyun aliyun = properties.aliyun();
        if ("aliyun".equals(this.mode) && aliyun != null) {
            this.client =
                    new OSSClientBuilder().build(aliyun.endpoint(), aliyun.accessKeyId(), aliyun.accessKeySecret());
            this.bucket = aliyun.bucket();
        } else {
            this.client = null;
            this.bucket = null;
        }
    }

    @Override
    public String store(final String filename, final InputStream input, final long size) {
        final int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0) {
            throw new IllegalArgumentException("批处理文件缺少扩展名");
        }
        final String extension = filename.substring(lastDot + 1).toLowerCase(Locale.ROOT);
        if (!extension.matches("[a-z0-9]{1,16}")) {
            throw new IllegalArgumentException("批处理文件扩展名无效");
        }
        final String key = "batch/"
                + YearMonth.now(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyyMM", Locale.ROOT))
                + "/" + UUID.randomUUID() + "." + extension;
        if ("local".equals(this.mode) && this.root != null) {
            final Path target = this.resolve(key);
            try {
                Files.createDirectories(target.getParent());
                Files.copy(input, target);
                return key;
            } catch (final IOException ex) {
                try {
                    Files.deleteIfExists(target);
                } catch (final IOException cleanupError) {
                    ex.addSuppressed(cleanupError);
                }
                throw new FileStorageException("批处理文件保存失败", ex);
            }
        }
        if ("aliyun".equals(this.mode) && this.client != null && this.bucket != null) {
            final ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(size);
            metadata.setObjectAcl(CannedAccessControlList.Private);
            metadata.setContentType("application/octet-stream");
            this.client.putObject(this.bucket, key, input, metadata);
            return key;
        }
        throw new FileStorageException("批处理文件存储未配置");
    }

    @Override
    public InputStream open(final String key) throws IOException {
        this.validate(key);
        if ("local".equals(this.mode)) {
            return Files.newInputStream(this.resolve(key));
        }
        if ("aliyun".equals(this.mode) && this.client != null && this.bucket != null) {
            return this.client.getObject(this.bucket, key).getObjectContent();
        }
        throw new FileStorageException("批处理文件存储未配置");
    }

    @Override
    public void delete(final String key) {
        this.validate(key);
        if ("local".equals(this.mode)) {
            try {
                Files.deleteIfExists(this.resolve(key));
            } catch (final IOException ex) {
                throw new FileStorageException("批处理文件删除失败", ex);
            }
        } else if ("aliyun".equals(this.mode) && this.client != null && this.bucket != null) {
            this.client.deleteObject(this.bucket, key);
        }
    }

    @Override
    public void close() {
        if (this.client != null) {
            this.client.shutdown();
        }
    }

    private Path resolve(final String key) {
        if (this.root == null) {
            throw new FileStorageException("批处理文件存储未配置");
        }
        this.validate(key);
        final Path path = this.root.resolve(key).normalize();
        if (!path.startsWith(this.root)) {
            throw new IllegalArgumentException("批处理对象键无效");
        }
        return path;
    }

    private void validate(final String key) {
        if (!key.matches("batch/[0-9]{6}/[0-9a-f-]{36}\\.[a-z0-9]{1,16}")) {
            throw new IllegalArgumentException("批处理对象键无效");
        }
    }
}

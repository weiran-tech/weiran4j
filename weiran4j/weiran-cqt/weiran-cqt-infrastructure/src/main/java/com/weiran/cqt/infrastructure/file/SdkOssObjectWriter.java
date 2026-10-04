package com.weiran.cqt.infrastructure.file;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.weiran.cqt.infrastructure.autoconfigure.CqtProperties;
import java.io.InputStream;
import org.jspecify.annotations.Nullable;

/** {@link OssObjectWriter} 的官方 SDK 实现。按内容长度流式上传，不把文件读入内存。 */
final class SdkOssObjectWriter implements OssObjectWriter {

    private final OSS client;

    /** 用配置构造 SDK 客户端；调用前须已通过 {@link OssFileStorage#requireComplete} 校验。 */
    SdkOssObjectWriter(final CqtProperties.Oss config) {
        this.client = new OSSClientBuilder().build(config.endpoint(), config.accessKeyId(), config.accessKeySecret());
    }

    @Override
    public void put(
            final String bucket,
            final String objectName,
            final InputStream content,
            final long size,
            final @Nullable String contentType) {
        final ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(size);
        if (contentType != null && !contentType.isBlank()) {
            metadata.setContentType(contentType);
        }
        this.client.putObject(bucket, objectName, content, metadata);
    }

    @Override
    public void close() {
        this.client.shutdown();
    }
}

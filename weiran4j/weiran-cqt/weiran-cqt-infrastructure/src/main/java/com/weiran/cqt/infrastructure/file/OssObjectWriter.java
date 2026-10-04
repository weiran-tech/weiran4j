package com.weiran.cqt.infrastructure.file;

import java.io.InputStream;
import org.jspecify.annotations.Nullable;

/** OSS 写入的最小调用面：把 SDK 隔离在一个实现类里，存储逻辑可以用假实现测试。 */
interface OssObjectWriter extends AutoCloseable {

    /**
     * 流式写入一个对象。
     *
     * @throws RuntimeException SDK 的任何失败（{@code OSSException} / {@code ClientException} 都是运行时异常）
     */
    void put(String bucket, String objectName, InputStream content, long size, @Nullable String contentType);

    @Override
    void close();
}

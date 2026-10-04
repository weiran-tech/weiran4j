package com.weiran.cqt.infrastructure.file;

import com.weiran.cqt.domain.file.FileStorage;
import com.weiran.cqt.domain.file.FileStorageException;
import com.weiran.cqt.infrastructure.autoconfigure.CqtProperties;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.DisposableBean;

/**
 * 阿里云 OSS 存储（{@code weiran.cqt.storage.mode=oss}）：Bucket 公共读，返回 {@code <公网前缀>/<对象名>}。
 * 写入失败一律转成 {@link FileStorageException}，信息只含异常类名，不含凭据。
 */
public final class OssFileStorage implements FileStorage, DisposableBean {

    private final CqtProperties.Oss config;

    private final OssObjectWriter writer;

    private final String baseUrl;

    OssFileStorage(final CqtProperties.Oss config, final OssObjectWriter writer) {
        this.config = config;
        this.writer = writer;
        this.baseUrl = config.publicBaseUrl().replaceAll("/+$", "");
    }

    /** 校验配置并用官方 SDK 构造存储；配置不全时抛异常让应用启动失败（只列环境变量名）。 */
    public static OssFileStorage create(final CqtProperties.Oss config) {
        OssFileStorage.requireComplete(config);
        return new OssFileStorage(config, new SdkOssObjectWriter(config));
    }

    /** 五项必填配置缺任一项即抛 {@link IllegalStateException}，信息列出缺少的环境变量名。 */
    static void requireComplete(final CqtProperties.Oss config) {
        final List<String> missing = new ArrayList<>();
        if (config.accessKeyId().isBlank()) {
            missing.add("WEIRAN_CQT_OSS_ACCESS_KEY_ID");
        }
        if (config.accessKeySecret().isBlank()) {
            missing.add("WEIRAN_CQT_OSS_ACCESS_KEY_SECRET");
        }
        if (config.bucket().isBlank()) {
            missing.add("WEIRAN_CQT_OSS_BUCKET");
        }
        if (config.endpoint().isBlank()) {
            missing.add("WEIRAN_CQT_OSS_ENDPOINT");
        }
        if (config.publicBaseUrl().isBlank()) {
            missing.add("WEIRAN_CQT_OSS_PUBLIC_BASE_URL");
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "weiran.cqt.storage.mode=oss 但 OSS 配置不全，缺少环境变量: " + String.join(", ", missing));
        }
    }

    @Override
    @SuppressWarnings("IllegalCatch") // SDK 的失败都是运行时异常（OSSException / ClientException 等），统一归为存储失败。
    public String store(
            final String objectName, final InputStream content, final long size, final @Nullable String contentType) {
        try {
            this.writer.put(this.config.bucket(), objectName, content, size, contentType);
        } catch (final RuntimeException ex) {
            throw new FileStorageException("OSS 写入失败: " + ex.getClass().getSimpleName(), ex);
        }
        return this.baseUrl + "/" + objectName;
    }

    @Override
    public boolean isStoredUrl(final String url) {
        return url.startsWith(this.baseUrl + "/");
    }

    @Override
    public void destroy() {
        this.writer.close();
    }
}

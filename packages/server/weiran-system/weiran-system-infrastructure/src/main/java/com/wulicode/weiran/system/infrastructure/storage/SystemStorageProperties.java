package com.wulicode.weiran.system.infrastructure.storage;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** 文件存储配置。 */
@ConfigurationProperties("weiran.storage")
public record SystemStorageProperties(String mode, Local local, Aliyun aliyun) {

    public record Local(Path root, String urlPrefix) {}

    public record Aliyun(
            String endpoint, String bucket, String accessKeyId, String accessKeySecret, String publicBaseUrl) {}
}

package com.wulicode.weiran.system.infrastructure.storage;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** 文件存储配置。 */
@ConfigurationProperties("weiran.storage")
public record SystemStorageProperties(String mode, Local local, Aliyun aliyun) {

    public record Local(Path root, String urlPrefix) {}

    public record Aliyun(
            String endpoint,
            String bucket,
            String accessKeyId,
            String accessKeySecret,
            String publicBaseUrl,
            @DefaultValue("media") String folder) {

        @ConstructorBinding
        public Aliyun {}

        public Aliyun(
                final String endpoint,
                final String bucket,
                final String accessKeyId,
                final String accessKeySecret,
                final String publicBaseUrl) {
            this(endpoint, bucket, accessKeyId, accessKeySecret, publicBaseUrl, "media");
        }
    }
}

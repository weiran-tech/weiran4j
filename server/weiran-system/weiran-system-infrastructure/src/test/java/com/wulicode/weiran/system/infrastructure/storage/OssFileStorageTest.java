package com.wulicode.weiran.system.infrastructure.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OssFileStorageTest {

    @Test
    @DisplayName("直传授权限制前缀、大小、有效期和禁止覆盖，并绑定当前用户")
    void createsScopedDirectUploadAuthorization() {
        try (OssFileStorage storage = new OssFileStorage(new SystemStorageProperties.Aliyun(
                "oss-cn-hangzhou.aliyuncs.com", "my-bucket", "access-key-id", "secret", "https://cdn.example.com"))) {
            final var authorization = storage.authorize(7L);
            final String policy =
                    new String(Base64.getDecoder().decode(authorization.policy()), StandardCharsets.UTF_8);

            assertThat(authorization.uploadUrl()).isEqualTo("https://my-bucket.oss-cn-hangzhou.aliyuncs.com");
            assertThat(authorization.keyPrefix()).startsWith("media/").endsWith("/");
            assertThat(authorization.expiresAt()).isAfter(Instant.now());
            assertThat(policy)
                    .contains(
                            "\"bucket\":\"my-bucket\"",
                            authorization.keyPrefix(),
                            "content-length-range",
                            "1073741824",
                            "x-oss-forbid-overwrite");
            assertThatThrownBy(() -> storage.inspect(
                            authorization.keyPrefix() + "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png",
                            authorization.ticket(),
                            8L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("当前用户");
        }
    }
}

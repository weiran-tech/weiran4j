package com.wulicode.weiran.system.infrastructure.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aliyun.oss.OSS;
import com.aliyun.oss.model.GetObjectRequest;
import com.aliyun.oss.model.OSSObject;
import com.aliyun.oss.model.ObjectMetadata;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OssFileStorageTest {

    @Test
    @DisplayName("OSS 自定义根目录同时用于代传、策略和票据")
    void usesConfiguredFolderForUploadsAndAuthorization() {
        final OSS client = mock(OSS.class);
        when(client.calculatePostSignature(any(String.class))).thenReturn("test-signature");
        try (OssFileStorage storage = new OssFileStorage(OssFileStorageTest.properties("assets"), client)) {
            final InputStream input = new ByteArrayInputStream(new byte[12]);
            final var stored = storage.store("Photo.PNG", input, 12L, 7L);
            final var authorization = storage.authorize(7L);
            assertThat(stored.objectName()).startsWith(authorization.keyPrefix());
            assertThat(stored.url()).isEqualTo("https://cdn.example.com/" + stored.objectName());
            assertThat(authorization.keyPrefix()).matches("assets/u/[a-z0-9]{8,}/[0-9]{8}/");
            final String policy =
                    new String(Base64.getDecoder().decode(authorization.policy()), StandardCharsets.UTF_8);
            final String payload = new String(
                    Base64.getUrlDecoder().decode(authorization.ticket().split("\\.", -1)[0]), StandardCharsets.UTF_8);
            assertThat(policy).contains("[\"starts-with\",\"$key\",\"" + authorization.keyPrefix() + "\"]");
            assertThat(payload).startsWith(authorization.keyPrefix() + "|7|");
            final ArgumentCaptor<ObjectMetadata> metadata = ArgumentCaptor.forClass(ObjectMetadata.class);
            verify(client).putObject(eq("my-bucket"), eq(stored.objectName()), eq(input), metadata.capture());
            assertThat(metadata.getValue().getContentLength()).isEqualTo(12L);
        }
    }

    @Test
    @DisplayName("切换根目录保留旧授权验收与历史删除，拒绝伪造票据和越界对象")
    void preservesHistoricalObjectsAndTickets() {
        final OSS client = mock(OSS.class);
        when(client.calculatePostSignature(any(String.class))).thenReturn("test-signature");
        final ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(12L);
        when(client.getObjectMetadata(eq("my-bucket"), any(String.class))).thenReturn(metadata);
        when(client.getObject(any(GetObjectRequest.class))).thenAnswer(invocation -> {
            final OSSObject object = new OSSObject();
            object.setObjectContent(new ByteArrayInputStream(new byte[12]));
            return object;
        });
        try (OssFileStorage original = new OssFileStorage(OssFileStorageTest.properties("media"), client);
                OssFileStorage custom = new OssFileStorage(OssFileStorageTest.properties("assets"), client);
                OssFileStorage current = new OssFileStorage(OssFileStorageTest.properties("archive"), client)) {
            final String filename = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png";
            for (final var old : java.util.List.of(original.authorize(7L), custom.authorize(7L))) {
                final String key = old.keyPrefix() + filename;
                assertThat(current.inspect(key, old.ticket(), 7L).stored().url())
                        .isEqualTo("https://cdn.example.com/" + key);
                current.delete(key);
                current.delete(key);
                verify(client, org.mockito.Mockito.times(2)).deleteObject("my-bucket", key);
                assertThatThrownBy(() -> current.inspect(key, old.ticket(), 8L))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("当前用户");
                assertThatThrownBy(() -> current.inspect(key, old.ticket() + "tampered", 7L))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("授权无效");
                assertThatThrownBy(
                                () -> current.inspect(current.authorize(7L).keyPrefix() + filename, old.ticket(), 7L))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("当前用户");
            }
            final String legacy = "media/202610/" + filename;
            current.delete(legacy);
            verify(client).deleteObject("my-bucket", legacy);
            for (final String bad :
                    java.util.List.of("../assets/" + filename, "assets/" + filename, "batch/202610/" + filename)) {
                assertThatThrownBy(() -> current.delete(bad)).isInstanceOf(IllegalArgumentException.class);
                verify(client, never()).deleteObject("my-bucket", bad);
            }
        }
    }

    private static SystemStorageProperties.Aliyun properties(final String folder) {
        return new SystemStorageProperties.Aliyun(
                "oss-cn-hangzhou.aliyuncs.com",
                "my-bucket",
                "access-key-id",
                "secret",
                "https://cdn.example.com",
                folder);
    }

    @Test
    @DisplayName("直传授权限制前缀、大小、有效期和禁止覆盖，并绑定当前用户")
    void createsScopedDirectUploadAuthorization() {
        try (OssFileStorage storage = new OssFileStorage(new SystemStorageProperties.Aliyun(
                "oss-cn-hangzhou.aliyuncs.com", "my-bucket", "access-key-id", "secret", "https://cdn.example.com"))) {
            final var authorization = storage.authorize(7L);
            final String policy =
                    new String(Base64.getDecoder().decode(authorization.policy()), StandardCharsets.UTF_8);

            assertThat(authorization.uploadUrl()).isEqualTo("https://my-bucket.oss-cn-hangzhou.aliyuncs.com");
            assertThat(authorization.keyPrefix()).matches("media/u/[a-z0-9]{8,}/[0-9]{8}/");
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

package com.wulicode.weiran.system.infrastructure.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

class SystemStoragePropertiesTest {

    @Test
    @DisplayName("OSS 缺省文件夹为 media，兼容旧构造器并支持显式配置绑定")
    void bindsDefaultAndCustomFolders() {
        final Map<String, Object> values = new HashMap<>(Map.of(
                "weiran.storage.aliyun.endpoint", "oss-cn-hangzhou.aliyuncs.com",
                "weiran.storage.aliyun.bucket", "my-bucket",
                "weiran.storage.aliyun.access-key-id", "test-key",
                "weiran.storage.aliyun.access-key-secret", "test-secret",
                "weiran.storage.aliyun.public-base-url", "https://cdn.example.com"));
        assertThat(SystemStoragePropertiesTest.bind(values).folder()).isEqualTo("media");
        assertThat(new SystemStorageProperties.Aliyun("endpoint", "bucket", "key", "secret", "url").folder())
                .isEqualTo("media");
        values.put("weiran.storage.aliyun.folder", "Project_assets-1");
        assertThat(SystemStoragePropertiesTest.bind(values).folder()).isEqualTo("Project_assets-1");
        values.put("weiran.storage.aliyun.folder", "");
        final SystemStorageProperties.Aliyun empty = SystemStoragePropertiesTest.bind(values);
        assertThat(empty.folder()).isEmpty();
        assertThatThrownBy(() -> new OssFileStorage(empty))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("WEIRAN_STORAGE_ALIYUN_FOLDER")
                .hasMessageNotContaining("test-secret");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "../assets", "a/b", "a\\b", "/assets", "assets/", "a.b", "a\"b", "_assets", "图片"})
    @DisplayName("非法文件夹在创建 OSS 客户端前失败且不泄露配置值")
    void rejectsUnsafeFolders(final String folder) {
        final var properties = new SystemStorageProperties.Aliyun(
                "oss-cn-hangzhou.aliyuncs.com",
                "my-bucket",
                "test-key",
                "test-secret",
                "https://cdn.example.com",
                folder);
        assertThatThrownBy(() -> new OssFileStorage(properties))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("WEIRAN_STORAGE_ALIYUN_FOLDER")
                .hasMessageNotContaining("test-secret");
    }

    @Test
    @DisplayName("文件夹长度上限为 64")
    void limitsFolderLength() {
        MediaObjectNames.validateFolder("a".repeat(64));
        assertThatThrownBy(() -> MediaObjectNames.validateFolder("a".repeat(65)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static SystemStorageProperties.Aliyun bind(final Map<String, Object> values) {
        return new Binder(new MapConfigurationPropertySource(values))
                .bind("weiran.storage.aliyun", Bindable.of(SystemStorageProperties.Aliyun.class))
                .get();
    }
}

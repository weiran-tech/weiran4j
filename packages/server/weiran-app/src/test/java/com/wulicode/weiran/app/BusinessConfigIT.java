package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.platform.api.config.ConfigService;
import com.wulicode.weiran.platform.api.config.SaveConfigCommand;
import java.util.Locale;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

class BusinessConfigIT extends IntegrationTestSupport {

    @Autowired
    ConfigService configs;

    @Test
    @Transactional
    @DisplayName("业务配置创建和值更新校验、保留元数据并同步媒体引用")
    void createsAndUpdatesBusinessConfig() {
        final String key = "biz.site." + IntegrationTestSupport.unique("image");
        final String firstUrl = "/media/" + IntegrationTestSupport.unique("first");
        final String secondUrl = "/media/" + IntegrationTestSupport.unique("second");
        this.insertMedia(firstUrl);
        this.insertMedia(secondUrl);
        final long id = this.configs.createBusiness(
                "biz", new SaveConfigCommand(key, firstUrl, "string", "general", "image", null, false, "业务图片"));

        assertThat(this.valueOf(key)).isEqualTo(firstUrl);
        assertThat(this.referenceCount(id, firstUrl)).isEqualTo(1);
        assertThatThrownBy(() -> this.configs.createBusiness(
                        "biz", new SaveConfigCommand(key, "x", "string", "general", "input", null, false, null)))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> this.configs.updateBusinessValue("system", key, "x"))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> this.configs.updateBusinessValue("biz", key.toUpperCase(Locale.ROOT), "x"))
                .isInstanceOf(BizException.class);
        assertThat(this.valueOf(key)).isEqualTo(firstUrl);

        this.configs.updateBusinessValue("biz", key, secondUrl);
        this.configs.updateBusinessValue("biz", key, secondUrl);
        assertThat(this.valueOf(key)).isEqualTo(secondUrl);
        assertThat(this.referenceCount(id, firstUrl)).isZero();
        assertThat(this.referenceCount(id, secondUrl)).isEqualTo(1);
        assertThat(this.jdbc.queryForObject("select field_type from sys_config where id = ?", String.class, id))
                .isEqualTo("image");
    }

    @Test
    @Transactional
    @DisplayName("业务配置值遵循类型、必填和长度规则，错误值不写入")
    void validatesBusinessValues() {
        final String key = "biz.site." + IntegrationTestSupport.unique("count");
        final long id = this.configs.createBusiness(
                "biz", new SaveConfigCommand(key, "1", "number", "general", "number", null, true, null));
        assertThatThrownBy(() -> this.configs.updateBusinessValue("biz", key, "abc"))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> this.configs.updateBusinessValue("biz", key, ""))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> this.configs.updateBusinessValue("biz", key, "1".repeat(65536)))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> this.configs.createBusiness(
                        "biz",
                        new SaveConfigCommand(
                                "biz.site." + IntegrationTestSupport.unique("invalid"),
                                "maybe",
                                "boolean",
                                "general",
                                "switch",
                                null,
                                false,
                                null)))
                .isInstanceOf(BizException.class);
        assertThat(this.jdbc.queryForObject("select config_value from sys_config where id = ?", String.class, id))
                .isEqualTo("1");
    }

    private void insertMedia(final String url) {
        this.jdbc.update(
                "insert into sys_media (original_name, url, object_name, size, uploaded_by) values (?, ?, ?, 1, 1)",
                "image.png",
                url,
                IntegrationTestSupport.unique("object"));
    }

    private String valueOf(final String key) {
        return Objects.requireNonNull(this.jdbc.queryForObject(
                "select config_value from sys_config where config_key = ?", String.class, key));
    }

    private long referenceCount(final long id, final String url) {
        final Long count = this.jdbc.queryForObject(
                "select count(*) from sys_media_reference reference join sys_media media on media.id = reference.media_id "
                        + "where reference.source_type = 'system_config' and reference.source_id = ? and media.url = ?",
                Long.class,
                String.valueOf(id),
                url);
        return count == null ? 0 : count;
    }
}

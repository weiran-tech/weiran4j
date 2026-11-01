package com.wulicode.weiran.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.platform.api.config.ConfigService;
import com.wulicode.weiran.platform.api.config.CreateConfigGroupCommand;
import com.wulicode.weiran.platform.api.config.SaveConfigCommand;
import com.wulicode.weiran.system.domain.user.SecuritySettings;
import com.wulicode.weiran.system.domain.user.SecuritySettingsRepository;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

class SecurityConfigStorageIT extends IntegrationTestSupport {

    @Autowired
    SecuritySettingsRepository securitySettings;

    @Autowired
    ConfigService configs;

    @Test
    @Transactional
    @DisplayName("安全设置迁入 sys_config，通用配置入口不可见且保留修订号并发检查")
    void storesSecuritySettingsInInternalConfig() {
        final Long legacyTables = this.jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = database() "
                        + "and table_name = 'sys_security_settings'",
                Long.class);
        assertThat(legacyTables).isZero();

        final long configId = Objects.requireNonNull(this.jdbc.queryForObject(
                "select id from sys_config where config_key = 'system.security.settings' and group_key = 'security'",
                Long.class));
        assertThat(this.configs.page("system.security", PageQuery.defaults()).list())
                .isEmpty();
        assertThat(this.configs.all()).noneMatch(config -> config.configKey().equals("system.security.settings"));
        assertThat(this.configs.groups()).noneMatch(group -> group.key().equals("security"));
        assertThatThrownBy(() -> this.configs.get(configId)).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> this.configs.create(new SaveConfigCommand(
                        "system.security.other", "x", "string", "security", "input", null, false, null)))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() ->
                        this.configs.createGroup(new CreateConfigGroupCommand("config_system", "security", "安全设置")))
                .isInstanceOf(BizException.class);

        final SecuritySettings original = this.securitySettings.load();
        assertThat(this.securitySettings.save(original.withPasswordRules(
                        10,
                        original.passwordMaxLength(),
                        original.requireLower(),
                        original.requireUpper(),
                        original.requireDigit(),
                        original.requireSymbol())))
                .isTrue();
        assertThat(this.securitySettings.load().passwordMinLength()).isEqualTo(10);
        assertThat(this.securitySettings.load().revision()).isEqualTo(original.revision() + 1);
        assertThat(this.securitySettings.save(original)).isFalse();
    }
}

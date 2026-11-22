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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.annotation.Transactional;

class SecurityConfigStorageIT extends IntegrationTestSupport {

    @Autowired
    SecuritySettingsRepository securitySettings;

    @Autowired
    ConfigService configs;

    @Test
    @Transactional
    @DisplayName("安全设置使用独立三段式标量键，通用配置入口不可见且保留修订号并发检查")
    void storesSecuritySettingsInInternalConfig() {
        final Long legacyTables = this.jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema = database() "
                        + "and table_name = 'sys_security_settings'",
                Long.class);
        assertThat(legacyTables).isZero();

        final long configId = Objects.requireNonNull(this.jdbc.queryForObject(
                "select id from sys_config where config_key = 'system.security.password_min_length' and group_key = 'security'",
                Long.class));
        assertThat(this.configs.page("system.security", PageQuery.defaults()).list())
                .isEmpty();
        assertThat(this.configs.all()).noneMatch(config -> config.configKey().startsWith("system.security."));
        assertThat(this.configs.groups()).noneMatch(group -> group.key().equals("security"));
        assertThatThrownBy(() -> this.configs.get(configId)).isInstanceOf(BizException.class);
        assertThatThrownBy(() -> this.configs.create(new SaveConfigCommand(
                        "system.security.other", "x", "string", "security", "input", null, false, null)))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() ->
                        this.configs.createGroup(new CreateConfigGroupCommand("config_system", "security", "安全设置")))
                .isInstanceOf(BizException.class);

        assertThat(this.jdbc.queryForObject(
                        "select count(*) from sys_config where config_key = 'system.security.settings'", Long.class))
                .isZero();
        assertThat(this.jdbc.queryForObject("select count(*) from sys_config where group_key = 'security'", Long.class))
                .isEqualTo(9);
        assertThat(this.jdbc.queryForObject(
                        "select count(*) from sys_config where group_key = 'security' and config_type = 'json'",
                        Long.class))
                .isZero();

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
        final SecuritySettings saved = this.securitySettings.load();
        assertThat(saved.passwordMinLength()).isEqualTo(10);
        assertThat(saved.mfaEnabled()).isEqualTo(original.mfaEnabled());
        assertThat(saved.mfaRememberDays()).isEqualTo(original.mfaRememberDays());
        assertThat(saved.requireUpper()).isEqualTo(original.requireUpper());
        assertThat(this.jdbc.queryForObject(
                        "select config_value from sys_config where config_key = 'system.security.password_min_length'",
                        String.class))
                .isEqualTo("10");
        assertThat(this.securitySettings.save(saved.withMfa(true, 14))).isTrue();
        assertThat(this.securitySettings.load().mfaEnabled()).isTrue();
        assertThat(this.securitySettings.load().mfaRememberDays()).isEqualTo(14);
        assertThat(this.securitySettings.load().passwordMinLength()).isEqualTo(10);
        assertThat(this.securitySettings.load().revision()).isEqualTo(original.revision() + 2);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @Transactional
    @DisplayName("拆分安全配置时保留数字或布尔旧值与修订号，并删除旧 JSON")
    void migratesExistingValuesToScalarKeys(final boolean numericFlags) {
        this.jdbc.update("delete from sys_config where group_key = 'security'");
        final String legacy = """
                {"passwordMinLength":16,"passwordMaxLength":48,
                 "requireLower":false,"requireUpper":true,"requireDigit":false,"requireSymbol":true,
                 "mfaEnabled":true,"mfaRememberDays":19,"revision":37}
                """;
        this.jdbc.update(
                "insert into sys_config (config_key, config_value, config_type, description, is_builtin, group_key, field_type, required) "
                        + "values ('system.security.settings', ?, 'json', '旧安全配置', 1, 'security', 'json', 1)",
                numericFlags ? legacy.replace("true", "1").replace("false", "0") : legacy);
        this.jdbc.execute((ConnectionCallback<Void>) connection -> {
            ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource("db/migration/system/V202611222335__system_security_settings_flat_keys.sql"));
            ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource(
                            "db/migration/system/V202611222350__system_normalize_security_boolean_values.sql"));
            return null;
        });
        assertThat(this.securitySettings.load())
                .isEqualTo(new SecuritySettings(16, 48, false, true, false, true, true, 19, 37));
        assertThat(this.jdbc.queryForObject("select count(*) from sys_config where group_key = 'security'", Long.class))
                .isEqualTo(9);
        assertThat(this.jdbc.queryForObject(
                        "select count(*) from sys_config where config_key = 'system.security.settings'", Long.class))
                .isZero();
    }
}

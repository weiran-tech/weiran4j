package com.wulicode.weiran.system.infrastructure.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.system.domain.user.SecuritySettings;
import com.wulicode.weiran.system.domain.user.SecuritySettingsRepository;
import org.springframework.jdbc.core.JdbcTemplate;

/** 保存在内部系统配置项中的全局安全设置。 */
public class JdbcSecuritySettingsRepository implements SecuritySettingsRepository {

    private static final String CONFIG_KEY = "system.security.settings";

    private final JdbcTemplate jdbc;

    private final ObjectMapper json;

    public JdbcSecuritySettingsRepository(final JdbcTemplate jdbc, final ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Override
    public SecuritySettings load() {
        final String value = this.jdbc.queryForObject(
                "select config_value from sys_config where config_key = ?",
                String.class,
                JdbcSecuritySettingsRepository.CONFIG_KEY);
        try {
            final JsonNode node = this.json.readTree(value);
            return new SecuritySettings(
                    node.path("passwordMinLength").asInt(),
                    node.path("passwordMaxLength").asInt(),
                    node.path("requireLower").asBoolean(),
                    node.path("requireUpper").asBoolean(),
                    node.path("requireDigit").asBoolean(),
                    node.path("requireSymbol").asBoolean(),
                    node.path("mfaEnabled").asBoolean(),
                    node.path("mfaRememberDays").asInt(),
                    node.path("revision").asLong());
        } catch (final JsonProcessingException error) {
            throw new IllegalStateException("安全设置配置值不是合法 JSON", error);
        }
    }

    @Override
    public boolean save(final SecuritySettings settings) {
        final SecuritySettings next = new SecuritySettings(
                settings.passwordMinLength(),
                settings.passwordMaxLength(),
                settings.requireLower(),
                settings.requireUpper(),
                settings.requireDigit(),
                settings.requireSymbol(),
                settings.mfaEnabled(),
                settings.mfaRememberDays(),
                settings.revision() + 1);
        try {
            return this.jdbc.update(
                            "update sys_config set config_value = ? where config_key = ? "
                                    + "and cast(json_unquote(json_extract(config_value, '$.revision')) as unsigned) = ?",
                            this.json.writeValueAsString(next),
                            JdbcSecuritySettingsRepository.CONFIG_KEY,
                            settings.revision())
                    == 1;
        } catch (final JsonProcessingException error) {
            throw new IllegalStateException("安全设置序列化失败", error);
        }
    }
}

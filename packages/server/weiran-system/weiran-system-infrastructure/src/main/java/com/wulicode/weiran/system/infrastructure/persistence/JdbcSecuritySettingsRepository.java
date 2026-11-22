package com.wulicode.weiran.system.infrastructure.persistence;

import com.wulicode.weiran.system.domain.user.SecuritySettings;
import com.wulicode.weiran.system.domain.user.SecuritySettingsRepository;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** 使用独立的三段式配置键保存全局安全设置。 */
public class JdbcSecuritySettingsRepository implements SecuritySettingsRepository {

    private static final String PREFIX = "system.security.";

    private final JdbcTemplate jdbc;

    public JdbcSecuritySettingsRepository(final JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public SecuritySettings load() {
        final Map<String, String> values = this.jdbc
                .query(
                        "select config_key, config_value from sys_config where group_key = 'security'",
                        (row, index) -> Map.entry(row.getString("config_key"), row.getString("config_value")))
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        return new SecuritySettings(
                Integer.parseInt(JdbcSecuritySettingsRepository.value(values, "password_min_length")),
                Integer.parseInt(JdbcSecuritySettingsRepository.value(values, "password_max_length")),
                JdbcSecuritySettingsRepository.flag(values, "require_lower"),
                JdbcSecuritySettingsRepository.flag(values, "require_upper"),
                JdbcSecuritySettingsRepository.flag(values, "require_digit"),
                JdbcSecuritySettingsRepository.flag(values, "require_symbol"),
                JdbcSecuritySettingsRepository.flag(values, "mfa_enabled"),
                Integer.parseInt(JdbcSecuritySettingsRepository.value(values, "mfa_remember_days")),
                Long.parseLong(JdbcSecuritySettingsRepository.value(values, "revision")));
    }

    @Override
    @Transactional
    public boolean save(final SecuritySettings settings) {
        // 先以修订号锁定本次写入，再在同一事务内更新所有字段，避免多行配置出现部分保存。
        final int updated = this.jdbc.update(
                "update sys_config set config_value = ? where config_key = ? and group_key = 'security' and config_value = ?",
                Long.toString(settings.revision() + 1),
                JdbcSecuritySettingsRepository.PREFIX + "revision",
                Long.toString(settings.revision()));
        if (updated == 0) {
            return false;
        }
        final Map<String, String> values = Map.of(
                "password_min_length", Integer.toString(settings.passwordMinLength()),
                "password_max_length", Integer.toString(settings.passwordMaxLength()),
                "require_lower", Boolean.toString(settings.requireLower()),
                "require_upper", Boolean.toString(settings.requireUpper()),
                "require_digit", Boolean.toString(settings.requireDigit()),
                "require_symbol", Boolean.toString(settings.requireSymbol()),
                "mfa_enabled", Boolean.toString(settings.mfaEnabled()),
                "mfa_remember_days", Integer.toString(settings.mfaRememberDays()));
        this.jdbc.batchUpdate(
                "update sys_config set config_value = ? where config_key = ? and group_key = 'security'",
                values.entrySet().stream()
                        .map(entry ->
                                new Object[] {entry.getValue(), JdbcSecuritySettingsRepository.PREFIX + entry.getKey()})
                        .toList());
        return true;
    }

    private static String value(final Map<String, String> values, final String name) {
        return Objects.requireNonNull(values.get(JdbcSecuritySettingsRepository.PREFIX + name), "缺少安全设置配置：" + name);
    }

    private static boolean flag(final Map<String, String> values, final String name) {
        return switch (JdbcSecuritySettingsRepository.value(values, name)) {
            case "true" -> true;
            case "false" -> false;
            default -> throw new IllegalStateException("安全设置布尔配置值不合法：" + name);
        };
    }
}

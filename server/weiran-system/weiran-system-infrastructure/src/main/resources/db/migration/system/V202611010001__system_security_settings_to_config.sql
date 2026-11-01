-- 将安全设置迁入内部配置组，保留现有值和修订号；旧表由此前迁移创建，不能回改。
insert into sys_config (config_key, config_value, config_type, description, is_builtin, group_key, field_type, required)
select 'system.security.settings',
       json_object(
           'passwordMinLength', password_min_length,
           'passwordMaxLength', password_max_length,
           'requireLower', require_lower,
           'requireUpper', require_upper,
           'requireDigit', require_digit,
           'requireSymbol', require_symbol,
           'mfaEnabled', mfa_enabled,
           'mfaRememberDays', mfa_remember_days,
           'revision', revision
       ),
       'json', '全局安全设置（内部）', 1, 'security', 'json', 1
from sys_security_settings where id = 1;

drop table sys_security_settings;

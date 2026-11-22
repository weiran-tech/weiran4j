-- 将内部安全配置拆为三段式标量键，一次性保留原值；运行时不再读取旧 JSON。
insert into sys_config (config_key, config_value, config_type, description, is_builtin, group_key, field_type, required)
select concat('system.security.', setting_fields.config_name),
       json_unquote(json_extract(legacy.config_value, concat('$.', setting_fields.json_name))),
       setting_fields.config_type, setting_fields.description, 1, 'security',
       if(setting_fields.config_type = 'boolean', 'switch', 'number'), 1
from sys_config legacy
cross join (
    select 'password_min_length' config_name, 'passwordMinLength' json_name, 'number' config_type, '密码最小长度' description
    union all select 'password_max_length', 'passwordMaxLength', 'number', '密码最大长度'
    union all select 'require_lower', 'requireLower', 'boolean', '密码必须包含小写字母'
    union all select 'require_upper', 'requireUpper', 'boolean', '密码必须包含大写字母'
    union all select 'require_digit', 'requireDigit', 'boolean', '密码必须包含数字'
    union all select 'require_symbol', 'requireSymbol', 'boolean', '密码必须包含符号'
    union all select 'mfa_enabled', 'mfaEnabled', 'boolean', '启用手机多因素认证'
    union all select 'mfa_remember_days', 'mfaRememberDays', 'number', '多因素认证免验天数'
    union all select 'revision', 'revision', 'number', '安全设置修订号（内部）'
) setting_fields
where legacy.config_key = 'system.security.settings';

delete from sys_config where config_key = 'system.security.settings';

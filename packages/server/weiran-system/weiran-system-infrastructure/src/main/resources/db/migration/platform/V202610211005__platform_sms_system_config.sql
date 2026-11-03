insert into sys_group (name, code, description, type, sort, status, is_builtin)
values ('短信配置分组', 'sms', '短信签名与验证码模板', 'config', 3, 'enabled', 1);

update sys_config
set
    config_key = 'system.sms.verify_template_code',
    group_key = 'sms',
    description = '验证码短信模板 CODE（需在短信服务商审核通过）'
where config_key = 'system.user.phone_login_sms_template_code';

insert into sys_config (
    config_key,
    config_value,
    config_type,
    description,
    is_builtin,
    group_key,
    field_type,
    required
)
values (
    'system.sms.sign_name',
    '',
    'string',
    '短信签名（需在阿里云短信服务审核通过）',
    1,
    'sms',
    'input',
    0
);

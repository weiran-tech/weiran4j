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
    'system.user.phone_login_sms_template_code',
    '',
    'string',
    '手机号验证码登录短信模板 CODE（需在短信服务商审核通过）',
    1,
    'user',
    'input',
    0
);

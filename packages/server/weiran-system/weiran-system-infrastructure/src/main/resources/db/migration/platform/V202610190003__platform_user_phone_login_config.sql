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
    'system.user.enable_phone_login',
    'false',
    'boolean',
    '启用手机号+短信验证码登录',
    1,
    'user',
    'switch',
    1
);

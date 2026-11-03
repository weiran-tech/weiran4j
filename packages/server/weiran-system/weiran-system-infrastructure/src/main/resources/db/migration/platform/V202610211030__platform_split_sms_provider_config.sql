update sys_config
set
    config_key = 'sms.local.verify_template_code',
    description = '本地短信验证码模板 CODE'
where config_key = 'system.sms.verify_template_code';

update sys_config
set
    config_key = 'sms.aliyun.sign_name',
    description = '阿里云短信签名（需审核通过）'
where config_key = 'system.sms.sign_name';

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
values
    ('sms.local.sign_name', '', 'string', '本地短信签名', 1, 'sms', 'input', 0),
    ('sms.aliyun.verify_template_code', '', 'string', '阿里云验证码短信模板 CODE（需审核通过）', 1, 'sms', 'input', 0);

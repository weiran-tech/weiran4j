update sys_group
set name = '通用', description = '通用系统配置'
where type = 'config' and code = 'general';

insert into sys_group (name, code, description, type, sort, status, is_builtin)
values ('系统模板', 'system_tpl', '系统短信模板配置', 'config', 4, 'enabled', 1);

update sys_config
set config_key = 'sms.sign_name', group_key = 'general', description = '短信签名'
where config_key = 'sms.aliyun.sign_name';

update sys_config
set config_key = 'sms.captcha_local', group_key = 'system_tpl', description = '本地验证码模板'
where config_key = 'sms.local.verify_template_code';

update sys_config
set config_key = 'sms.captcha_aliyun', group_key = 'system_tpl', description = '阿里云验证码模板'
where config_key = 'sms.aliyun.verify_template_code';

delete from sys_config
where config_key = 'sms.local.sign_name';

delete from sys_group
where type = 'config' and code = 'sms';

update sys_config
set config_key = 'sms.general.sign_name'
where config_key = 'sms.sign_name' and group_key = 'general';

update sys_config
set config_key = 'sms.system_tpl.captcha_local'
where config_key = 'sms.captcha_local' and group_key = 'system_tpl';

update sys_config
set config_key = 'sms.system_tpl.captcha_aliyun'
where config_key = 'sms.captcha_aliyun' and group_key = 'system_tpl';

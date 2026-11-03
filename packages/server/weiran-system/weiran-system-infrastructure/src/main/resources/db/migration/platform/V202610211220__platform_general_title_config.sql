update sys_config
set config_key = 'system.general.title', group_key = 'general'
where config_key = 'system.site.title';

update sys_config
set group_key = 'general'
where group_key = 'site';

delete from sys_group
where type = 'config' and group_key = 'config_system' and code = 'site';

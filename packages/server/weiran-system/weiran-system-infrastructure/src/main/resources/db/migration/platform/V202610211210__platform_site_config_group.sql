insert into sys_group (name, code, description, type, group_key, sort, status, is_builtin)
values ('站点', 'site', '站点公开配置', 'config', 'config_system', 3, 'enabled', 1);

update sys_config
set group_key = 'site'
where config_key = 'system.site.title' and group_key = 'general';

alter table sys_group
    add column group_key varchar(64) not null default 'config_system' comment '分组所属配置域' after type,
    drop index uk_sys_group_type_code,
    add unique key uk_sys_group_type_domain_code (type, group_key, code),
    add key idx_sys_group_domain_status_sort (type, group_key, status, sort, id);

update sys_group
set group_key = 'dict'
where type = 'dict';

update sys_group
set group_key = 'config_sms'
where type = 'config' and code = 'system_tpl';

insert into sys_group (name, code, description, type, group_key, sort, status, is_builtin)
values ('通用', 'general', '通用短信配置', 'config', 'config_sms', 1, 'enabled', 1);

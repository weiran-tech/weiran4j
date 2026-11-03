alter table sys_config
    add column group_key varchar(64) not null default 'general' comment '配置分组键',
    add column field_type varchar(16) not null default 'input' comment '表单字段类型',
    add column field_options varchar(2048) null comment '表单选项 JSON',
    add column required tinyint(1) not null default 0 comment '是否必填';

update sys_config
set config_key = concat('system.', substring(config_key, 5))
where config_key like 'sys.%';

update sys_config
set
    group_key = 'general',
    field_type = 'input',
    required = 1,
    description = '系统标题'
where config_key = 'system.site.title';

delete from sys_role_menu where menu_id in (12, 121, 122);
delete from sys_menu where id = 12;
drop table sys_site_config;

alter table sys_dict
    rename to sys_group;

alter table sys_group
    add column type varchar(16) not null default 'dict' comment '分组类型：config/dict' after id,
    add column sort int not null default 0 comment '排序' after description,
    drop index uk_sys_dict_code,
    add unique key uk_sys_group_type_code (type, code),
    add key idx_sys_group_type_status_sort (type, status, sort, id);

alter table sys_dict_item
    change column dict_id group_id bigint not null comment '字典组 ID',
    drop index uk_sys_dict_item_dict_value,
    add unique key uk_sys_dict_item_group_value (group_id, value);

insert into sys_group (name, code, description, type, sort, status, is_builtin)
values ('通用设置', 'general', '通用系统配置', 'config', 1, 'enabled', 1),
       ('用户', 'user', '用户相关配置', 'config', 2, 'enabled', 1);

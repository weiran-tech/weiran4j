-- 关联表改用自增主键；原联合主键改为唯一索引，保留去重语义。
alter table sys_user_role
    drop primary key,
    add column id bigint not null auto_increment comment 'ID' first,
    add primary key (id),
    add unique key uk_sys_user_role_user_role (user_id, role_id);

alter table sys_role_menu
    drop primary key,
    add column id bigint not null auto_increment comment 'ID' first,
    add primary key (id),
    add unique key uk_sys_role_menu_role_menu (role_id, menu_id);

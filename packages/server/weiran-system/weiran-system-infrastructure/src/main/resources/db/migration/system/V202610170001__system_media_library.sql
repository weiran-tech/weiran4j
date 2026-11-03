create table sys_site_config
(
    id         bigint       not null auto_increment comment 'ID',
    ident      int          not null comment '固定站点配置编号',
    config_key varchar(64)  not null comment '站点配置键',
    contents   mediumtext   null comment '配置原始内容',
    created_at datetime     not null default current_timestamp comment '创建时间',
    updated_at datetime     not null default current_timestamp on update current_timestamp comment '更新时间',
    primary key (id),
    key idx_sys_site_config_ident_id (ident, id),
    unique key uk_sys_site_config_key (config_key)
) engine = InnoDB
  default charset = utf8mb4 comment ='系统站点配置';

create table sys_media
(
    id            bigint        not null auto_increment comment 'ID',
    original_name varchar(255)  not null comment '原始文件名',
    url           varchar(512)  not null comment '公开访问地址',
    object_name   varchar(512)  not null comment '存储对象名',
    size          bigint        not null comment '文件字节数',
    uploaded_by   bigint        not null comment '上传用户 ID',
    created_at    datetime      not null default current_timestamp comment '上传时间',
    primary key (id),
    unique key uk_sys_media_object_name (object_name),
    unique key uk_sys_media_url (url),
    key idx_sys_media_created_at_id (created_at, id),
    key idx_sys_media_original_name (original_name)
) engine = InnoDB
  default charset = utf8mb4 comment ='系统图片资产';

insert into sys_site_config (ident, config_key, contents)
values (1, 'site_introduction', null),
       (2, 'about', null),
       (3, 'user_agreement', null),
       (4, 'privacy_policy', null),
       (5, 'disclaimer', null),
       (6, 'contact_address', null),
       (7, 'contact_phone', null),
       (8, 'contact_email', null),
       (9, 'working_hours', null),
       (10, 'homepage_image', null);

insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (12, 2, '站点配置', 'menu', '/system/site-config', 'system/site-config', 'SlidersHorizontal', 'system:site-config:list', 7),
       (13, 2, '图片库', 'menu', '/system/media-library', 'system/media-library', 'Image', 'system:media-library:list', 8);

insert into sys_menu (id, parent_id, title, type, permission, sort)
values (121, 12, '查看站点配置', 'button', 'system:site-config:list', 1),
       (122, 12, '修改站点配置', 'button', 'system:site-config:update', 2),
       (123, 13, '查看图片', 'button', 'system:media-library:list', 1),
       (124, 13, '上传图片', 'button', 'system:media-library:upload', 2),
       (125, 13, '删除图片', 'button', 'system:media-library:delete', 3);

insert ignore into sys_role_menu (role_id, menu_id)
select 1, id
from sys_menu
where id between 12 and 13 or id between 121 and 125;

-- 旧站点配置后台已由 system 页面接管。
delete from sys_role_menu where menu_id between 1000 and 1002;
delete from sys_menu where id between 1000 and 1002;

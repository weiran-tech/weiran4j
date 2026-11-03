-- 基础账号由后台与网站复用；后台界面专属字段迁至一对一扩展表。
alter table sys_user
    add column type varchar(16) not null default 'backend' comment '账号类型：backend/web' after id,
    add key idx_sys_user_type (type),
    add constraint chk_sys_user_type check (type in ('backend', 'web'));

create table sys_user_backend
(
    user_id        bigint       not null comment 'sys_user.id',
    avatar         varchar(256) null comment '头像地址',
    gender         varchar(16)  not null default 'unknown' comment '性别：male/female/unknown',
    preferences    json         null comment '后台界面偏好',
    favorite_menus json         null comment '后台收藏菜单 ID 数组',
    primary key (user_id),
    key idx_sys_user_backend_gender (gender)
) engine = InnoDB
  default charset = utf8mb4 comment ='后台用户扩展';

insert into sys_user_backend (user_id, avatar, gender, preferences, favorite_menus)
select id, avatar, gender, preferences, favorite_menus
from sys_user;

alter table sys_user
    drop column avatar,
    drop column gender,
    drop column preferences,
    drop column favorite_menus;

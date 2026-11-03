-- 写入时登记资源引用；删除时锁定 sys_media 行，避免新的登记越过引用检查。
alter table sys_media
    add column status varchar(16) not null default 'active' comment '资源状态：active/deleting' after size;

create table sys_media_reference
(
    id          bigint       not null auto_increment comment 'ID',
    media_id    bigint       not null comment 'sys_media.id',
    source_type varchar(64)  not null comment '引用来源类型',
    source_id   varchar(128) not null comment '来源记录 ID',
    field_key   varchar(64)  not null comment '引用字段',
    label       varchar(256) not null comment '资源库显示位置',
    primary key (id),
    unique key uk_sys_media_reference_source (media_id, source_type, source_id, field_key),
    key idx_sys_media_reference_owner (source_type, source_id, field_key)
) engine = InnoDB default charset = utf8mb4 comment ='资源引用登记';

-- 旧数据补齐。配置字段的历史格式包含单 URL、URL 数组及 HTML，保守匹配以避免漏保护。
insert into sys_media_reference (media_id, source_type, source_id, field_key, label)
select media.id, 'system_config', cast(config.id as char), 'config_value', concat('系统配置：', config.config_key)
from sys_media media
join sys_config config on locate(media.url, config.config_value) > 0;

insert into sys_media_reference (media_id, source_type, source_id, field_key, label)
select media.id, 'user_avatar', cast(profile.user_id as char), 'avatar', concat('用户头像：#', profile.user_id)
from sys_media media
join sys_user_backend profile on profile.avatar = media.url;

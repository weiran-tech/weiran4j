-- 后台用户资料回归单表；旧迁移保持不变，已有资料先复制再删扩展表。
alter table sys_user
    add column avatar json null comment '文字头像：text/background' after phone,
    add column gender varchar(16) not null default 'unknown' comment '性别：male/female/unknown' after avatar,
    add column preferences json null comment '后台界面偏好' after gender,
    add column favorite_menus json null comment '后台收藏菜单 ID 数组' after preferences,
    add key idx_sys_user_gender (gender);

update sys_user user join sys_user_backend profile on profile.user_id = user.id
set user.gender = profile.gender,
    user.preferences = profile.preferences,
    user.favorite_menus = profile.favorite_menus;

-- 图片头像不再作为用户资料；释放旧资源引用，管理员可按正常流程清理不再使用的文件。
delete from sys_media_reference where source_type = 'user_avatar';
drop table sys_user_backend;

-- 若历史 backend/web 账号有相同用户名或手机号，新增全局唯一键会失败，须先处理冲突，不静默改名或合并账号。
alter table sys_user
    drop index uk_sys_user_type_username,
    drop index uk_sys_user_type_phone,
    drop index uk_sys_user_type_email,
    add unique key uk_sys_user_username (username),
    add unique key uk_sys_user_phone (phone),
    drop check chk_sys_user_type,
    drop column type,
    drop column email;

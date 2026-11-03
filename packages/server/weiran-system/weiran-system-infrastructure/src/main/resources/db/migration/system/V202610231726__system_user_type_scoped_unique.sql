-- 账号标识在同一类型内唯一；手机号与邮箱允许多个 NULL。
-- 原全局唯一索引已保证迁移前不存在同字段重复值，可直接替换为复合唯一索引。
alter table sys_user
    drop index uk_sys_user_username,
    drop index uk_sys_user_phone,
    drop index uk_sys_user_email,
    drop index idx_sys_user_type,
    add unique key uk_sys_user_type_username (type, username),
    add unique key uk_sys_user_type_phone (type, phone),
    add unique key uk_sys_user_type_email (type, email);

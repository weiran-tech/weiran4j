-- 用户账号联系方式全局唯一；MySQL 唯一索引允许多个 NULL。
alter table sys_user
    add unique key uk_sys_user_email (email),
    add unique key uk_sys_user_phone (phone);

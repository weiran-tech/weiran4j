alter table sys_task
    add column user_type varchar(32) not null default 'system' comment '任务创建者身份类型' after created_by,
    drop index idx_sys_task_owner,
    add index idx_sys_task_owner (user_type, created_by, id);

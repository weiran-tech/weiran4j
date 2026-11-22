-- 仅 local/test 的演示业务结果；任务与逐项状态由 sys_task、sys_task_detail 保存。
create table demo_batch_item
(
    id         bigint       not null auto_increment,
    job_id     bigint       not null,
    item_no    bigint       not null,
    item_name  varchar(255) not null,
    item_value varchar(255) not null,
    primary key (id),
    unique key uk_demo_batch_item_job_no (job_id, item_no)
) engine = InnoDB default charset = utf8mb4 comment = 'local/test 批处理演示结果';

-- 真实事务与 worker 测试使用的业务结果表，只在 test profile 加载。
create table test_batch_item
(
    id         bigint       not null auto_increment,
    job_id     bigint       not null,
    item_no    bigint       not null,
    item_name  varchar(255) not null,
    item_value varchar(255) not null,
    primary key (id),
    unique key uk_test_batch_item_job_no (job_id, item_no)
) engine = InnoDB default charset = utf8mb4;

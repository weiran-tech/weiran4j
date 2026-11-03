-- 每个 type 一行；更新该行时由 InnoDB 行锁保证原子递增。
create table sys_sequence (
    id       bigint not null auto_increment primary key,
    type     varchar(64) character set ascii collate ascii_bin not null,
    sequence bigint not null,
    created_at datetime(3) not null default current_timestamp(3),
    unique key uk_sys_sequence_type (type),
    constraint chk_sys_sequence_positive check (sequence > 0)
) engine=InnoDB default charset=utf8mb4 comment='分类型自增序号';

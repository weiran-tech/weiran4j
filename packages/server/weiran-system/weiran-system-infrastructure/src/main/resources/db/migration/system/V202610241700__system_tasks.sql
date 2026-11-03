create table sys_task
(
    id             bigint       not null auto_increment comment '任务 ID',
    kind           varchar(64)  not null comment '处理器类型',
    source_name    varchar(255) not null comment '原始文件名',
    source_key     varchar(255) null comment '私有输入对象键，保留期后清理',
    created_by     bigint       not null comment '创建用户 ID',
    status         varchar(24)  not null default 'queued',
    phase          varchar(24)  not null default 'waiting',
    total          bigint       null,
    processed      bigint       not null default 0,
    succeeded      bigint       not null default 0,
    failed         bigint       not null default 0,
    error_message  varchar(500) null comment '任务级失败原因',
    worker         varchar(64)  null,
    heartbeat_at   datetime     null,
    created_at     datetime     not null default current_timestamp,
    finished_at    datetime     null,
    primary key (id),
    key idx_sys_task_owner (created_by, id),
    key idx_sys_task_claim (status, heartbeat_at, id)
) engine = InnoDB default charset = utf8mb4 comment = '持久化批处理任务';

create table sys_task_detail
(
    id          bigint       not null auto_increment comment '明细 ID',
    task_id     bigint       not null comment '任务 ID',
    item_no     bigint       not null comment '行号或文件序号',
    item_name   varchar(255) not null comment '行标识或文件路径',
    status      varchar(24)  not null comment 'succeeded / failed',
    message     varchar(500) null comment '逐项失败原因',
    created_at  datetime     not null default current_timestamp,
    primary key (id),
    unique key uk_sys_task_detail_item (task_id, item_no),
    key idx_sys_task_detail_status (task_id, status, item_no),
    constraint fk_sys_task_detail_task foreign key (task_id) references sys_task (id)
) engine = InnoDB default charset = utf8mb4 comment = '批处理逐项结果';

insert into sys_menu (id, parent_id, title, type, permission, sort)
values (126, 13, '查看批处理任务', 'button', 'system:batch-job:list', 4),
       (127, 13, '创建批处理任务', 'button', 'system:batch-job:create', 5),
       (128, 13, '取消批处理任务', 'button', 'system:batch-job:cancel', 6);

insert ignore into sys_role_menu (role_id, menu_id)
values (1, 126), (1, 127), (1, 128);

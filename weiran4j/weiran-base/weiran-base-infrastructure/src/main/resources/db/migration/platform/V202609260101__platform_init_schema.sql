-- weiran-platform 表结构：字典、字典项、系统配置、操作日志。
-- 约定：utf8mb4 / InnoDB；不建外键（应用层保证），关联列建索引。

create table sys_dict
(
    id          bigint       not null auto_increment comment 'ID',
    name        varchar(64)  not null comment '名称',
    code        varchar(64)  not null comment '编码',
    description varchar(256) null comment '描述',
    status      varchar(16)  not null default 'enabled' comment '状态：enabled/disabled',
    is_builtin  tinyint(1)   not null default 0 comment '是否内置',
    created_at  datetime     not null default current_timestamp comment '创建时间',
    updated_at  datetime     not null default current_timestamp on update current_timestamp comment '更新时间',
    created_by  bigint       null comment '创建人',
    updated_by  bigint       null comment '更新人',
    primary key (id),
    unique key uk_sys_dict_code (code)
) engine = InnoDB
  default charset = utf8mb4 comment ='字典';

create table sys_dict_item
(
    id         bigint       not null auto_increment comment 'ID',
    dict_id    bigint       not null comment '字典 ID',
    label      varchar(64)  not null comment '显示文本',
    value      varchar(64)  not null comment '值',
    color      varchar(32)  null comment '标签颜色',
    sort       int          not null default 0 comment '排序',
    status     varchar(16)  not null default 'enabled' comment '状态：enabled/disabled',
    remark     varchar(256) null comment '备注',
    created_at datetime     not null default current_timestamp comment '创建时间',
    updated_at datetime     not null default current_timestamp on update current_timestamp comment '更新时间',
    created_by bigint       null comment '创建人',
    updated_by bigint       null comment '更新人',
    primary key (id),
    unique key uk_sys_dict_item_dict_value (dict_id, value)
) engine = InnoDB
  default charset = utf8mb4 comment ='字典项';

create table sys_config
(
    id           bigint        not null auto_increment comment 'ID',
    config_key   varchar(128)  not null comment '键',
    config_value varchar(4096) not null default '' comment '值',
    config_type  varchar(16)   not null default 'string' comment '类型：string/number/boolean/json',
    description  varchar(256)  null comment '描述',
    is_builtin   tinyint(1)    not null default 0 comment '是否内置',
    created_at   datetime      not null default current_timestamp comment '创建时间',
    updated_at   datetime      not null default current_timestamp on update current_timestamp comment '更新时间',
    created_by   bigint        null comment '创建人',
    updated_by   bigint        null comment '更新人',
    primary key (id),
    unique key uk_sys_config_key (config_key)
) engine = InnoDB
  default charset = utf8mb4 comment ='系统配置';

create table sys_operation_log
(
    id            bigint        not null auto_increment comment 'ID',
    user_id       bigint        null comment '操作人 ID',
    username      varchar(64)   null comment '操作人用户名',
    module        varchar(64)   not null comment '模块',
    description   varchar(128)  not null comment '操作描述',
    method        varchar(16)   not null default '' comment 'HTTP 方法',
    path          varchar(256)  not null default '' comment '请求路径',
    request_body  varchar(4096) null comment '请求体（脱敏、截断到 4096）',
    response_code int           not null default 0 comment '响应码：0 成功，否则为错误码',
    success       tinyint(1)    not null default 1 comment '是否成功',
    error_message varchar(512)  null comment '失败提示',
    duration_ms   bigint        not null default 0 comment '耗时（毫秒）',
    ip            varchar(64)   not null default '' comment '客户端 IP',
    user_agent    varchar(512)  not null default '' comment 'User-Agent',
    created_at    datetime      not null default current_timestamp comment '时间',
    primary key (id),
    key idx_sys_operation_log_created_at (created_at),
    key idx_sys_operation_log_user_id (user_id)
) engine = InnoDB
  default charset = utf8mb4 comment ='操作日志';

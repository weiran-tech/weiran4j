-- weiran-system 表结构：用户、角色、菜单、部门、登录日志。
-- 约定：utf8mb4 / InnoDB；不建外键（应用层保证），关联列建索引。

create table sys_user
(
    id                  bigint       not null auto_increment comment 'ID',
    username            varchar(32)  not null comment '用户名',
    nickname            varchar(32)  not null comment '昵称',
    password            varchar(100) not null comment '密码（BCrypt）',
    email               varchar(128) null comment '邮箱',
    phone               varchar(20)  null comment '手机号',
    avatar              varchar(256) null comment '头像地址',
    gender              varchar(16)  not null default 'unknown' comment '性别：male/female/unknown',
    department_id       bigint       null comment '部门 ID',
    status              varchar(16)  not null default 'enabled' comment '状态：enabled/disabled',
    token_version       int          not null default 0 comment '令牌版本：改密/重置/禁用时加一，旧令牌失效',
    last_login_at       datetime     null comment '最近登录时间',
    last_login_ip       varchar(64)  null comment '最近登录 IP',
    password_updated_at datetime     null comment '密码修改时间',
    is_builtin          tinyint(1)   not null default 0 comment '是否内置（不可删除/禁用）',
    created_at          datetime     not null default current_timestamp comment '创建时间',
    updated_at          datetime     not null default current_timestamp on update current_timestamp comment '更新时间',
    created_by          bigint       null comment '创建人',
    updated_by          bigint       null comment '更新人',
    primary key (id),
    unique key uk_sys_user_username (username),
    key idx_sys_user_department_id (department_id)
) engine = InnoDB
  default charset = utf8mb4 comment ='用户';

create table sys_role
(
    id          bigint       not null auto_increment comment 'ID',
    name        varchar(64)  not null comment '名称',
    code        varchar(64)  not null comment '编码',
    description varchar(256) null comment '描述',
    sort        int          not null default 0 comment '排序',
    status      varchar(16)  not null default 'enabled' comment '状态：enabled/disabled',
    is_builtin  tinyint(1)   not null default 0 comment '是否内置',
    created_at  datetime     not null default current_timestamp comment '创建时间',
    updated_at  datetime     not null default current_timestamp on update current_timestamp comment '更新时间',
    created_by  bigint       null comment '创建人',
    updated_by  bigint       null comment '更新人',
    primary key (id),
    unique key uk_sys_role_code (code)
) engine = InnoDB
  default charset = utf8mb4 comment ='角色';

create table sys_user_role
(
    user_id bigint not null comment '用户 ID',
    role_id bigint not null comment '角色 ID',
    primary key (user_id, role_id),
    key idx_sys_user_role_role_id (role_id)
) engine = InnoDB
  default charset = utf8mb4 comment ='用户-角色关联';

create table sys_menu
(
    id          bigint       not null auto_increment comment 'ID',
    parent_id   bigint       not null default 0 comment '父 ID，0 为根',
    title       varchar(64)  not null comment '标题',
    type        varchar(16)  not null comment '类型：directory/menu/button',
    path        varchar(256) null comment '路由路径',
    component   varchar(256) null comment '前端组件标识',
    icon        varchar(64)  null comment '图标名',
    permission  varchar(128) null comment '权限码',
    sort        int          not null default 0 comment '排序',
    visible     tinyint(1)   not null default 1 comment '是否在导航中显示',
    keep_alive  tinyint(1)   not null default 0 comment '是否缓存页面',
    is_external tinyint(1)   not null default 0 comment '是否外链',
    status      varchar(16)  not null default 'enabled' comment '状态：enabled/disabled',
    created_at  datetime     not null default current_timestamp comment '创建时间',
    updated_at  datetime     not null default current_timestamp on update current_timestamp comment '更新时间',
    created_by  bigint       null comment '创建人',
    updated_by  bigint       null comment '更新人',
    primary key (id),
    key idx_sys_menu_parent_id (parent_id)
) engine = InnoDB
  default charset = utf8mb4 comment ='菜单';

create table sys_role_menu
(
    role_id bigint not null comment '角色 ID',
    menu_id bigint not null comment '菜单 ID',
    primary key (role_id, menu_id),
    key idx_sys_role_menu_menu_id (menu_id)
) engine = InnoDB
  default charset = utf8mb4 comment ='角色-菜单关联';

create table sys_department
(
    id         bigint      not null auto_increment comment 'ID',
    parent_id  bigint      not null default 0 comment '父 ID，0 为根',
    name       varchar(64) not null comment '名称',
    code       varchar(64) not null comment '编码',
    leader_id  bigint      null comment '负责人用户 ID',
    phone      varchar(20) null comment '联系电话',
    sort       int         not null default 0 comment '排序',
    status     varchar(16) not null default 'enabled' comment '状态：enabled/disabled',
    created_at datetime    not null default current_timestamp comment '创建时间',
    updated_at datetime    not null default current_timestamp on update current_timestamp comment '更新时间',
    created_by bigint      null comment '创建人',
    updated_by bigint      null comment '更新人',
    primary key (id),
    unique key uk_sys_department_code (code),
    key idx_sys_department_parent_id (parent_id),
    key idx_sys_department_leader_id (leader_id)
) engine = InnoDB
  default charset = utf8mb4 comment ='部门';

create table sys_login_log
(
    id         bigint       not null auto_increment comment 'ID',
    user_id    bigint       null comment '用户 ID（用户名不存在的失败登录为空）',
    username   varchar(64)  not null comment '登录时提交的用户名',
    ip         varchar(64)  not null default '' comment '客户端 IP',
    user_agent varchar(512) not null default '' comment 'User-Agent',
    browser    varchar(64)  not null default '' comment '浏览器',
    os         varchar(64)  not null default '' comment '操作系统',
    event_type varchar(16)  not null comment '事件：login/logout',
    status     varchar(16)  not null comment '结果：success/fail',
    message    varchar(256) not null default '' comment '结果说明',
    created_at datetime     not null default current_timestamp comment '发生时间',
    primary key (id),
    key idx_sys_login_log_user_id (user_id),
    key idx_sys_login_log_username (username),
    key idx_sys_login_log_created_at (created_at)
) engine = InnoDB
  default charset = utf8mb4 comment ='登录日志';

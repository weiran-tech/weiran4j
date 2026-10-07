-- 外部身份绑定（change external-identity-login，D-015）：外部身份只按 (provider, external_id) 映射到唯一的本地用户。
-- 约定同 init：不建外键，删除用户时由仓储连带删除绑定。

create table sys_user_identity
(
    id           bigint       not null auto_increment comment 'ID',
    user_id      bigint       not null comment '本地用户 ID',
    provider     varchar(32)  not null comment '提供方 id（weiran.auth.providers 的键）',
    external_id  varchar(191) not null comment '外部身份标识（OIDC sub / CAS user）',
    display_name varchar(64)  null comment '外部显示名（绑定时的快照，仅展示用）',
    created_at   datetime     not null default current_timestamp comment '绑定时间',
    created_by   bigint       null comment '绑定操作人（自助绑定 / 自动开通为用户本人）',
    primary key (id),
    unique key uk_sys_user_identity (provider, external_id),
    key idx_sys_user_identity_user_id (user_id)
) engine = InnoDB
  default charset = utf8mb4 comment ='用户外部身份绑定';

-- 用户管理（id 3）下的按钮权限：查看 / 绑定 / 解绑他人的外部身份。super_admin 放行一切，无需写 sys_role_menu。
insert into sys_menu (id, parent_id, title, type, permission, sort)
values (120, 3, '外部身份', 'button', 'system:user:identity', 5);

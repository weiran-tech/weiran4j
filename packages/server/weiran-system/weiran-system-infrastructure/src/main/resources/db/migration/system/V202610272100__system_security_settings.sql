create table sys_security_settings (
    id tinyint not null primary key,
    password_min_length int not null,
    password_max_length int not null,
    require_lower tinyint(1) not null,
    require_upper tinyint(1) not null,
    require_digit tinyint(1) not null,
    require_symbol tinyint(1) not null,
    mfa_enabled tinyint(1) not null,
    mfa_remember_days int not null,
    revision bigint not null default 0,
    updated_at datetime not null default current_timestamp on update current_timestamp
);

insert into sys_security_settings (
    id, password_min_length, password_max_length, require_lower, require_upper,
    require_digit, require_symbol, mfa_enabled, mfa_remember_days
)
values (1, 8, 64, 1, 0, 1, 0, 0, 7);

insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (23, 2, '安全设置', 'menu', '/system/security', 'system/security/SecuritySettingsPage',
        'ShieldCheck', 'system:security:list', 9);

insert into sys_menu (id, parent_id, title, type, permission, sort)
values (129, 23, '修改安全设置', 'button', 'system:security:update', 1);

insert into sys_role_menu (role_id, menu_id)
values (1, 23), (1, 129);

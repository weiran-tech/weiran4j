insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (12, 2, '短信配置', 'menu', '/system/sms', 'system/sms/SmsConfigsPage', 'MessageSquare', 'system:config:list', 7);

insert ignore into sys_role_menu (role_id, menu_id)
values (1, 12);

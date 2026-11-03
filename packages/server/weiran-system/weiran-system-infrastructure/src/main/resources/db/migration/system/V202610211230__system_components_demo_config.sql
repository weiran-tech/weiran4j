insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (19, 14, '配置表单', 'menu', '/demo/config', 'demo/DemoConfigPage', 'SlidersHorizontal', null, 5);

insert ignore into sys_role_menu (role_id, menu_id)
values (1, 19);

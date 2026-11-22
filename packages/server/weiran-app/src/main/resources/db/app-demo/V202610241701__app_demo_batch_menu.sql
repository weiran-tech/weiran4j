insert ignore into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (20, 14, '批处理任务', 'menu', '/demo/batch', 'demo/DemoBatchPage', 'ClipboardList', 'system:batch-job:list', 6);

insert ignore into sys_role_menu (role_id, menu_id) values (1, 20);

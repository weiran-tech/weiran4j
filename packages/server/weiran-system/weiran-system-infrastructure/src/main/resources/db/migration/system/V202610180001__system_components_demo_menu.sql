-- 后台封装组件演示页；仅展示组件，不提供新的业务操作权限。
insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (14, 2, '组件演示', 'menu', '/system/components-demo', 'demo/ComponentsDemoPage', 'Puzzle', null, 9);

-- 与现有菜单一致，超级管理员在角色管理页可以看到菜单授权。
insert ignore into sys_role_menu (role_id, menu_id)
values (1, 14);

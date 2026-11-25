-- 仅本应用的 local/test profile 加载；下游通用基座不包含演示菜单。
insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (14, 0, '组件演示', 'directory', '/demo', null, 'Puzzle', null, 4),
       (15, 14, '列表与筛选', 'menu', '/demo/list', 'demo/DemoListPage', 'LayoutList', null, 1),
       (16, 14, '导航列表', 'menu', '/demo/navigation', 'demo/DemoNavigationPage', 'LayoutGrid', null, 2),
       (17, 14, '字段与标签', 'menu', '/demo/fields', 'demo/DemoFieldsPage', 'Tag', null, 3),
       (18, 14, '权限与入口', 'menu', '/demo/access', 'demo/DemoAccessPage', 'ShieldCheck', null, 4),
       (19, 14, '配置表单', 'menu', '/demo/config', 'demo/DemoConfigPage', 'SlidersHorizontal', null, 5);

insert into sys_role_menu (role_id, menu_id)
values (1, 14), (1, 15), (1, 16), (1, 17), (1, 18), (1, 19);

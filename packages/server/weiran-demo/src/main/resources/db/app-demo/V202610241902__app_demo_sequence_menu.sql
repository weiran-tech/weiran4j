-- 可选演示菜单和权限；生产 bootJar 不包含 weiran-demo。
insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (21, 14, '自增序号', 'menu', '/demo/sequence', 'demo/DemoSequencePage', 'Database', 'system:sequence:next', 7);

insert into sys_menu (id, parent_id, title, type, permission, sort)
values (22, 21, '分配演示序号', 'button', 'system:sequence:next', 1);

insert into sys_role_menu (role_id, menu_id)
values (1, 21), (1, 22);

-- weiran-system 种子数据：根部门、超级管理员角色与用户、系统菜单与按钮。
-- 菜单 ID 固定，前端与测试按 ID 引用；按钮从 100 起。

insert into sys_department (id, parent_id, name, code, sort, status)
values (1, 0, '总公司', 'HQ', 0, 'enabled');

insert into sys_role (id, name, code, description, sort, status, is_builtin)
values (1, '超级管理员', 'super_admin', '拥有全部权限的内置角色', 0, 'enabled', 1);

-- 初始密码 admin123（BCrypt, cost 10）。上线前必须修改。
insert into sys_user (id, username, nickname, password, gender, department_id, status, is_builtin)
values (1, 'admin', '超级管理员', '$2a$10$Ta2ng6/OKD8cvUpXegEZrugy0w.BoRK9aqM/xhVFQkIImx4.LMPQG', 'unknown', 1,
        'enabled', 1);

insert into sys_user_role (user_id, role_id)
values (1, 1);

insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (1, 0, '首页', 'menu', '/dashboard', 'dashboard/DashboardPage', 'LayoutDashboard', null, 1),
       (2, 0, '系统管理', 'directory', '/system', null, 'Settings', null, 2),
       (3, 2, '用户管理', 'menu', '/system/users', 'system/users/UsersPage', 'UsersRound', 'system:user:list', 1),
       (4, 2, '角色管理', 'menu', '/system/roles', 'system/roles/RolesPage', 'ShieldCheck', 'system:role:list', 2),
       (5, 2, '菜单管理', 'menu', '/system/menus', 'system/menus/MenusPage', 'LayoutList', 'system:menu:list', 3),
       (6, 2, '部门管理', 'menu', '/system/departments', 'system/departments/DepartmentsPage', 'Building2',
        'system:department:list', 4),
       (7, 2, '字典管理', 'menu', '/system/dicts', 'system/dicts/DictsPage', 'BookOpen', 'system:dict:list', 5),
       (8, 2, '系统配置', 'menu', '/system/configs', 'system/configs/ConfigsPage', 'SlidersHorizontal',
        'system:config:list', 6),
       (9, 0, '日志审计', 'directory', '/logs', null, 'ScrollText', null, 3),
       (10, 9, '登录日志', 'menu', '/logs/login', 'logs/LoginLogsPage', 'LogIn', 'system:login-log:list', 1),
       (11, 9, '操作日志', 'menu', '/logs/operation', 'logs/OperationLogsPage', 'FileClock',
        'system:operation-log:list', 2);

insert into sys_menu (id, parent_id, title, type, permission, sort)
values (100, 3, '新增用户', 'button', 'system:user:create', 1),
       (101, 3, '修改用户', 'button', 'system:user:update', 2),
       (102, 3, '删除用户', 'button', 'system:user:delete', 3),
       (103, 3, '重置密码', 'button', 'system:user:reset-password', 4),
       (104, 4, '新增角色', 'button', 'system:role:create', 1),
       (105, 4, '修改角色', 'button', 'system:role:update', 2),
       (106, 4, '删除角色', 'button', 'system:role:delete', 3),
       (107, 4, '分配菜单', 'button', 'system:role:assign-menu', 4),
       (108, 5, '新增菜单', 'button', 'system:menu:create', 1),
       (109, 5, '修改菜单', 'button', 'system:menu:update', 2),
       (110, 5, '删除菜单', 'button', 'system:menu:delete', 3),
       (111, 6, '新增部门', 'button', 'system:department:create', 1),
       (112, 6, '修改部门', 'button', 'system:department:update', 2),
       (113, 6, '删除部门', 'button', 'system:department:delete', 3),
       (114, 7, '新增字典', 'button', 'system:dict:create', 1),
       (115, 7, '修改字典', 'button', 'system:dict:update', 2),
       (116, 7, '删除字典', 'button', 'system:dict:delete', 3),
       (117, 8, '新增配置', 'button', 'system:config:create', 1),
       (118, 8, '修改配置', 'button', 'system:config:update', 2),
       (119, 8, '删除配置', 'button', 'system:config:delete', 3);

-- 超级管理员在逻辑上直接放行，这里仍绑定全部菜单，便于在角色管理页里看到一致的勾选状态。
insert into sys_role_menu (role_id, menu_id)
select 1, id
from sys_menu;

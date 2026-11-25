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


-- 仅 local/test 加载；组件演示使用真实配置与媒体接口，不影响生产库。
insert ignore into sys_group (name, code, description, type, group_key, sort, status, is_builtin)
values ('组件演示', 'demo', '组件演示专用配置', 'config', 'config_system', 99, 'enabled', 1);

insert ignore into sys_config (config_key, config_value, config_type, group_key, field_type, field_options, required, description, is_builtin)
values ('system.demo.input', 'Weiran Admin', 'string', 'demo', 'input', null, 1, '单行输入 · input', 1),
       ('system.demo.textarea', '多行文本示例', 'string', 'demo', 'textarea', null, 0, '多行文本 · textarea', 1),
       ('system.demo.number', '42', 'number', 'demo', 'number', null, 0, '数字 · number', 1),
       ('system.demo.switch', 'true', 'boolean', 'demo', 'switch', null, 0, '开关 · switch', 1),
       ('system.demo.select', 'local', 'string', 'demo', 'select', '[{"label":"本地","value":"local"},{"label":"阿里云","value":"aliyun"}]', 0, '下拉选择 · select', 1),
       ('system.demo.json', '{"enabled":true,"limit":10}', 'json', 'demo', 'json', null, 0, 'JSON · json', 1),
       ('system.demo.image', '', 'string', 'demo', 'file', null, 0, '单文件上传 · file', 1),
       ('system.demo.richtext', '<p><strong>富文本示例</strong>：支持标题、加粗和列表。</p>', 'string', 'demo', 'richtext', null, 0, '富文本 · richtext', 1),
       ('system.demo.images', '[]', 'json', 'demo', 'json', null, 0, '多文件上传 · FileUpload', 1);


insert ignore into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (20, 14, '批处理任务', 'menu', '/demo/batch', 'demo/DemoBatchPage', 'ClipboardList', 'system:batch-job:list', 6);

insert ignore into sys_role_menu (role_id, menu_id) values (1, 20);


-- 可选演示菜单和权限；生产 bootJar 不包含 weiran-demo。
insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (21, 14, '自增序号', 'menu', '/demo/sequence', 'demo/DemoSequencePage', 'Database', 'system:sequence:next', 7);

insert into sys_menu (id, parent_id, title, type, permission, sort)
values (22, 21, '分配演示序号', 'button', 'system:sequence:next', 1);

insert into sys_role_menu (role_id, menu_id)
values (1, 21), (1, 22);


update sys_config set field_type = 'files', description = '多文件上传 · files' where config_key = 'system.demo.images';
update sys_authorization_revision set revision = revision + 1 where id = 1;

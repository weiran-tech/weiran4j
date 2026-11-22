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

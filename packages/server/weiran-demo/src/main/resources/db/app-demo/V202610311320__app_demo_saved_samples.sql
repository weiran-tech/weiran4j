-- 仅 local/test 加载；组件演示的可编辑示例值持久化在一个 JSON 配置中。
insert ignore into sys_config (config_key, config_value, config_type, group_key, field_type, field_options, required, description, is_builtin)
values ('system.demo.samples', '{}', 'json', 'demo', 'json', null, 0, '组件演示保存值', 1);

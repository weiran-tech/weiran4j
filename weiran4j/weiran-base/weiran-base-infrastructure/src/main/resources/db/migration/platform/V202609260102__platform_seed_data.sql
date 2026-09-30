-- weiran-platform 种子数据：内置字典与站点配置。

insert into sys_dict (id, name, code, description, status, is_builtin)
values (1, '用户性别', 'sys_user_gender', '用户性别选项', 'enabled', 1),
       (2, '通用状态', 'sys_common_status', '启用 / 禁用', 'enabled', 1);

insert into sys_dict_item (dict_id, label, value, color, sort, status)
values (1, '男', 'male', 'blue', 1, 'enabled'),
       (1, '女', 'female', 'pink', 2, 'enabled'),
       (1, '未知', 'unknown', 'grey', 3, 'enabled'),
       (2, '启用', 'enabled', 'green', 1, 'enabled'),
       (2, '禁用', 'disabled', 'red', 2, 'enabled');

insert into sys_config (config_key, config_value, config_type, description, is_builtin)
values ('sys.site.title', 'Weiran Admin', 'string', '站点标题（前端登录页与顶栏展示）', 1);

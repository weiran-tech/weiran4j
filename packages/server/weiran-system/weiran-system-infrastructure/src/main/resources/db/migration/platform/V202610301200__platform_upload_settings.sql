insert into sys_group (name, code, description, type, group_key, sort, status, is_builtin)
values ('上传设置', 'upload', '图片、视频和文件上传规则', 'config', 'config_system', 3, 'enabled', 1);

insert into sys_config (config_key, config_value, config_type, description, is_builtin, group_key, field_type, required)
values ('system.upload.image_formats', 'gif,jpg,jpeg,png', 'string', '图片上传格式', 1, 'upload', 'input', 1),
       ('system.upload.image_max_size_mb', '10', 'number', '图片上传大小（MB）', 1, 'upload', 'number', 1),
       ('system.upload.video_max_size_mb', '100', 'number', '视频上传大小（MB）', 1, 'upload', 'number', 1),
       ('system.upload.file_formats', 'pdf,gif', 'string', '文件上传格式（逗号分隔）', 1, 'upload', 'input', 1);

-- 图片、视频、普通文件三组均可配置格式与大小；旧设置原值保留。
insert into sys_config (config_key, config_value, config_type, description, is_builtin, group_key, field_type, required)
values ('system.upload.video_formats', 'mp4,webm,mov', 'string', '视频上传格式', 1, 'upload', 'input', 1),
       ('system.upload.file_max_size_mb', '10', 'number', '普通文件上传大小（MB）', 1, 'upload', 'number', 1);

-- 旧默认值里的 gif 实际按图片规则处理，不在普通文件组重复展示。
update sys_config
set config_value = 'pdf'
where config_key = 'system.upload.file_formats' and config_value = 'pdf,gif';

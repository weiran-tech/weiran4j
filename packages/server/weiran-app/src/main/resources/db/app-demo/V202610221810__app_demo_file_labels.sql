-- 历史 local/test 库已存在这些配置时，更新上传字段和文案，保留用户填写的值。
update sys_config
set field_type = 'file', description = '单文件上传 · file'
where config_key = 'system.demo.image';

update sys_config
set description = '多文件上传 · FileUpload'
where config_key = 'system.demo.images';

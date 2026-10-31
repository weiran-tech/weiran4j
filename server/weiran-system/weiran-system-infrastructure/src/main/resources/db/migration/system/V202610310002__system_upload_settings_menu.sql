-- 上传规则单独管理，沿用系统配置的读写权限。
insert into sys_menu (id, parent_id, title, type, path, component, icon, permission, sort)
values (24, 2, '上传配置', 'menu', '/system/upload-settings', 'system/upload-settings/UploadSettingsPage',
        'CloudUpload', 'system:config:list', 9);

insert into sys_role_menu (role_id, menu_id)
values (1, 24);

-- 上传是登录用户在配置、富文本等业务页面共用的能力，不依赖资源库按钮权限。
delete from sys_role_menu
where menu_id in (select id from sys_menu where id = 124 and permission = 'system:media-library:upload');
delete from sys_menu where id = 124 and permission = 'system:media-library:upload';

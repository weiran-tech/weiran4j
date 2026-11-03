-- 资源库更名为资源管理，上传配置并入该页面；清理此前的独立菜单。
delete from sys_role_menu
where menu_id in (select id from sys_menu where id = 24 and path = '/system/upload-settings');
delete from sys_menu where id = 24 and path = '/system/upload-settings';

update sys_menu
set title = '资源管理'
where id = 13 and path = '/system/media-library';

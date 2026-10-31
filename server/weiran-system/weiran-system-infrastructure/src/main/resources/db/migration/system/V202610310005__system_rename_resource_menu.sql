-- 仅更名菜单；页面内「资源管理」「上传配置」两个 Tab 不变。
update sys_menu
set title = '文件系统'
where id = 13 and path = '/system/media-library';

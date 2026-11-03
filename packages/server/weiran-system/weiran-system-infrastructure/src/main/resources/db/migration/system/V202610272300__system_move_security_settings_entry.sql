-- 安全设置改由用户下拉菜单进入；保留隐藏菜单节点以提供动态路由和权限。
update sys_menu
set parent_id = 0, visible = 0
where id = 23;

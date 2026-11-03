-- 部门能力退役：清理菜单与权限，再移除用户归属和部门表。
delete from sys_role_menu where menu_id in (6, 111, 112, 113);
delete from sys_menu where id in (111, 112, 113, 6);

alter table sys_user drop index idx_sys_user_department_id;
alter table sys_user drop column department_id;
drop table sys_department;

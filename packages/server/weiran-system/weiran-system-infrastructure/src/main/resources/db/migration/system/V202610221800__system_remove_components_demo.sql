-- 已发布的演示菜单迁移不可修改；从通用基座移除这些菜单。
delete from sys_role_menu where menu_id between 14 and 19;
delete from sys_menu where id between 14 and 19;

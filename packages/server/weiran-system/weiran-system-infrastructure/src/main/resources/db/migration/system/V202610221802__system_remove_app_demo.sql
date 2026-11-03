-- 已发布的 local/test 演示种子必须保留校验和；在全部环境清理其菜单。
DELETE FROM sys_role_menu WHERE menu_id BETWEEN 14 AND 19;
DELETE FROM sys_menu WHERE id BETWEEN 14 AND 19;

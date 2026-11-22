-- 页面演示已迁入文档站；保留历史迁移原文，仅清理框架保留号段中的演示数据。
delete from sys_role_menu where menu_id between 14 and 22;
delete from sys_menu where id between 14 and 22;
delete from sys_config where config_key like 'system.demo.%' and group_key = 'demo';
delete from sys_group where code = 'demo' and group_key = 'config_system';
drop table if exists demo_batch_item;
-- 菜单与授权关系变更后让其它实例丢弃旧快照。
update sys_authorization_revision set revision = revision + 1 where id = 1;

-- 示例菜单清理后的授权失效独立追加，保持 V202611230100 已执行内容及校验和不变。
update sys_authorization_revision set revision = revision + 1 where id = 1;

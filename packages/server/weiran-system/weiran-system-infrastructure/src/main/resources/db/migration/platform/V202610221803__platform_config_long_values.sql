-- 站点介绍和协议从原 TEXT 列迁入系统配置，保留完整内容。
ALTER TABLE sys_config MODIFY COLUMN config_value TEXT NOT NULL COMMENT '值';

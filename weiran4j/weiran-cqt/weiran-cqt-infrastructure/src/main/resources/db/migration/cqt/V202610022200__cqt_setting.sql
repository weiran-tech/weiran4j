-- 常青藤站点配置（原统一库 cqtxj2026.sc_setting，迁入时只改表名，列保持原样）。
-- 只建表；数据由 scripts/biz/import/cqt_setting.sql 在切换时导入，不写进 Flyway。
CREATE TABLE `cqt_setting` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ident` int DEFAULT NULL COMMENT '配置项编号',
  `name` varchar(255) DEFAULT NULL COMMENT '配置项名称',
  `contents` text COMMENT '配置内容（可能含 HTML）',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='常青藤站点配置';

-- 常青藤赛区（原统一库 cqtxj2026.regions，只改表名）。对外 ID 用 legacy_id。
-- 只建表；数据由 scripts/biz/import/cqt_regions.sql 导入。
CREATE TABLE `cqt_regions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `legacy_id` bigint NOT NULL COMMENT '赛区编号（对外 ID）',
  `parent_legacy_id` bigint NOT NULL DEFAULT '0' COMMENT '上级赛区编号',
  `name` varchar(200) NOT NULL,
  `code` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_region_legacy` (`legacy_id`),
  KEY `idx_region_parent` (`parent_legacy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='常青藤赛区';

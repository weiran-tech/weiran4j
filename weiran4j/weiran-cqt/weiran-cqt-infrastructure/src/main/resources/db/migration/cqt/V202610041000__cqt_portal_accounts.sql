-- 常青藤前台账号（原统一库 cqtxj2026.portal_accounts，迁入时只改表名，列保持原样）。
-- 新增两列：credential_type（FastAPI schema_2027/004 后加）与 token_version（令牌吊销，宪法 CP-8）。
-- phone_value / id_card_value 沿用 TEXT，只加前缀索引，避免登录、查重按约 8 万行全表扫描。
-- 只建表；数据由 scripts/biz/import/cqt_portal_accounts.sql 导入。
CREATE TABLE `cqt_portal_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `source_database` enum('zhongxi','qudao') NOT NULL COMMENT '来源库',
  `legacy_user_id` bigint NOT NULL COMMENT '来源库内的用户编号',
  `name_value` text NOT NULL COMMENT '姓名 / 学校名称',
  `password_hash` text NOT NULL COMMENT 'BCrypt 哈希（兼容 $2y$）',
  `remember_token` varchar(100) DEFAULT NULL,
  `user_type` tinyint DEFAULT NULL COMMENT '1 个人 2 学校',
  `legacy_uniid` varchar(255) DEFAULT NULL,
  `phone_value` text COMMENT '手机号（登录名）',
  `legacy_school_id` varchar(255) DEFAULT NULL COMMENT '学校编号',
  `id_card_value` text COMMENT '个人证件号 / 学校编号',
  `credential_type` enum('ID_CARD','OTHER') NOT NULL DEFAULT 'ID_CARD' COMMENT '证件类型',
  `city_legacy_id` int DEFAULT NULL COMMENT '赛区（cqt_regions.legacy_id）',
  `sex` tinyint DEFAULT NULL,
  `school_value` varchar(500) DEFAULT NULL,
  `contact_value` varchar(500) DEFAULT NULL,
  `address_value` text,
  `email` varchar(500) DEFAULT NULL,
  `audit_status` tinyint DEFAULT NULL COMMENT '0 通过 1 审核中 2 驳回',
  `license_file` varchar(500) DEFAULT NULL COMMENT '营业执照',
  `commitment_file` text COMMENT '承诺书',
  `rejection_reason` text COMMENT '驳回原因',
  `token_version` int NOT NULL DEFAULT 0 COMMENT '令牌版本：重置密码时加 1，旧令牌失效',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_portal_source_user` (`source_database`, `legacy_user_id`),
  KEY `idx_phone` (`phone_value`(20)),
  KEY `idx_id_card` (`id_card_value`(32))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='常青藤前台账号';

-- 常青藤赛事、赛项、组别（结构同 FastAPI 2026 库最终结构：cqtxj2026 快照 + fastapi migrations 001–017，只改表名）。
-- 增量：competitions.national_entry_mode（来自 FastAPI schema_2027/007）。只建表；数据走 scripts/biz/import 与 scripts/biz/seed。
CREATE TABLE `cqt_competitions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `legacy_id` bigint DEFAULT NULL,
  `name` varchar(300) NOT NULL,
  `edition` varchar(50) DEFAULT NULL,
  `year` smallint DEFAULT NULL,
  `description` text,
  `national_entry_mode` enum('SHARED','SEPARATE') NOT NULL DEFAULT 'SHARED' COMMENT 'SHARED 省国赛共用作品；SEPARATE 省国赛分别报名',
  `registration_start` datetime DEFAULT NULL,
  `registration_end` datetime DEFAULT NULL,
  `province_review_start` datetime DEFAULT NULL,
  `province_review_end` datetime DEFAULT NULL,
  `national_review_start` datetime DEFAULT NULL,
  `national_review_end` datetime DEFAULT NULL,
  `result_publish_time` datetime DEFAULT NULL,
  `province_certificate_template` varchar(1000) DEFAULT NULL,
  `national_certificate_template` varchar(1000) DEFAULT NULL,
  `teacher_org_certificate_template` varchar(1000) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_competition_year_edition` (`year`,`edition`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cqt_competition_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `legacy_id` bigint NOT NULL,
  `parent_legacy_id` bigint NOT NULL DEFAULT '0',
  `name` varchar(200) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `attachment_required` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_legacy` (`legacy_id`),
  KEY `idx_category_parent` (`parent_legacy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cqt_competition_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `competition_id` bigint unsigned NOT NULL,
  `first_category_legacy_id` bigint NOT NULL DEFAULT '0',
  `second_category_legacy_id` bigint NOT NULL DEFAULT '0',
  `name` varchar(200) NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_competition_group` (`competition_id`,`first_category_legacy_id`,`second_category_legacy_id`,`name`),
  KEY `idx_competition_group_lookup` (`competition_id`,`status`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 常青藤作品、人员、参赛人、参赛唯一键、评审对象、应用序列（结构同 FastAPI 2026 库最终结构，只改表名）。
-- 增量（只加不改，来自 FastAPI schema_2027/003、004、007）：entries.{stage_scope, province_entry_id, attachment_type, declared_group_size}、
-- people.credential_type、participation_keys.{stage_scope, credential_type}（唯一键随之加入证件类型与阶段）；两表 normalized_id_card 放宽到 varchar(200)（同 2027）。
-- 只建表；历史数据走 scripts/biz/import。
CREATE TABLE `cqt_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_no` varchar(64) NOT NULL,
  `import_fingerprint` char(64) DEFAULT NULL,
  `source_channel_id` smallint unsigned NOT NULL,
  `source_database` enum('zhongxi','qudao','houtai') NOT NULL,
  `source_table` varchar(40) NOT NULL,
  `source_id` bigint NOT NULL,
  `competition_id` bigint unsigned NOT NULL DEFAULT '1',
  `stage_scope` enum('BOTH','PROVINCIAL','NATIONAL') NOT NULL DEFAULT 'BOTH' COMMENT '作品适用阶段',
  `province_entry_id` bigint unsigned DEFAULT NULL COMMENT '国赛作品对应的省赛作品',
  `legacy_competition_id` bigint DEFAULT NULL,
  `first_category_legacy_id` bigint DEFAULT NULL,
  `second_category_legacy_id` bigint DEFAULT NULL,
  `region_legacy_id` bigint DEFAULT NULL,
  `legacy_school_id` bigint DEFAULT NULL,
  `title` text,
  `description` mediumtext,
  `attachment_url` mediumtext,
  `attachment_name` varchar(500) DEFAULT NULL,
  `attachment_type` enum('ZIP','LINK') DEFAULT NULL COMMENT '附件类型',
  `teacher_names` varchar(1000) DEFAULT NULL,
  `major_name` varchar(500) DEFAULT NULL,
  `group_name` varchar(500) DEFAULT NULL,
  `entry_type` enum('INDIVIDUAL','TEAM') NOT NULL DEFAULT 'INDIVIDUAL',
  `declared_group_size` int DEFAULT NULL COMMENT '报名人数',
  `scoring_scope` enum('ENTRY','PARTICIPANT') NOT NULL,
  `status` enum('ACTIVE','REJECTED','WITHDRAWN','DELETED','HISTORICAL') NOT NULL DEFAULT 'ACTIVE',
  `legacy_status` int DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_entry_no` (`entry_no`),
  UNIQUE KEY `uk_entry_source` (`source_database`,`source_table`,`source_id`),
  UNIQUE KEY `uk_entry_import_fingerprint` (`import_fingerprint`),
  KEY `idx_entry_scope` (`competition_id`,`source_channel_id`,`status`),
  KEY `idx_entry_stage_scope` (`competition_id`,`stage_scope`,`status`),
  KEY `idx_entry_category_region` (`first_category_legacy_id`,`second_category_legacy_id`,`region_legacy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cqt_people` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `source_database` enum('zhongxi','qudao','houtai') NOT NULL,
  `source_table` varchar(40) NOT NULL,
  `source_id` bigint NOT NULL,
  `legacy_user_id` bigint DEFAULT NULL,
  `name_value` varchar(300) DEFAULT NULL,
  `id_card_value` varchar(500) DEFAULT NULL,
  `normalized_id_card` varchar(200) DEFAULT NULL COMMENT '规范化证件号（同 2027：其他证件最长 200）',
  `credential_type` enum('ID_CARD','OTHER') NOT NULL DEFAULT 'ID_CARD' COMMENT '证件类型',
  `phone_value` varchar(500) DEFAULT NULL,
  `school_value` varchar(500) DEFAULT NULL,
  `identity_status` enum('COMPLETE','PARTIAL','MISSING') NOT NULL DEFAULT 'PARTIAL',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_people_source` (`source_database`,`source_table`,`source_id`),
  KEY `idx_people_legacy_user` (`source_database`,`legacy_user_id`),
  KEY `idx_people_source_id_card` (`source_database`,`normalized_id_card`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cqt_entry_participants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_id` bigint unsigned NOT NULL,
  `person_id` bigint unsigned NOT NULL,
  `source_database` enum('zhongxi','qudao','houtai') NOT NULL,
  `source_table` varchar(40) NOT NULL,
  `source_id` bigint NOT NULL,
  `is_leader` tinyint(1) NOT NULL DEFAULT '0',
  `school_snapshot` varchar(500) DEFAULT NULL,
  `teacher_snapshot` varchar(1000) DEFAULT NULL,
  `group_snapshot` varchar(500) DEFAULT NULL,
  `major_snapshot` varchar(500) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `status` enum('ACTIVE','WITHDRAWN','DISQUALIFIED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_participant_source` (`source_database`,`source_table`,`source_id`),
  KEY `idx_participant_entry` (`entry_id`),
  KEY `idx_participant_person` (`person_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cqt_competition_participation_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `competition_id` bigint unsigned NOT NULL,
  `stage_scope` enum('BOTH','PROVINCIAL','NATIONAL') NOT NULL DEFAULT 'BOTH' COMMENT '重复报名校验阶段',
  `category_legacy_id` bigint NOT NULL,
  `credential_type` enum('ID_CARD','OTHER') NOT NULL DEFAULT 'ID_CARD',
  `normalized_id_card` varchar(200) NOT NULL,
  `entry_id` bigint unsigned NOT NULL,
  `entry_participant_id` bigint unsigned NOT NULL,
  `source_database` enum('zhongxi','qudao','houtai') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_person_competition_category_stage` (`competition_id`,`category_legacy_id`,`credential_type`,`normalized_id_card`,`stage_scope`),
  KEY `idx_participation_entry` (`entry_id`),
  KEY `idx_participation_participant` (`entry_participant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cqt_evaluation_targets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_id` bigint unsigned NOT NULL,
  `entry_participant_id` bigint unsigned DEFAULT NULL,
  `target_type` enum('ENTRY','PARTICIPANT') NOT NULL,
  `status` enum('ACTIVE','DELETED','HISTORICAL') NOT NULL DEFAULT 'ACTIVE',
  `entry_target_guard` bigint unsigned GENERATED ALWAYS AS ((case when (`target_type` = _utf8mb4'ENTRY') then `entry_id` else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_target_person` (`entry_id`,`target_type`,`entry_participant_id`),
  UNIQUE KEY `uk_target_entry` (`entry_target_guard`),
  KEY `idx_target_participant` (`entry_participant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cqt_app_sequences` (
  `sequence_name` varchar(80) NOT NULL,
  `current_value` bigint unsigned NOT NULL,
  PRIMARY KEY (`sequence_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='应用序列（报名号等）';

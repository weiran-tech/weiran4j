-- 前台账号导入：cqtxj2026.portal_accounts → 当前库 cqt_portal_accounts（列一一对应，只改表名）。
--
-- 前提：源库 cqtxj2026 与目标库在同一 MySQL 实例；目标库已由 Flyway 建表；先执行 cqt_regions.sql。
-- 执行：mysql -h <host> -u <user> -p <目标库> < scripts/biz/import/cqt_portal_accounts.sql
--
-- 两处加工（其余原样）：
--   1. id_card_value 去掉半角 / 全角空格、制表符并转大写：与新注册时的规范化一致，证件查重才可靠；
--   2. credential_type 按格式推断：17 位数字 + 数字或 X 为 ID_CARD，否则 OTHER（源库没有这一列）。
-- token_version 新插入为 0；重复执行时**不覆盖**已有值，避免把已重置过密码的账号版本回退、让旧令牌复活。
INSERT INTO cqt_portal_accounts
  (`id`, `source_database`, `legacy_user_id`, `name_value`, `password_hash`, `remember_token`, `user_type`,
   `legacy_uniid`, `phone_value`, `legacy_school_id`, `id_card_value`, `credential_type`, `city_legacy_id`, `sex`,
   `school_value`, `contact_value`, `address_value`, `email`, `audit_status`, `license_file`, `commitment_file`,
   `rejection_reason`, `token_version`, `created_at`, `updated_at`)
SELECT
  src.`id`, src.`source_database`, src.`legacy_user_id`, src.`name_value`, src.`password_hash`, src.`remember_token`,
  src.`user_type`, src.`legacy_uniid`, src.`phone_value`, src.`legacy_school_id`, src.`normalized_id_card`,
  CASE WHEN src.`normalized_id_card` REGEXP '^[0-9]{17}[0-9X]$' THEN 'ID_CARD' ELSE 'OTHER' END,
  src.`city_legacy_id`, src.`sex`, src.`school_value`, src.`contact_value`, src.`address_value`, src.`email`,
  src.`audit_status`, src.`license_file`, src.`commitment_file`, src.`rejection_reason`, 0,
  src.`created_at`, src.`updated_at`
FROM (
  SELECT p.*,
         UPPER(REPLACE(REPLACE(REPLACE(p.`id_card_value`, ' ', ''), '　', ''), CHAR(9), '')) AS `normalized_id_card`
  FROM cqtxj2026.portal_accounts p
) src
ON DUPLICATE KEY UPDATE
  `source_database` = VALUES(`source_database`),
  `legacy_user_id` = VALUES(`legacy_user_id`),
  `name_value` = VALUES(`name_value`),
  `password_hash` = VALUES(`password_hash`),
  `remember_token` = VALUES(`remember_token`),
  `user_type` = VALUES(`user_type`),
  `legacy_uniid` = VALUES(`legacy_uniid`),
  `phone_value` = VALUES(`phone_value`),
  `legacy_school_id` = VALUES(`legacy_school_id`),
  `id_card_value` = VALUES(`id_card_value`),
  `credential_type` = VALUES(`credential_type`),
  `city_legacy_id` = VALUES(`city_legacy_id`),
  `sex` = VALUES(`sex`),
  `school_value` = VALUES(`school_value`),
  `contact_value` = VALUES(`contact_value`),
  `address_value` = VALUES(`address_value`),
  `email` = VALUES(`email`),
  `audit_status` = VALUES(`audit_status`),
  `license_file` = VALUES(`license_file`),
  `commitment_file` = VALUES(`commitment_file`),
  `rejection_reason` = VALUES(`rejection_reason`),
  `created_at` = VALUES(`created_at`),
  `updated_at` = VALUES(`updated_at`);

-- 站点配置导入：cqtxj2026.sc_setting → 当前库 cqt_setting（列一一对应，只改表名）。
--
-- 前提：源库 cqtxj2026 与目标库在同一 MySQL 实例；目标库已由应用启动时的 Flyway 建好 cqt_setting。
-- 执行：mysql -h <host> -u <user> -p <目标库> < scripts/biz/import/cqt_setting.sql
-- 可重复执行：按主键 id 覆盖更新，不产生重复行；源库删掉的行不会在目标库被删除。
INSERT INTO cqt_setting (`id`, `ident`, `name`, `contents`, `created_at`, `updated_at`, `deleted_at`, `key`)
SELECT `id`, `ident`, `name`, `contents`, `created_at`, `updated_at`, `deleted_at`, `key`
FROM cqtxj2026.sc_setting
ON DUPLICATE KEY UPDATE
  `ident` = VALUES(`ident`),
  `name` = VALUES(`name`),
  `contents` = VALUES(`contents`),
  `created_at` = VALUES(`created_at`),
  `updated_at` = VALUES(`updated_at`),
  `deleted_at` = VALUES(`deleted_at`),
  `key` = VALUES(`key`);

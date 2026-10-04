-- 赛区导入：cqtxj2026.regions → 当前库 cqt_regions（列一一对应，只改表名）。须先于 cqt_portal_accounts.sql 执行。
--
-- 前提：源库 cqtxj2026 与目标库在同一 MySQL 实例；目标库已由应用启动时的 Flyway 建好 cqt_regions。
-- 执行：mysql -h <host> -u <user> -p <目标库> < scripts/biz/import/cqt_regions.sql
-- 可重复执行：按主键 id 覆盖更新。
INSERT INTO cqt_regions (`id`, `legacy_id`, `parent_legacy_id`, `name`, `code`)
SELECT `id`, `legacy_id`, `parent_legacy_id`, `name`, `code`
FROM cqtxj2026.regions
ON DUPLICATE KEY UPDATE
  `legacy_id` = VALUES(`legacy_id`),
  `parent_legacy_id` = VALUES(`parent_legacy_id`),
  `name` = VALUES(`name`),
  `code` = VALUES(`code`);

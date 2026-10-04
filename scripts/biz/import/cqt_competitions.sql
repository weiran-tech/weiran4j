-- 赛事与赛项导入：cqtxj2026.{competitions, competition_categories} → 当前库 cqt_*（列一一对应，只改表名）。
--
-- 前提：源库 cqtxj2026（已执行过 FastAPI migrations 001–017）与目标库在同一 MySQL 实例；目标库已由 Flyway 建表。
-- 执行：mysql -h <host> -u <user> -p <目标库> < scripts/biz/import/cqt_competitions.sql
-- 可重复执行：按主键覆盖更新。历史赛事 national_entry_mode 记为 SHARED（2026 届不区分省国赛报名）。
INSERT INTO cqt_competitions
  (id, legacy_id, name, edition, year, description, national_entry_mode, registration_start, registration_end,
   province_review_start, province_review_end, national_review_start, national_review_end, result_publish_time,
   province_certificate_template, national_certificate_template, teacher_org_certificate_template, status,
   created_at, updated_at)
SELECT id, legacy_id, name, edition, year, description, 'SHARED', registration_start, registration_end,
       province_review_start, province_review_end, national_review_start, national_review_end, result_publish_time,
       province_certificate_template, national_certificate_template, teacher_org_certificate_template, status,
       created_at, updated_at
FROM cqtxj2026.competitions
ON DUPLICATE KEY UPDATE
  legacy_id = VALUES(legacy_id), name = VALUES(name), edition = VALUES(edition), year = VALUES(year),
  description = VALUES(description), registration_start = VALUES(registration_start),
  registration_end = VALUES(registration_end), province_review_start = VALUES(province_review_start),
  province_review_end = VALUES(province_review_end), national_review_start = VALUES(national_review_start),
  national_review_end = VALUES(national_review_end), result_publish_time = VALUES(result_publish_time),
  province_certificate_template = VALUES(province_certificate_template),
  national_certificate_template = VALUES(national_certificate_template),
  teacher_org_certificate_template = VALUES(teacher_org_certificate_template), status = VALUES(status),
  created_at = VALUES(created_at), updated_at = VALUES(updated_at);

INSERT INTO cqt_competition_categories (id, legacy_id, parent_legacy_id, name, sort_order, status, attachment_required)
SELECT id, legacy_id, parent_legacy_id, name, sort_order, status, attachment_required
FROM cqtxj2026.competition_categories
ON DUPLICATE KEY UPDATE
  legacy_id = VALUES(legacy_id), parent_legacy_id = VALUES(parent_legacy_id), name = VALUES(name),
  sort_order = VALUES(sort_order), status = VALUES(status), attachment_required = VALUES(attachment_required);

INSERT INTO cqt_competition_groups
  (id, competition_id, first_category_legacy_id, second_category_legacy_id, name, status, created_at, updated_at)
SELECT id, competition_id, first_category_legacy_id, second_category_legacy_id, name, status, created_at, updated_at
FROM cqtxj2026.competition_groups
ON DUPLICATE KEY UPDATE
  competition_id = VALUES(competition_id), first_category_legacy_id = VALUES(first_category_legacy_id),
  second_category_legacy_id = VALUES(second_category_legacy_id), name = VALUES(name), status = VALUES(status),
  updated_at = VALUES(updated_at);

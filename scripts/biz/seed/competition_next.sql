-- 新一届赛事与标准组别种子（参考 FastAPI schema_2027/002、010）。改下面的变量后执行；可重复执行（同年份同届次只建一次）。
--
-- 执行：mysql -h <host> -u <user> -p <目标库> < scripts/biz/seed/competition_next.sql
-- 新赛事默认停用草稿（status=0）：确认报名时间与省国赛模式后，再执行 UPDATE cqt_competitions SET status = 1 WHERE year = @year AND edition = @edition;
SET @year = 2027;
SET @edition = '2027届';
SET @legacy_id = 2027;
SET @name = '2027常青藤全国青少年校园戏剧创意大赛';
SET @description = '第二届赛事。报名时间、评审时间和证书模板确认后启用。';
-- SHARED：省赛、国赛共用同一作品；SEPARATE：前台报名记为省赛，国赛作品另行导入。
SET @national_entry_mode = 'SHARED';
SET @registration_start = NULL;
SET @registration_end = NULL;

INSERT INTO cqt_competitions
  (legacy_id, name, edition, year, description, national_entry_mode, registration_start, registration_end, status,
   created_at, updated_at)
SELECT @legacy_id, @name, @edition, @year, @description, @national_entry_mode, @registration_start, @registration_end,
       0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM cqt_competitions WHERE year = @year AND edition = @edition);

-- 每一届默认 5 个通用组别（赛项编号 0 表示所有赛项通用）；赛项专属组别另行插入。
INSERT INTO cqt_competition_groups (competition_id, first_category_legacy_id, second_category_legacy_id, name, status)
SELECT c.id, 0, 0, defaults.name, 1
FROM cqt_competitions c
CROSS JOIN (
  SELECT '小学低年级组' AS name
  UNION ALL SELECT '小学中年级组'
  UNION ALL SELECT '小学高年级组'
  UNION ALL SELECT '初中组'
  UNION ALL SELECT '高中组（含中职）'
) defaults
LEFT JOIN cqt_competition_groups existing
  ON existing.competition_id = c.id AND existing.first_category_legacy_id = 0
 AND existing.second_category_legacy_id = 0 AND existing.name = defaults.name
WHERE c.year = @year AND c.edition = @edition AND existing.id IS NULL;

-- 作品、人员、参赛人、评审对象导入与参赛唯一键回填：cqtxj2026 → 当前库 cqt_*。
--
-- 前提：先执行 cqt_competitions.sql；源库 cqtxj2026 已执行过 FastAPI migrations 001–017；两库同实例。
-- 执行：mysql -h <host> -u <user> -p <目标库> < scripts/biz/import/cqt_entries.sql
-- 可重复执行：前四段按主键覆盖更新；唯一键回填用 INSERT IGNORE；序列只会调大不会调小。
--
-- 加工（其余原样）：
--   people.normalized_id_card：源库多为空，按 FastAPI 016 口径回退为 id_card_value 去空格转大写；
--   people.credential_type：规范化证件号为空（源库约 2/3 人员无证件号）或形如 17 位数字 + 数字或 X 为 ID_CARD，否则 OTHER；
--   entries.stage_scope：历史作品一律 BOTH；entries.attachment_type：附件地址以 .zip 结尾为 ZIP，其它非空为 LINK；
--   participation_keys：按「一级赛项」回填（与新报名的重复判定口径一致；FastAPI 016 用的是「有二级取二级」，不一致）。

INSERT INTO cqt_people
  (id, source_database, source_table, source_id, legacy_user_id, name_value, id_card_value, normalized_id_card,
   credential_type, phone_value, school_value, identity_status, created_at, updated_at)
SELECT src.id, src.source_database, src.source_table, src.source_id, src.legacy_user_id, src.name_value,
       src.id_card_value, NULLIF(src.normalized, ''),
       CASE WHEN src.normalized IS NULL OR src.normalized = '' OR src.normalized REGEXP '^[0-9]{17}[0-9X]$'
            THEN 'ID_CARD' ELSE 'OTHER' END,
       src.phone_value, src.school_value, src.identity_status, src.created_at, src.updated_at
FROM (
  SELECT p.*, COALESCE(NULLIF(p.normalized_id_card, ''), UPPER(REPLACE(TRIM(p.id_card_value), ' ', ''))) AS normalized
  FROM cqtxj2026.people p
) src
ON DUPLICATE KEY UPDATE
  legacy_user_id = VALUES(legacy_user_id), name_value = VALUES(name_value), id_card_value = VALUES(id_card_value),
  normalized_id_card = VALUES(normalized_id_card), credential_type = VALUES(credential_type),
  phone_value = VALUES(phone_value), school_value = VALUES(school_value), identity_status = VALUES(identity_status),
  updated_at = VALUES(updated_at);

INSERT INTO cqt_entries
  (id, entry_no, import_fingerprint, source_channel_id, source_database, source_table, source_id, competition_id,
   stage_scope, legacy_competition_id, first_category_legacy_id, second_category_legacy_id, region_legacy_id,
   legacy_school_id, title, description, attachment_url, attachment_name, attachment_type, teacher_names, major_name,
   group_name, entry_type, scoring_scope, status, legacy_status, submitted_at, created_at, updated_at)
SELECT id, entry_no, import_fingerprint, source_channel_id, source_database, source_table, source_id, competition_id,
       'BOTH', legacy_competition_id, first_category_legacy_id, second_category_legacy_id, region_legacy_id,
       legacy_school_id, title, description, attachment_url, attachment_name,
       CASE WHEN attachment_url IS NULL OR TRIM(attachment_url) = '' THEN NULL
            WHEN LOWER(attachment_url) LIKE '%.zip' THEN 'ZIP' ELSE 'LINK' END,
       teacher_names, major_name, group_name, entry_type, scoring_scope, status, legacy_status, submitted_at,
       created_at, updated_at
FROM cqtxj2026.entries
ON DUPLICATE KEY UPDATE
  entry_no = VALUES(entry_no), title = VALUES(title), description = VALUES(description),
  attachment_url = VALUES(attachment_url), attachment_name = VALUES(attachment_name),
  attachment_type = VALUES(attachment_type), teacher_names = VALUES(teacher_names), major_name = VALUES(major_name),
  group_name = VALUES(group_name), status = VALUES(status), legacy_status = VALUES(legacy_status),
  updated_at = VALUES(updated_at);

INSERT INTO cqt_entry_participants
  (id, entry_id, person_id, source_database, source_table, source_id, is_leader, school_snapshot, teacher_snapshot,
   group_snapshot, major_snapshot, sort_order, status, created_at, updated_at)
SELECT id, entry_id, person_id, source_database, source_table, source_id, is_leader, school_snapshot, teacher_snapshot,
       group_snapshot, major_snapshot, sort_order, status, created_at, updated_at
FROM cqtxj2026.entry_participants
ON DUPLICATE KEY UPDATE
  is_leader = VALUES(is_leader), school_snapshot = VALUES(school_snapshot), teacher_snapshot = VALUES(teacher_snapshot),
  group_snapshot = VALUES(group_snapshot), major_snapshot = VALUES(major_snapshot), sort_order = VALUES(sort_order),
  status = VALUES(status), updated_at = VALUES(updated_at);

-- entry_target_guard 是生成列，不插入。
INSERT INTO cqt_evaluation_targets (id, entry_id, entry_participant_id, target_type, status)
SELECT id, entry_id, entry_participant_id, target_type, status
FROM cqtxj2026.evaluation_targets
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT IGNORE INTO cqt_competition_participation_keys
  (competition_id, stage_scope, category_legacy_id, credential_type, normalized_id_card, entry_id,
   entry_participant_id, source_database)
SELECT e.competition_id, 'BOTH', e.first_category_legacy_id, p.credential_type, p.normalized_id_card,
       e.id, ep.id, e.source_database
FROM cqt_entries e
JOIN cqt_entry_participants ep ON ep.entry_id = e.id AND ep.status = 'ACTIVE'
JOIN cqt_people p ON p.id = ep.person_id
WHERE e.status <> 'DELETED'
  AND e.first_category_legacy_id IS NOT NULL
  AND p.normalized_id_card IS NOT NULL AND p.normalized_id_card <> '';

-- 报名号与人员来源编号序列：只调大不调小（历史上 FastAPI 前台报名的最大序号）。
INSERT INTO cqt_app_sequences (sequence_name, current_value)
SELECT 'fastapi_signup_entry', COALESCE(MAX(source_id), 0) FROM cqt_entries WHERE source_table = 'fastapi_signup'
ON DUPLICATE KEY UPDATE current_value = GREATEST(current_value, VALUES(current_value));
INSERT INTO cqt_app_sequences (sequence_name, current_value)
SELECT 'fastapi_signup_person', COALESCE(MAX(source_id), 0) FROM cqt_people WHERE source_table = 'fastapi_signup'
ON DUPLICATE KEY UPDATE current_value = GREATEST(current_value, VALUES(current_value));

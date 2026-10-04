# E01–E16: 实现记录（单执行者串行）

## 完成的 tasks.md 条目

- `2.1`–`2.4`、`3.1`–`3.7`、`4.1`–`4.3`、`5.1`–`5.4`、`6.2`
- 未执行（已在 plan 声明）：`6.1` 发布动作、`7.1` 上线后

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-cqt-infrastructure/.../db/migration/cqt/V202610051000__cqt_competitions.sql`、`V202610051001__cqt_entries.sql` | 新增 | E03：由一次性 MySQL 实测的 FastAPI 2026 最终 DDL 生成（改表名、去 AUTO_INCREMENT 起始值），只加 2027 增量列；`normalized_id_card` 放宽到 varchar(200)（同 2027） |
| `weiran-cqt-domain/.../competition/**`（`Competition`、`Category`、`Group`、`EntryStage`、`CompetitionRepository`） | 新增 | E01/E04 |
| `weiran-cqt-domain/.../entry/**`（`Attachment`、`TeamMembers`、`SignupRules`、`EntryText`、`Participant`、`NewEntry`、行记录、`EntryRepository`、`SequenceGenerator`、`DuplicateParticipationException`） | 新增 | E01/E05 |
| `weiran-cqt-domain/.../file/FileStorage` 加 `isStoredUrl`；OSS / 本地实现与测试 | 改造 | E01/E07 |
| `weiran-cqt-api/.../{competition,entry}/**` | 新增 | E02 |
| `weiran-cqt-infrastructure/.../persistence/{entity,row,mapper}/**`、`MybatisCompetitionRepository`、`MybatisEntryRepository`、`MybatisSequenceGenerator`；自动配置 | 新增 / 改造 | E06 |
| `weiran-cqt-application/.../{competition,entry}/**`；自动配置 | 新增 / 改造 | E09–E11 |
| `weiran-cqt-adapter/.../portal/{CompetitionController,CompetCategoryController,AuthController,PortalParams}.java`；自动配置 | 新增 / 改造 | E12–E14 |
| `scripts/biz/import/{cqt_competitions,cqt_entries}.sql`、`scripts/biz/seed/competition_next.sql` | 新增 | E08 |
| 测试：`CompetitionTest`(4)、`SignupRulesTest`(4)、`OssFileStorageTest`/`LocalFileStorageTest` +1 各、`CqtSignupIT`(5)；`FileUploadApplicationServiceTest` 假存储补 `isStoredUrl` | 新增 / 改造 | E04/E05/E07/E15 |
| `AGENTS.biz.md`、`state/bizs/{cqt_competitions,cqt_entries,README.biz}.md` | 新增 / 改造 | E16 |

## 为什么这么做

- **人员来源库随报名账号**（契约变更，已记 plan）：FastAPI 新报名的 `people.source_database` 固定写 `zhongxi`，而「我的报名」用账号自己的来源库关联 → 渠道（qudao）账号报名后看不到自己的作品。作品的来源仍为 `zhongxi / fastapi_signup`。
- **校验顺序同 FastAPI**（成员 → 赛项 → 附件 → 组别 → 冲突），提示语逐字沿用。
- **跨阶段冲突查询 + 同阶段唯一键兜底**：写唯一键撞键（`DuplicateKeyException` → `DuplicateParticipationException`）时抛 409，`@Transactional` 整笔回滚。
- **序列**：`INSERT … ON DUPLICATE KEY UPDATE current_value = LAST_INSERT_ID(current_value + 1)` + 同连接 `SELECT LAST_INSERT_ID()`，`MybatisSequenceGenerator#next` 标 `@Transactional` 保证两条语句同连接（报名本身在事务内，加入之）。
- **报名请求体用 `Map` 接收**：`team_members` 可能是数组或 JSON 字符串、数字字段可能是数字 / 字符串 / 空串，用 `PortalParams.longValue / longOrNull` 宽松解析。
- **导入脚本的两处修正**（容器实测发现）：① 源库 `people.normalized_id_card` 全为空，按 FastAPI 016 口径回退 `UPPER(REPLACE(TRIM(id_card_value),' ',''))`，否则参赛唯一键回填 0 条；② 无证件号的人员（约 2/3）证件类型默认 `ID_CARD`，否则全被判为「其他」。
- 放弃：写 `legacy_id_map`（本仓库无此表、无读取方）；赛项按届区分（本次不决定）。

## 依赖的契约

- `exec/plan.md` 第 4 节；变更 1 处（`insertParticipant` 加 `accountSourceDatabase`），已记录。

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| `weiran-cqt-application/src/test/.../FileUploadApplicationServiceTest.java` | `FileStorage` 端口加方法，假实现须补 | 必要连带 | 否 |

## 埋的坑 / 遗留

- [ ] 赛项全局共用 → `cqt_competitions.md#01`；无后台赛事管理 → `#02`
- [ ] 报名不可修改 / 撤回 → `cqt_entries.md#01`；奖项为空 → `#02`；国赛提交入口 → `#03`；历史重复参赛 → `#04`

## 自测结果

- 命令：各 `weiran-cqt-*` 模块 `check`；`./gradlew :weiran-app:test --tests com.weiran.app.CqtSignupIT`；导入脚本容器验证
- 结果：模块检查全过；`CqtSignupIT` 5/5
- 导入（E08）：一次性 MySQL 8.4，`cqtxj2026` = 快照表结构 + 6 张表数据 + FastAPI migrations 001–017；目标库执行本 change 两个 Flyway 脚本后，导入 + 种子连续两遍：
  赛事 1→1（+新届 1）、赛项 16/16、人员 396337/396337、作品 354865/354865、参赛人 396337/396337、评审对象 388518/388518、参赛唯一键 62558（两遍一致）、
  新届组别 5（2026 届原有 157）；人员证件类型 ID_CARD 395385 / OTHER 952；附件类型 LINK 352242 / ZIP 2 / NULL 2621。

---
title: "cqt-signup 集成与规格一致性"
status: "done"
updated_at: "2026-10-05"
---

# Verify

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成
**执行单元数**:16 个（E01–E16，单执行者串行）

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全（合并为 `notes/E-all-实现记录.md`）
- [x] Layer 0 已完成；契约变更 1 处已记入 plan 第 4 节
- [x] 自测通过

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| 「是否纯数字」宽松解析 | `PortalParams.longOrNull`（adapter）、`SignupApplicationService.numeric`（application，账号学校编号） | 两处保留 | — | ☐ 分属两层，前者解析请求、后者解析账号字段；各 3 行，知情接受 |
| 文本规范化 | `EntryText.normalize`（entry）与 `Credentials.normalize`（account） | 两处保留 | — | ☐ 语义不同：前者合并空白、后者去掉全部空白并转大写 |

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 按届分库 / 2027 规范化结构 | interview | 用户决定 |
| 人员来源库固定 `zhongxi`（FastAPI 原样） | notes | 渠道账号会看不到自己的报名 |
| 写 `legacy_id_map` | explore | 本仓库无此表、无读取方 |
| 参赛唯一键按「有二级取二级」回填（FastAPI 016） | explore | 与新报名「一级赛项」判重口径不一致 |
| 只靠应用层查询判重 | design | 并发下会重复；同阶段由唯一键兜底 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `FileUploadApplicationServiceTest.java`（假存储补 `isStoredUrl`） | `E07` | 必要连带 | 保留 |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿 | `evidence/build.log` |
| test | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿 | `evidence/test.log` |
| lint | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿 | `evidence/lint.log` |

代码全部改完后运行，退出码均 0；`test` 步骤实际执行 `:weiran-app:test`：集成测试 57 个（含 `CqtSignupIT` 5）0 失败 0 跳过；覆盖率聚合与 `verifyFrameworkVersions` 通过；前端 225 个通过。
导入脚本在 L7 之后有修正（`scripts/` 不在 `sourcePaths`，不影响证据新鲜度），修正后已在容器中重跑验证（见 notes）。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 2.1 | `E04` | `domain/competition/{Competition,EntryStage}.java` | ☑ |
| 2.2 | `E05` | `domain/entry/{Attachment,TeamMembers,SignupRules}.java` | ☑ |
| 2.3 | `E01` | `domain/{competition/CompetitionRepository,entry/EntryRepository,entry/SequenceGenerator,file/FileStorage}` | ☑ |
| 2.4 | `E02` | `api/{competition,entry}/**` | ☑ |
| 3.1 | `E03` | 两个 Flyway 脚本（MySQL 8.4 实测执行） | ☑ |
| 3.2 | `E06` | `infrastructure/persistence/**` | ☑ |
| 3.3 | `E07` | `OssFileStorage#isStoredUrl`、`LocalFileStorage#isStoredUrl` | ☑ |
| 3.4 | `E09` | `CompetitionQueryApplicationService` | ☑ |
| 3.5 | `E10` | `SignupApplicationService` | ☑ |
| 3.6 | `E11` | `MyEntriesApplicationService` | ☑ |
| 3.7 | `E08` | `scripts/biz/import/{cqt_competitions,cqt_entries}.sql`、`scripts/biz/seed/competition_next.sql` | ☑ |
| 4.1 | `E12` | `CompetCategoryController`、`AuthController#getSecondCat` | ☑ |
| 4.2 | `E13` | `CompetitionController` | ☑ |
| 4.3 | `E14` | 三个自动配置 | ☑ |
| 5.1 | `E04`/`E05` | `CompetitionTest`(4)、`SignupRulesTest`(4) | ☑ |
| 5.2 | `E07` | `OssFileStorageTest.recognizesOwnUrls`、`LocalFileStorageTest.recognizesOwnUrls` | ☑ |
| 5.3 | `E15` | `CqtSignupIT`(5) | ☑ |
| 5.4 | `E08` | 容器两遍执行（notes） | ☑ |
| 6.2 | `E16` | `AGENTS.biz.md`、`state/bizs/*` | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 6.1 执行导入 / 种子、启用新赛事 | 发布动作 | ☑ |
| 7.1 验收记录 | 上线后 | ☑ |

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法对照 CP-1/2/3 | 规则在 domain、端口在 domain、DO 不出 infrastructure | 同 | ☑ |
| 宪法对照 CP-7 | 两个新 Flyway 脚本，数据走脚本 | 同 | ☑ |
| 宪法对照 CP-11 | `CommonErrors` + 具体提示，不新增码 | 同 | ☑ |
| Data Flow 报名 1–9 | 顺序、事务、唯一键兜底 | 同；人员来源库随账号（不一致项 #1） | ☑ |
| 序列 | `LAST_INSERT_ID` 同连接 | `MybatisSequenceGenerator` 事务内两条语句 | ☑ |
| API Design | 7 个接口、字段名、宽松解析 | 同 | ☑ |
| Database Design | 9 张表 + 增量列；导入顺序与加工；种子 | 同；另加导入两处修正（不一致项 #2） | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| cqt-competition FR-001 / 报名时间窗 | 三种提示与窗口内 | `CompetitionTest.registrationWindow` | ☑ |
| cqt-competition FR-002 / 赛事列表过滤 | 倒序、按状态过滤 | `CqtSignupIT.readsCompetitionConfig` | ☑ |
| cqt-competition FR-002 / 未启用赛事无可报赛项 | 空数组 | 同上 | ☑ |
| cqt-competition FR-002 / 二级赛项 | 只含启用、字段齐 | 同上 | ☑ |
| cqt-competition FR-003 / 通用组别与赛项专属组别 | 1 个 / 2 个 | 同上 | ☑ |
| cqt-competition FR-004 / 种子脚本可重复执行 | 新届 1、组别 5 | 容器两遍执行 | ☑ |
| cqt-entry-signup FR-001 / 赛项校验 | 400 | `CqtSignupIT.rejects` | ☑ |
| cqt-entry-signup FR-002 / 附件不合规 | 两条提示 | `SignupRulesTest.attachments` + `CqtSignupIT.rejects`（外站 ZIP、必填） | ☑ |
| cqt-entry-signup FR-003 / 团体成员校验 | 三条提示 | `SignupRulesTest.teamMembers` + `CqtSignupIT.teamSignup` | ☑ |
| cqt-entry-signup FR-003 / 组别不在配置内 | 400 含组别名 | `CqtSignupIT.rejects` | ☑ |
| cqt-entry-signup FR-004 / 同赛项重复报名 | 409 含报名号 | `CqtSignupIT.personalSignup` | ☑ |
| cqt-entry-signup FR-004 / 省赛与国赛阶段 | NATIONAL 可报、BOTH 409 | `CqtSignupIT.separateStages` | ☑ |
| cqt-entry-signup FR-005 / 个人报名成功 | 报名号格式、5 类记录各 1 | `CqtSignupIT.personalSignup` | ☑ |
| cqt-entry-signup FR-005 / 团体报名成功 | TEAM/3、队长、唯一键 3 | `CqtSignupIT.teamSignup` | ☑ |
| cqt-entry-signup FR-006 / 列表与详情 | total、msg、step、team、他人 403 | `CqtSignupIT.personalSignup` | ☑ |
| cqt-file-storage FR-003（MODIFIED）原有三场景 | 不变 | `OssFileStorageTest`、`FileUploadApplicationServiceTest` 全绿 | ☑ |
| cqt-file-storage FR-003 / 判定地址是否由本系统存储产生 | 是 / 否 / 否 | `OssFileStorageTest.recognizesOwnUrls`、`LocalFileStorageTest.recognizesOwnUrls` | ☑ |

interview 验收标准：AC-1 ☑、AC-2 ☑、AC-3 ☑、AC-4 ☑、AC-5 ☑、AC-6 ☑、AC-7 ☑、AC-8 ☑、AC-9 ☑（容器导入；老账号列表由 `findByAccount` 口径保证，集成测试以新报名覆盖）、AC-10 ☑。

## 越界检查

工作区改动全部落在 plan 第 5 节「拥有」范围内：`weiran4j/weiran-cqt/**`、`scripts/biz/{import,seed}/**`、`weiran-app/src/test/java/com/weiran/app/CqtSignupIT.java`、
`AGENTS.biz.md`、`openspec/state/bizs/{cqt_competitions,cqt_entries,README.biz}.md`、本 change 目录；申报 1 处必要连带（见上）。`upstream-boundary.sh` 无拦截。

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| 无未申报差集 | — | — | — | — |

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | 人员 `source_database` 随报名账号（spec FR-005 未写来源库；FastAPI 固定 `zhongxi`） | **spec 表述模糊,实现合理** | 修正原系统缺陷；契约变更已记 plan；`cqt_entries.md` §5 写明 |
| 2 | 导入脚本两处加工（证件号回退、无证件默认 ID_CARD）design 未写 | **spec 表述模糊,实现合理** | 容器实测发现；脚本头注释写明；不改任何接口行为 |
| 3 | design 写「`team_members` 格式错误 400」由适配层判定；空数组按「至少两名成员」处理 | 实现细节 | 与 FastAPI 一致 |

## 遗留问题

- [x] 赛项全局共用 → 已登记 `cqt_competitions.md#01`；无后台赛事管理 → `cqt_competitions.md#02`
- [x] 报名不可修改 / 撤回 → `cqt_entries.md#01`；奖项为空 → `cqt_entries.md#02`；国赛提交入口 → `cqt_entries.md#03`；历史重复参赛 → `cqt_entries.md#04`

## 流程反馈

- 「以 2026 最终结构为准」时，直接在一次性 MySQL 里执行快照 + 全部迁移再导出 DDL，比读迁移文件推断更可靠；导入脚本也必须在同样形态的源库上实测（本次因此发现证件号为空的问题）。

## 结论

- [x] 集成完成(单执行单元时:越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff ｜ ☐ 打回 L5 ｜ ☐ 打回 L2

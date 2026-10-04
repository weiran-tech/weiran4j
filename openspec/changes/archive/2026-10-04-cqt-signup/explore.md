---
title: "cqt-signup 现实校验"
status: "done"
updated_at: "2026-10-05"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| 参考实现 | `fastapi_backend/app/routes/{competition,categories,auth,drama}.py`、`app/db_utils.py` | 接口口径、校验、写入顺序 |
| 表结构 | `cqtxj2026.sql` 快照 + `fastapi_backend/migrations` 001–017（一次性 MySQL 实测执行，导出最终 DDL）；`schema_2027/{002,003,004,007,010}` | 最终列、2027 增量列、种子 |
| `uniapp` | `pages/my/my.vue`（报名表单 1700–1830、列表 1916–1960、详情 2206/2481/2542） | 真实请求字段与读取字段 |
| `weiran-cqt-*` | 账号（`AccountRepository`、`Credentials`）、文件存储（`FileStorage`）、`/api-web` 底座 | 复用 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 赛事列表 | `categories.py:49` | `SELECT id,legacy_id,name,edition,year,description,status FROM competitions` + `status`/`name` 过滤，`ORDER BY year DESC,id DESC` |
| 一级赛项 | `auth.py:60 getsecondcat` | 赛事不存在或 `status<>1` → `[]`；`legacy_id id,parent_legacy_id pid,name,sort_order sort,status,attachment_required fujian` WHERE `parent_legacy_id=0 AND status=1`（2027 库加 `competition_id` 条件，本次不加） |
| 二级赛项 | `categories.py:18` | 同字段，`parent_legacy_id=:id AND status=1` |
| 组别 | `categories.py:31` | 缺 `competition_id` 或 `firstcatid` → `[]`；`(first=0 OR first=:firstcat) AND (second=0 OR second=:secondcat)`，`id,name,id sort` |
| 报名 | `competition.py:95-294` | 校验与写入顺序见 interview 「要做」；`entry_no = WEB-<赛事>-<序号:010d>`（序号来自 `app_sequences` 的 `fastapi_signup_entry`）；写 `entries`（`source_database='zhongxi'`、`source_table='fastapi_signup'`、`scoring_scope='ENTRY'`、`legacy_status=1`）、每位成员一条 `people` + `entry_participants`、一条 `evaluation_targets(ENTRY)`、`legacy_id_map`、每位成员一条 `competition_participation_keys`（唯一键冲突 → 409） |
| 重复判定 | `drama.py:375 existing_participation` | 按 `(赛事, 一级赛项, 证件类型, 证件号)` 且 `k.stage='BOTH' OR :stage='BOTH' OR k.stage=:stage` 查一条，提示来源与报名号 |
| 附件 | `competition.py:50 validate_direct_attachment` | `attachment_type` 别名（文件 / 压缩包 → ZIP，链接 → LINK）；ZIP 必须是本系统存储里的 `.zip`；链接须 http(s) 且不含汉字；赛项要求附件且无 url → 错误 |
| 列表 | `categories.py:59 user_entries` | 按账号 `(source_database, legacy_user_id)` 关联 `people` → `entry_participants` → `entries`（非 `DELETED`），返回 `productid,id(赛事),title,status,legacy_status,firstcatid,secondcatid,regionsid,purl,teachername,created_at,source_database,competition_name,competition_id,teantype,username,phone`；`productlists` 包成 `{data, total}` |
| 详情 | `competition.py:297` | 归属校验（同上关联）；`productinfo`（`e.*` + `zubie,major,purl,purlname,teachername,teantype,competition_name,region_name,firstcatid_name,secondcatid_name`）、`team`、`msg`/`step` 按 `legacy_status`；奖项来自 `awards`（本次无此表） |
| 最终表结构 | 实测 DDL | `entries` 无 `stage_scope`/`attachment_type`/`declared_group_size`；`people`、参赛唯一键无 `credential_type`；`competitions` 无 `national_entry_mode`；`evaluation_targets.entry_target_guard` 为 `STORED` 生成列 |
| 2026 数据 | 快照 | `competitions` 1 行（`status=2`，已结束）；参赛唯一键表为空（FastAPI 016 用 `COALESCE(二级, 一级)` 回填，与 2027 报名按一级赛项判定不一致）；中文同样是双重编码 |
| 2027 种子 | `schema_2027/002`、`010` | 新赛事 `status=0`（停用草稿）；5 个通用组别（小学低 / 中 / 高年级组、初中组、高中组（含中职）），赛项为 0 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `/api-web` 底座 | adapter | `@PortalController`、`@PortalPublic`、`PortalAccount` | 否 |
| 证件规则 | `domain/account/{Credentials,CredentialType}` | 团体成员证件校验与规范化 | 否 |
| 手机号规则 | `domain/account/Phones` | 成员手机号（FastAPI 规则 `1[3-9]\d{9}`，比 `Phones` 严） | 新增成员手机号校验 |
| 账号仓储 | `AccountRepository#findById` | 个人报名取账号资料 | 否 |
| 文件存储 | `FileStorage` | ZIP 附件须为本系统地址：需要「是否本系统地址」判定 | 是：端口加 `isStoredUrl` |
| 赛区 | `RegionRepository` | 详情的 `region_name` | 加按编号取名（已有 `findNameByLegacyId`） |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 唯一键只能兜住「同阶段」重复 | 参赛唯一键 `(赛事, 赛项, 证件类型, 证件号, 阶段)` | 前台报名的阶段由赛事模式唯一决定（同一赛事只会写 `BOTH` 或只会写 `PROVINCIAL`），并发下同阶段由唯一键兜底；跨阶段（`BOTH` vs `NATIONAL`）冲突由应用层查询判定，`NATIONAL` 只来自后续批量导入 |
| 报名号依赖序列 | FastAPI `next_sequence` | 新建 `cqt_app_sequences`，用 `INSERT … ON DUPLICATE KEY UPDATE current_value = LAST_INSERT_ID(current_value + 1)` 取号（同连接 `SELECT LAST_INSERT_ID()`），并发安全 |
| 2026 参赛唯一键为空且口径不同 | 快照 / 016 | 导入脚本按**一级赛项**回填（与新报名一致），`INSERT IGNORE`（历史可能重复） |
| 账号 ↔ 参赛人 | `user_entries` | 关联键 `(source_database, legacy_user_id)`；新报名写 `people.legacy_user_id = 账号.legacy_user_id`（只第一位成员）、`source_database='zhongxi'`（同 FastAPI） |
| `legacy_id_map` | FastAPI 写入 | 本仓库未建此表，也无读取方 → 不写 |
| 组别口径依赖配置数据 | `competition_groups` 2026 为空 | 新赛事靠种子脚本；2026 历史作品不需组别校验 |
| 文件存储地址 | `cqt-file-storage` | OSS 返回 `<publicBaseUrl>/<对象名>`，本地返回 `/uploads/<对象名>` → 端口加 `boolean isStoredUrl(String url)` |
| 详情奖项 | 无 `awards` 表 | 返回 null（评审与奖项切片补） |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran-cqt-domain/competition/`（赛事、赛项、组别、报名窗口、阶段规则、仓储端口）、`entry/`（报名表单、附件规则、团队成员规则、作品 / 参赛人 / 唯一键模型、仓储端口、序列端口） | 新增 |
| `weiran-cqt-domain/file/FileStorage` 加 `isStoredUrl` | 改造（两个实现同步） |
| `weiran-cqt-api`：赛事查询、报名、我的报名服务接口与视图 | 新增 |
| `weiran-cqt-application`：赛事查询、报名、我的报名 | 新增 |
| `weiran-cqt-infrastructure`：9 张表 Flyway；DO / Mapper / 仓储；序列 | 新增 |
| `weiran-cqt-adapter`：`CompetCategoryController`（加 3 接口）、`AuthController#getsecondcat`、新 `CompetitionController` | 新增 / 改造 |
| `scripts/biz/import/*`（赛事、赛项、作品、参赛人、人员、评审对象、唯一键回填）、`scripts/biz/seed/competition_2027.sql` | 新增 |
| `weiran-app/src/test`：`CqtSignupIT` | 新增 |
| `AGENTS.biz.md`、`state/bizs/cqt_entries.md` 等 | 新增 / 改造 |

**不会碰的目录**：任何上游已有文件、`web/`、`uniapp/`（前端不改）。

### 共享层命中 ⚠️

<!-- openspec:slot shared-layers -->

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 | 未命中 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 | 未命中：无新依赖 |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 | 未命中 |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 | 未命中 |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) | 未命中 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 | 未命中：用 `CommonErrors` + 具体提示；重复报名用 `CqtErrors`（409） |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 | 未命中：列表不分页（同 FastAPI） |

#### 序号型资源(本仓库暂无)

新增 Flyway `V202610051000__cqt_competitions.sql`（赛事 / 赛项 / 组别）、`V202610051001__cqt_entries.sql`（作品 / 人员 / 参赛人 / 唯一键 / 评审对象 / 序列），归 Layer 0。
`FileStorage` 端口变更与新领域端口被多个单元消费，进 Layer 0 冻结。

<!-- /openspec:slot shared-layers -->

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 「唯一键兜底并发重复」 | 唯一键只能兜同阶段 | 前台报名阶段由赛事模式唯一决定，同阶段并发由唯一键兜底；跨阶段由应用层判定（`NATIONAL` 只来自后续导入） | ☑（硬约束措辞在 design 落实，结论不变） |
| 2026 参赛唯一键回填 | FastAPI 016 按 `COALESCE(二级, 一级)`，与新报名「一级赛项」口径不一致 | 导入回填按一级赛项 | ☑（AC-9 不变） |
| 写 `legacy_id_map` | 本仓库无此表、无读取方 | 不写 | ☑ |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 历史数据导入量大 | `entries` / `people` / `entry_participants` 各数十万行 | 导入脚本 `INSERT … SELECT` 一次性执行；测试用容器验证行数 |
| 中文乱码 | 2026 数据同为双重编码 | 沿用 `cqt_setting.md#01`，不处理 |
| 赛项全局共用 | 新一届赛项若与 2026 不同 | 本次不决定；种子脚本只加组别、赛事；赛项变化另议 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子

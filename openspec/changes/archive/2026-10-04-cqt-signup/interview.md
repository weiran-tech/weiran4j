---
title: "cqt-signup：赛事配置读取与个人 / 团体报名"
status: "done"
updated_at: "2026-10-05"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。

## 一句话需求

> 用户原话,不要改写。

- 文件上传, 赛事与报名, 后台学校审核（本 change 为「赛事与报名」拆分后的第一部分：赛事配置读取与个人 / 团体报名）

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 届次数据怎么组织（FastAPI 按届分库：2026 只读历史库 + 2027 工作库，靠 `X-CQTXJ-Database` 切换） | 单库多届 | 一套表；「届」= 赛事（`competitions`）；2026 届数据导入后因报名窗口已过自然不可报名；账号跨届共用；服务端忽略 `X-CQTXJ-Database` |
| 2 | 「赛事与报名」怎么拆 | 拆成两个切片 | 本 change：赛事配置读取 + 个人 / 团体报名 + 我的报名列表 / 详情；学校批量导入（Excel + ZIP 异步、任务进度、`schoolproductlists`、`getexinfo`、`checksignup`）另开 change |
| 3 | 报名相关表结构以哪个为准 | 以 FastAPI 2026 库最终结构为准 | `cqtxj2026.sql` 快照 + `fastapi_backend/migrations` 001–017（已在一次性 MySQL 实测得到最终 DDL）；列保持原样、加 `cqt_` 前缀；沿用 `legacy_id` 关联 |
| 4 | 新一届赛事在哪配置 | 先用种子脚本，后台页面另开 | `scripts/biz/seed/` 提供新一届赛事与标准组别的 SQL（参考 FastAPI `schema_2027` 002/010），改配置即改脚本重跑；后台赛事管理放后台切片 |
| 5 | 是否支持省赛、国赛分开报名 | 本次支持 | 赛事加 `national_entry_mode`（`SHARED` / `SEPARATE`）；作品与参赛唯一键加 `stage_scope`（`BOTH` / `PROVINCIAL` / `NATIONAL`）。口径同 FastAPI：前台报名在 `SEPARATE` 赛事记为 `PROVINCIAL`，否则 `BOTH`；国赛作品不经前台报名，由学校批量导入（下一切片）提交；重复判定 `BOTH` 与任何阶段冲突、`PROVINCIAL` 与 `NATIONAL` 互不冲突 |
| 6 | 报名写入用到的 2027 列 | （按 #3 + #5 推导） | 在 2026 最终结构上**只加不改**：`people.credential_type`、`cqt_competition_participation_keys.{credential_type, stage_scope}`、`entries.{attachment_type, declared_group_size, stage_scope, province_entry_id}`、`competitions.national_entry_mode` |

## 边界

### 要做

- 赛事配置读取（公开）：`/api-web/competcategory/competitionlists`（赛事列表，可按 `status`、`name` 过滤）、`/api-web/competcategory/secondcategory`（某一级赛项下的二级赛项）、
  `/api-web/auth/getsecondcat`（某赛事可报的一级赛项）、`/api-web/competcategory/groups`（某赛事 + 赛项的组别）
- 个人 / 团体报名 `POST /api-web/competition/signup`（需登录），口径同 FastAPI：作品名称与赛事必填；赛事已启用且在报名窗口内；一级赛项存在且启用、二级赛项属于该一级赛项；
  附件规则（ZIP 必须是本系统上传的 `.zip`、或 http(s) 链接且不含汉字；赛项要求附件时必填）；每位参赛人的组别必须在该赛事 + 赛项的组别配置内；
  个人报名取账号的姓名、证件、学校；团体报名至少 2 人、成员证件不重复、学校必填、手机号格式；
  同一证件、同一赛事、同一一级赛项、阶段冲突时拒绝（提示已通过哪个来源、哪个报名号报过名）；写入作品、参赛人、参赛唯一键、评审对象；返回 `{productid, entry_no}`
- 我的报名列表 `GET /api-web/competcategory/productlists`（需登录）：本账号作为参赛人的全部非删除作品
- 报名详情 `GET /api-web/competition/signupdetail?productid=`（需登录、只能看自己的）：作品信息、赛区 / 赛项名称、团队成员、审核进度文案；省奖 / 国奖暂返回 null
- 表（Flyway 只建表）：`cqt_competitions`、`cqt_competition_categories`、`cqt_competition_groups`、`cqt_entries`、`cqt_entry_participants`、`cqt_people`、`cqt_competition_participation_keys`、`cqt_evaluation_targets`、`cqt_app_sequences`
- 导入脚本：2026 届赛事、赛项、作品、参赛人、人员、评审对象，并回填参赛唯一键
- 种子脚本：新一届赛事（停用草稿）与标准组别

### 明确不做

- 学校批量导入（Excel + ZIP、异步任务、任务进度 / 结果、`schoolproductlists`、`getexinfo`、`checksignup`）——下一切片
- 国赛作品提交入口（随批量导入）、国赛重新组队的「省赛一等奖」校验
- 修改 / 撤回报名（FastAPI 的 `updatesignup`、`withdraw`，uniapp 未调用）
- 省奖 / 国奖、成绩、证书（`signupdetail` 中奖项字段返回 null；评审与奖项切片）
- 后台赛事 / 赛项 / 组别管理、作品初审（后台切片）
- `canonical_people`、学校实体等 2027 规范化结构
- `X-CQTXJ-Database` 请求头（服务端忽略）
- 修改任何上游文件

### 本次不决定(留给后续 change)

- 赛项是否按赛事区分（2027 的 `competition_categories.competition_id`）：本次赛项全局共用（同 2026），`secondcategory` 的 `competition_id` 参数忽略
- 历史数据（2026）中同一证件重复参赛的清理

## 验收标准

- [ ] AC-1 `competitionlists` 返回 `[{id, legacy_id, name, edition, year, description, status}]`，按 `year`、`id` 倒序；带 `status` / `name` 时按条件过滤
- [ ] AC-2 `getsecondcat?id=<赛事>`：赛事未启用返回空数组；否则返回启用的一级赛项 `[{id(legacy_id), pid, name, sort, status, fujian}]`；`secondcategory?id=<一级>` 返回其下启用的二级赛项，字段同上
- [ ] AC-3 `groups?competition_id&firstcatid&secondcatid`：返回该赛事启用的、适用于该赛项（赛项为 0 表示通用）的组别 `[{id, name, sort}]`；缺 `competition_id` 或 `firstcatid` 返回空数组
- [ ] AC-4 个人报名成功：作品记为 `INDIVIDUAL`、`ACTIVE`、报名号 `WEB-<赛事ID>-<10 位序号>`，参赛人信息取自账号；返回 `{productid, entry_no}`；`productlists` 能看到
- [ ] AC-5 团体报名成功：成员 ≥ 2、第一位为队长，作品记为 `TEAM`；成员不足 / 证件重复 / 缺学校 / 手机号格式错误各有明确提示
- [ ] AC-6 拒绝：赛事不存在、未启用、未到 / 已过报名时间；赛项不存在 / 未启用 / 二级不属于一级；附件不合规；组别不在配置内；同一证件同一赛事同一一级赛项且阶段冲突 → 提示含已报名的报名号与作品名；均 HTTP 200、`code` 非 200
- [ ] AC-7 `SEPARATE` 赛事的前台报名 `stage_scope=PROVINCIAL`，`SHARED` 为 `BOTH`；已有 `NATIONAL` 记录的证件仍可报 `PROVINCIAL`，已有 `BOTH` 或 `PROVINCIAL` 的不行
- [ ] AC-8 `signupdetail`：本人的报名返回作品、`region_name`、赛项名称、`team`、`msg`、`step`，`shengAward` / `guoAward` 为 null；不是本人的返回「无权查看该报名记录」
- [ ] AC-9 导入脚本两遍执行行数一致；导入后老账号能在 `productlists` 看到 2026 届作品；参赛唯一键按历史作品回填
- [ ] AC-10 `./gradlew check` 全绿，`openspec check` 通过，不改上游文件

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 届次 | 单库多届 | 按届分库 | 用户决定；与框架单数据源一致 |
| 表结构 | 2026 最终结构 + 只加不改的 2027 列 | 2027 规范化结构 | 用户决定；历史导入零转换 |
| 赛事配置 | 种子脚本 | 本次做后台 | 用户决定 |
| 省 / 国赛分开 | 本次支持阶段字段与重复判定 | 只做 BOTH | 用户决定；国赛提交随批量导入 |
| 报名号序号 | 应用序列表（`cqt_app_sequences`，同 FastAPI） | 自增 ID 拼号 | 与历史报名号格式一致，且不依赖插入后回填 |

## 未决歧义

- 无

## 对下游的硬约束

- 请求 / 响应字段名照 uniapp 与 FastAPI（`competitionid`、`firstcatid`、`secaodcatid`/`majorid`、`zubie`、`istuandui`、`team_members`（JSON 字符串）、`purl`、`purlname`、`attachment_type`、`productid` …）
- 「同一证件同一赛事同一一级赛项不得阶段冲突」：同阶段由数据库唯一键兜底（并发下也不能重复），跨阶段由应用层查询判定并给出友好提示（explore 反向修正：前台报名阶段由赛事模式唯一决定，`NATIONAL` 只来自后续导入）
- 报名的全部写入在一个事务内
- ZIP 附件只接受本系统存储返回的地址（依赖 `cqt-file-storage`）
- 不修改任何上游文件

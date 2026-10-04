---
status: "active"
---

# cqt-competition Specification

## Purpose
本能力长期负责常青藤的赛事基础配置：赛事（即「届」）及其报名时间窗与省 / 国赛报名模式、一级与二级赛项（沿用旧系统编号）、按赛事与赛项适用的组别，
以及前台报名表单读取这些配置的接口口径。单库存放多届，历届数据并存，是否可报名由赛事状态与报名时间窗决定。

## Requirements

### Requirement: [FR-001] 赛事存储与报名开放判定

赛事 **MUST** 存放在 `cqt_competitions`（列同 FastAPI 2026 库最终结构，另加 `national_entry_mode`：`SHARED` 省国赛共用作品，默认；`SEPARATE` 省国赛分别报名）。
赛事可报名 **MUST** 同时满足：`status=1`；`registration_start` 为空或当前时间不早于它；`registration_end` 为空或当前时间不晚于它。
不满足时报名 **MUST** 分别提示「所选赛事尚未启用」「赛事报名尚未开始」「赛事报名已经结束」。

#### Scenario: 报名时间窗
- **WHEN** 赛事 `status=1`、报名时间为明天到后天；以及 `status=0`；以及报名截止于昨天
- **THEN** 分别判为「赛事报名尚未开始」「所选赛事尚未启用」「赛事报名已经结束」
- **判据**:领域单测用可控时间断言三种提示，并断言窗口内判为可报名

### Requirement: [FR-002] 前台赛事与赛项读取

`competitionlists`（`GET`/`POST /api-web/competcategory/competitionlists`，公开）**MUST** 返回 `[{id, legacy_id, name, edition, year, description, status}]`，按 `year`、`id` 倒序，
可按 `status`（精确）与 `name`（包含）过滤。
`getsecondcat`（`GET /api-web/auth/getsecondcat?id=<赛事ID>`，公开）在赛事不存在或 `status≠1` 时 **MUST** 返回空数组，否则返回启用的一级赛项；
`secondcategory`（`GET`/`POST /api-web/competcategory/secondcategory?id=<一级赛项编号>`，公开）**MUST** 返回该一级赛项下启用的二级赛项。
赛项项 **MUST** 为 `{id: legacy_id, pid: parent_legacy_id, name, sort: sort_order, status, fujian: attachment_required}`，按 `sort_order`、`id` 升序。

#### Scenario: 赛事列表过滤
- **WHEN** 存在 2026（status=2）与 2027（status=1）两个赛事，分别不带条件与带 `status=1` 请求
- **THEN** 前者 2027 在前、共两条；后者只有 2027
- **判据**:集成测试断言

#### Scenario: 未启用赛事无可报赛项
- **WHEN** 对 `status=0` 的赛事请求 `getsecondcat`
- **THEN** `data` 为空数组
- **判据**:集成测试断言

#### Scenario: 二级赛项
- **WHEN** 一级赛项 1 下有启用的二级赛项 11 与停用的 12，请求 `secondcategory?id=1`
- **THEN** 只返回 11，字段为 `id,pid,name,sort,status,fujian`
- **判据**:集成测试断言

### Requirement: [FR-003] 组别

组别 **MUST** 存放在 `cqt_competition_groups`，按赛事配置；一级 / 二级赛项编号为 0 表示对该层级通用。
`groups`（`GET /api-web/competcategory/groups?competition_id&firstcatid&secondcatid`，公开）缺 `competition_id` 或 `firstcatid` 时 **MUST** 返回空数组，
否则 **MUST** 返回该赛事启用的、一级赛项为 0 或等于 `firstcatid`、二级赛项为 0 或等于 `secondcatid` 的组别 `[{id, name, sort: id}]`，按 `id` 升序。

#### Scenario: 通用组别与赛项专属组别
- **WHEN** 赛事有通用组别「初中组」（0/0）与仅一级赛项 2 适用的「专业组」（2/0）；分别以 `firstcatid=1` 与 `firstcatid=2` 请求
- **THEN** 前者只有「初中组」，后者两个都有
- **判据**:集成测试断言

### Requirement: [FR-004] 历史导入与新届种子

2026 届赛事与赛项 **MUST** 通过独立导入脚本迁入；新一届赛事与标准组别（小学低年级组、小学中年级组、小学高年级组、初中组、高中组（含中职））**MUST** 通过种子脚本创建，
新赛事默认 `status=0`（停用草稿），由运维确认报名时间与模式后改为 1。两类脚本 **MUST** 可重复执行而不产生重复行。

#### Scenario: 种子脚本可重复执行
- **WHEN** 连续执行两次新届种子脚本
- **THEN** 新届赛事 1 条、通用组别 5 条
- **判据**:一次性 MySQL 容器中执行两遍后计数

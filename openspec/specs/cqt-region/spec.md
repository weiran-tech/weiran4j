---
status: "active"
---

# cqt-region Specification

## Purpose
本能力长期负责常青藤的赛区（地区）基础数据：`cqt_regions` 表的存储口径（沿用旧系统编号 `legacy_id` 作为对外 ID），以及前台注册、资料页选择赛区时使用的赛区列表接口与账号资料中赛区名称的解析。

## Requirements

### Requirement: [FR-001] 赛区存储

赛区 **MUST** 存放在表 `cqt_regions`，列与原统一库 `cqtxj2026.regions` 一致：`id`、`legacy_id`（唯一）、`parent_legacy_id`、`name`、`code`。
对外（接口、账号的 `cities` 字段）**MUST** 使用 `legacy_id` 作为赛区 ID。数据 **MUST** 通过独立导入脚本迁入。

#### Scenario: 导入脚本从原库迁入
- **WHEN** 在同一 MySQL 实例上同时存在 `cqtxj2026` 与目标库时执行 `scripts/biz/import/cqt_regions.sql` 两次
- **THEN** `cqt_regions` 行数与 `cqtxj2026.regions` 一致
- **判据**:执行后两表 `COUNT(*)` 相等，第二次执行后计数不变

### Requirement: [FR-002] 前台赛区列表

`GET` 或 `POST /api-web/competcategory/regions` **MUST** 免登录，返回 `data` 为数组，每项 `{"id":<legacy_id>,"pid":<parent_legacy_id>,"name":<名称>,"code":<编码或 null>}`，
按 `parent_legacy_id`、`id` 升序。

#### Scenario: 返回赛区列表
- **WHEN** `cqt_regions` 有 `legacy_id=15,parent_legacy_id=0,name=河北` 一行时请求赛区列表
- **THEN** `data` 中含 `{"id":15,"pid":0,"name":"河北",...}`
- **判据**:集成测试断言该项存在且字段名为 `id`/`pid`/`name`/`code`

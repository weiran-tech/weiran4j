---
status: "superseded"
superseded_by: "admin-foundation"
---

# rbac-ban-management Specification

## Purpose
本能力长期负责基于 IP 与设备标识维度的访问封禁名单管理。封禁记录的存在本身即表示"该 IP/设备被拒绝访问"——不同于账号维度的启禁用（那是对已知身份的开关），本能力管理的是对未必已知身份的来源做黑名单拦截，供登录与其它敏感操作前置校验复用。

## Requirements

### Requirement: [FR-001] 封禁记录分页列表查询

管理端 **MUST** 能够分页查询封禁记录列表，支持按封禁类型（`ip`/`device`）与账号类型（`account_type`）筛选。

#### Scenario: 按封禁类型筛选列表
- **WHEN** 调用封禁列表接口并传入 `type=ip`
- **THEN** 返回结果中的每一条记录的 `type` 字段均为 `ip`
- **判据**:接口返回 HTTP 200，`code` 为 `"0"`；`data.items` 逐项断言 `type == "ip"`

### Requirement: [FR-002] 封禁记录新增

管理端 **MUST** 能够新增封禁记录，指定类型（`ip`/`device`）、封禁值、可选的 IP 段范围与备注。新增的记录字段类型与约束 **MUST** 与 PHP 侧 `pam_ban` 表迁移定义（`account_type`/`type`/`value`/`ip_start`/`ip_end`/`note`）保持一致，不做任何 ALTER TABLE。

#### Scenario: 新增 IP 封禁记录后可被查询到
- **WHEN** 提交新增封禁请求，`type=ip`、`value=192.168.1.100`
- **THEN** 该记录被持久化，后续查询封禁列表能取到该记录
- **判据**:新增接口返回 HTTP 200 且 `data.id` 为正整数；列表接口按 `value` 筛选能查到该 `id`

#### Scenario: 新增记录不触发表结构变更
- **WHEN** 新增封禁记录使用现有 `pam_ban` 表全部既有字段
- **THEN** 不产生任何 DDL 变更
- **判据**:`./gradlew check` 全绿，且代码审查确认本 change 的 infrastructure 层新增文件中不含任何 `ALTER TABLE` 语句或 schema 迁移脚本

### Requirement: [FR-003] 封禁记录编辑与删除

管理端 **MUST** 能够编辑封禁记录的可变字段（值、IP 段、备注），以及删除封禁记录。删除即视为解除该条封禁——本能力 **MUST NOT** 新增独立的"启用/禁用"状态字段，封禁生效与否完全由记录是否存在决定。

#### Scenario: 删除封禁记录后该条记录不再出现在列表中
- **WHEN** 对一条已存在的封禁记录发起删除请求
- **THEN** 该记录从列表查询结果中消失
- **判据**:删除接口返回 HTTP 200；随后调用列表接口，返回结果中不再包含该记录的 `id`

#### Scenario: 编辑封禁记录更新其值但不改变记录存在性
- **WHEN** 对一条已存在的封禁记录发起编辑请求，修改 `note` 字段
- **THEN** 该记录的 `note` 字段更新，记录本身仍然存在
- **判据**:编辑接口返回 HTTP 200；随后查询该记录详情，`note` 字段等于新提交的值，`id` 不变

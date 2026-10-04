---
title: "cqt-signup：赛事配置读取与个人 / 团体报名"
owner: "zhaody901@gmail.com"
status: "done"
created_at: "2026-10-05"
updated_at: "2026-10-05"
---

# Proposal

## Why

- 背景：前台账号、文件上传已就绪，uniapp「我的 → 作品提交 / 参赛记录 / 报名详情」还调不通；赛事、赛项、组别、作品、参赛人都还没有表。
- 业务目标：参赛个人可以报名（个人 / 团体），查看自己的报名记录与详情；新一届赛事可按「省国赛共用 / 分开」两种模式开放报名。
- 当前问题：无赛事与报名能力；FastAPI 按届分库，本仓库改为单库多届。
- 需求来源：见 `interview.md`

## What Changes

- 新增：赛事配置读取 4 个接口；报名、我的报名列表、报名详情 3 个接口；9 张表（Flyway）；2026 届历史导入脚本与新一届种子脚本；报名号序列。
- 改造：`FileStorage` 端口加「是否本系统地址」判定（ZIP 附件校验）。
- 复用（来自 `explore.md` 的可复用点）：`/api-web` 底座、证件规则、账号仓储、赛区仓储、文件存储。
- 下线/不做：见 Out of Scope。

## Scope

### In Scope

- 赛事列表、一级 / 二级赛项、组别读取
- 个人 / 团体报名（含阶段、重复判定、附件、组别校验）
- 我的报名列表、报名详情（奖项字段暂为 null）
- 表结构、历史导入、种子脚本

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 学校批量导入（Excel + ZIP、异步任务、任务进度 / 结果、`schoolproductlists`、`getexinfo`、`checksignup`）——下一切片
- 国赛作品提交入口（随批量导入）、国赛重新组队的「省赛一等奖」校验
- 修改 / 撤回报名（FastAPI 的 `updatesignup`、`withdraw`，uniapp 未调用）
- 省奖 / 国奖、成绩、证书（`signupdetail` 中奖项字段返回 null；评审与奖项切片）
- 后台赛事 / 赛项 / 组别管理、作品初审（后台切片）
- `canonical_people`、学校实体等 2027 规范化结构
- `X-CQTXJ-Database` 请求头（服务端忽略）
- 修改任何上游文件

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `cqt-competition` | ADDED | 赛事、赛项（一级 / 二级）、组别的存储与前台读取；报名窗口与省 / 国赛报名模式 |
| `cqt-entry-signup` | ADDED | 前台报名：个人 / 团体、阶段与重复参赛判定、附件与组别规则、我的报名列表与详情、报名号 |
| `cqt-file-storage` | MODIFIED | 存储后端增加「判定地址是否由本系统存储产生」（FR-003） |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 新增/改造跨模块错误码、分页契约 | 不动 | — |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 新增/改造账号、RBAC、JWT 登录相关能力 | 不动；改动在 `weiran-cqt-*` | zhaody901@gmail.com |
| PK-3 | `weiran-app` | 新增模块依赖聚合(通常只在新增整个模块时才动) | 不改已有文件；新增下游测试 `CqtSignupIT` | zhaody901@gmail.com |
| PK-4 | `web` | 新增/改造 page、hook、组件 | 不动 | — |

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☐ | 无新模块、无新依赖 |
| `weiran-common` 的错误码/分页契约 | ☐ | 不改 |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 自动 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 无后台页面 |

另：两个 Flyway 脚本与 `FileStorage` 端口变更归 Layer 0。

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 前台接口；赛事读取公开，报名与我的报名需前台登录 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 无 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☑ | 列表与详情只返回本账号作为参赛人的作品（按 `(source_database, legacy_user_id)` 关联）；详情越权返回「无权查看该报名记录」 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☑ | 报名成功记 info 日志（账号、作品 ID、报名号、赛事、赛项、人数）；不入库 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☑ | 日志不记证件号与手机号；详情返回本人报名的成员证件号（uniapp 详情页需要），列表只返回队长姓名 / 手机号（同 FastAPI） |
| CC-7 幂等 (`idempotency`,尚未引入) | ☑ | 重复提交由参赛唯一键拦截（同阶段），第二次返回「已在本届同一赛项报名」 |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及（批量导入在下一切片） |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 作品初审在后台切片 |

## Dependencies

- 产品/设计：新一届赛事名称、报名时间、省国赛模式由用户在种子脚本中确认
- 后端：`cqt-portal-account`（账号）、`cqt-file-storage`（附件地址）、`cqt-region`（赛区名）
- 前端：uniapp 不改
- 数据库变更：9 张新表；历史导入与种子脚本
- 运维/配置：切换时执行导入脚本，再执行种子脚本并把新赛事 `status` 改为 1
- 测试：单测 + `CqtSignupIT`

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 历史数据量大 | 导入 | `INSERT … SELECT`，容器验证 |
| 跨阶段并发 | 前台 `PROVINCIAL` 与导入 `NATIONAL`/`BOTH` 同时写 | `NATIONAL` 不与 `PROVINCIAL` 冲突；`BOTH` 只出现在 `SHARED` 赛事，与前台同阶段由唯一键兜底 |
| 赛项全局 | 新一届赛项与 2026 不同 | 本次不决定 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

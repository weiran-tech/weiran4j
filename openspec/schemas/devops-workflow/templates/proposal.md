---
title: ""
owner: ""
status: "draft"
created_at: ""
updated_at: ""
---

# Proposal

## Why

- 背景:
- 业务目标:
- 当前问题:
- 需求来源:见 `interview.md`

## What Changes

- 新增:
- 改造:
- 复用(来自 `explore.md` 的可复用点):
- 下线/不做:

## Scope

### In Scope

- 

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 

## Capabilities

> 本节是 **proposal 与 specs 阶段之间的契约**:每个能力对应一个 `specs/<kebab-case>/spec.md`,
> 一一对应,不得多也不得少(`node openspec/check.mjs` 会逐项校验)。
> 能力名必须用反引号包裹的 kebab-case。
>
> **能力名是持久的领域名词,不是本次 change 的名字。** 与 change 同名会被判错
> (`L2a/capability-not-change-name`)。`fix-` / `-fixed` / `-cleanup` / 动词短语都是事件名不是能力名:
> 同一块实现该叫 `biz-project-create-modal`,而不是拆成
> `project-create-as-modal` + `project-create-modal-fullscreen-headers-buttons` + `fix-project-create-modal-scroll`
> 三个并列能力 —— 那样它们会同时生效并互相矛盾,且校验全绿。
>
> **填表前先读 `openspec/specs/README.md`(能力索引)** —— 一页看全全部能力的名字、需求数、
> 状态与一句话职责。要改的行为已有能力在管,就用那个能力名走 MODIFIED / REMOVED,不要新开一个。

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `<kebab-case-能力名>` | ADDED / MODIFIED / REMOVED / RENAMED | <!-- 这个能力长期管什么 --> |

<!-- openspec:slot project-structure
  【项目特定 · 换项目必须重写本槽】
  问:本项目由哪些可独立影响的部分组成?一次改动需要按什么维度声明影响面?
  为什么问:这决定了 L4 分层的粒度。monorepo 按包,单体按模块,Laravel 按 poppy 模块。
  答案要求:一张覆盖全部组成部分的表,每行能回答「这次动没动它、怎么动」。

  本项目的权威版本住在 `openspec/rules/enforced/project.md` 的 `PK-N` 条目(下方「影响的包」表)——
  改包清单先改那里,再同步这里的表(ID 列对应 `PK-N`)。两边 ID 不一致会被
  `TEMPLATE/profile-rows` 拦。「共享层影响」表不走这套同步,见 rules/enforced/project.md 「五」的说明。
-->

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 新增/改造跨模块错误码、分页契约 |  |  |
| PK-2 | `weiran-system-*`(api/domain/application/infrastructure/adapter) | 新增/改造账号、RBAC、JWT 登录相关能力 |  |  |
| PK-3 | `weiran-app` | 新增模块依赖聚合(通常只在新增整个模块时才动) |  |  |
| PK-4 | `web` | 新增/改造 page、hook、组件 |  |  |

## 共享层影响(决定能否并行)

> 命中即进入 `exec/plan.md` 的 Layer 0,串行先做。本表来源是 `explore.md` 的共享层命中清单——
> 那里是完整清单,此处只做汇总勾选。

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☐ |  |
| `weiran-common` 的错误码/分页契约 | ☐ |  |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ |  |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ |  |

<!-- /openspec:slot project-structure -->

<!-- openspec:slot crosscuts
  【项目特定 · 换项目必须重写本槽】
  问:本项目有哪些「每次改动都该问一遍、漏了没人会发现」的横切关注点?
  为什么问:tasks.md 是唯一权威需求源,没人会重新推导需求。这里漏掉的东西,
           L8 也发现不了 —— 因为 spec 里根本没写。这张表是唯一的漏项防线。
  答案要求:逐项可勾选;勾「不涉及」是合法的,但必须写判断依据。
  注意:这一项与语言无关,与【业务域】有关 —— 电商、财务、内控各不相同。

  本项目的权威版本住在 `openspec/rules/enforced/project.md` 的 `CC-N` 条目 —— 改横切关注点先改那里,
  再同步下面表格「项」列的 ID 前缀。两边 ID 不一致会被 `TEMPLATE/profile-rows` 拦。
-->

## 横切关注点

> 这几项在本仓库最容易漏,漏了 L8 也发现不了(因为 spec 里根本没写)。
> **本系统目前只有 RBAC/JWT 登录一个业务域**,多项标注「不适用/尚未引入」是如实反映现状,
> 不是模板没填全——填写时不要因为条目存在就假设对应机制已经落地,先去
> `rules/enforced/project.md` 「三、横切关注点」核实。

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ |  |
| CC-2 菜单(前端硬编码,无后端表) | ☐ |  |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ |  |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ |  |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☐ |  |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☐ |  |
| CC-7 幂等 (`idempotency`,尚未引入) | ☐ |  |
| CC-8 导出 / 任务中心(尚未引入) | ☐ |  |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ |  |

<!-- /openspec:slot crosscuts -->

## Dependencies

- 产品/设计:
- 后端:
- 前端:
- 数据库变更(需按宪法 CP-7 去 `weiran-v1` 核对迁移文件):
- 运维/配置:
- 测试:

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
|  |  |  |

## Review Checklist

- [ ] 范围和非目标已确认,且与 `interview.md` 一致
- [ ] 涉及的包和 Owner 已确认
- [ ] 共享层影响已勾选(直接决定 L4 分层)
- [ ] 横切关注点已逐项过一遍
- [ ] 数据库、接口、定时任务、配置、发布影响已列出
- [ ] 测试和灰度策略已确认

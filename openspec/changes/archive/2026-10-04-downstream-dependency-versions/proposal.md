---
title: "下游第三方依赖版本清单"
owner: "多厘"
status: "done"
created_at: "2026-10-04"
updated_at: "2026-10-04"
---

# Proposal

## Why

- 背景:D-012 让 fork 下游不改上游文件即可扩展,但第三方依赖版本仍只能写进上游 BOM(CP-4)。
- 业务目标:下游在独占文件里登记业务依赖版本(含 import 第三方 BOM),业务模块照常不写版本。
- 当前问题:下游接阿里云短信 SDK、OSS、Excel、PDF 都得改 `weiran-dependencies/build.gradle.kts`,同步上游必冲突;
  若开放清单而不加防护,下游给 Spring / Jackson 等钉版本会被 Gradle 静默取高,等于悄悄升级框架依赖。
- 需求来源:见 `interview.md`

## What Changes

- 新增:下游清单 `weiran-dependencies/biz-dependencies.gradle.kts`(存在才 apply);构建期检查 `verifyFrameworkVersions`
- 改造:BOM 先快照框架层再 apply 下游清单;CP-4 改写
- 复用(来自 `explore.md` 的可复用点):D-012 下游独占文件约定;scratchpad 原型的检查骨架
- 下线/不做:见 Out of Scope

## Scope

### In Scope

- BOM:框架层快照、下游清单 apply、上游漂移白名单
- build-logic:`verifyFrameworkVersions`(漂移检查 + 下游直接约束检查 + 白名单)
- 文档:CP-4、契约 §2.2、AGENTS.md、`project.md` SL-2、D-013

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 不改 Spring Boot / MyBatis-Plus BOM 的版本,不为消除那 2 处漂移去钉版本或排除传递依赖
- 不用 `enforcedPlatform` / `strictly` 强制版本(会静默降级第三方库的传递依赖,方向相反的静默)
- 不检查 `testRuntimeClasspath`、`annotationProcessor` 等非运行时配置
- 不检查下游第三方 BOM 把框架依赖**往低**拉的情况(Gradle 取高,实际版本不变,无害)
- 不创建 `biz-dependencies.gradle.kts`(下游独占)
- 不接入阿里云 SDK 本身(那是下游的 change)

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `downstream-extension` | ADDED | 在既有「fork 下游不改上游文件即可扩展」能力下新增依赖版本清单与框架版本防护两条需求 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 新增/改造跨模块错误码、分页契约 | 不动 | — |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 新增/改造账号、RBAC、JWT 登录相关能力 | 不动 | — |
| PK-3 | `weiran-app` | 新增模块依赖聚合(通常只在新增整个模块时才动) | 构建脚本不动;经约定插件获得 `verifyFrameworkVersions` 并挂入 `check` | 多厘 |
| PK-4 | `web` | 新增/改造 page、hook、组件 | 不动 | — |

另:`weiran-dependencies`(BOM)与 `build-logic` 见 In Scope。

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☑ | BOM 结构调整:框架层快照 + apply 下游清单 + 白名单 |
| `weiran-common` 的错误码/分页契约 | ☐ | 不涉及 |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 不改;检查由 build-logic 约定插件提供 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 不涉及 |

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 纯构建改动 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 纯构建改动 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ | 不涉及 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☐ | 纯构建改动 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☐ | 不涉及 |
| CC-7 幂等 (`idempotency`,尚未引入) | ☐ | 不涉及 |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

## Dependencies

- 产品/设计:无
- 后端:Gradle API(detached configuration、ResolutionResult),无新依赖
- 前端:无
- 数据库变更(需按宪法 CP-7 去 `weiran-v1` 核对迁移文件):无
- 运维/配置:无;`check` 首次运行会多解析一次依赖元数据
- 测试:临时清单实跑三种场景 + 全量 L7

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 下游接新 SDK 即红 | SDK 传递依赖抬高框架依赖 | 报错写明白名单写法;用户已接受此成本 |
| 白名单过期 | 升级 Spring Boot 后漂移消失 | 不再漂移的白名单条目打 warning |
| 检查自身出错导致误报 | 框架快照不全 | 快照取自 BOM 同一处声明,不复述版本;临时清单场景覆盖 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

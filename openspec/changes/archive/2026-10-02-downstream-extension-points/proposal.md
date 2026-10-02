---
title: "为 fork 下游开扩展点"
owner: "多厘"
status: "done"
created_at: "2026-10-02"
updated_at: "2026-10-02"
---

# Proposal

## Why

- 背景:下游 mono4j 以 git fork 跟随 weiran4j(upstream remote + `git merge`),只新增业务模块 `weiran-cqt` 与前台接口 `/api-web/**`。
- 业务目标:下游**不改任何框架文件**就能接入业务模块、配置、迁移、前台包络、菜单图标、流水线登记,上游同步时零冲突。
- 当前问题:业务模块清单在 settings / BOM / app 三处写死;登记表、图标白名单、组件清单都是上游文件;
  `ApiResponseBodyAdvice` 对 `com.weiran.**` 一律包 `{code:0}`,下游 uniapp 需要 `{code:200}`;
  Flyway 默认拒绝版本号早于已执行脚本的新脚本,上下游时间戳交错时应用起不来。
- 需求来源:见 `interview.md`

## What Changes

- 新增:`@SkipApiResponse` 注解;`weiran4j/docs/business-modules.md`;下游旁路文件约定(`application-biz.yml`、`web/src/biz/icons*.ts`、`AGENTS.biz.md`、`components.biz.md`、`state/bizs/README.biz.md`)
- 改造:Gradle 业务模块自动发现(settings 写 `gradle.extra`,BOM 与 app 读);`application.yml` 加配置导入与 `out-of-order`;
  `ApiResponseBodyAdvice.supports()`;`icons.tsx` 合并下游图标;`components-registry` 守卫读旁路清单;`project.json` sourcePaths 改通配
- 复用(来自 `explore.md` 的可复用点):settings 的五层 include 循环、app 的 jacoco 聚合循环、`WebLayerTest` 的 MockMvc 搭建、page-registry 的 `import.meta.glob` 机制
- 下线/不做:见 Out of Scope

## Scope

### In Scope

- U1 业务模块自动发现,五层不齐即构建失败;BOM 坐标与之同源
- U2 `weiran-app` 依赖与覆盖率聚合按清单生成
- U3 `spring.config.import: optional:classpath:application-biz.yml`
- U4 `spring.flyway.out-of-order: true`
- U5 `@SkipApiResponse` 及测试
- U6 业务模块登记表迁到 `business-modules.md` 并改全部引用
- U7 下游图标 glob 合并及测试
- U8 sourcePaths 通配;AGENTS.md 加 `AGENTS.biz.md` 必读
- 额外 1/2:组件清单与 bizs 文件索引的下游旁路文件
- 文档同步:契约 §2.1/§3、宪法 CP-14/CP-15、project.md SL-1~SL-4、决策 D-012、design/check.md、CHANGELOG

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 不改 `AuthInterceptor` / `GlobalExceptionHandler` / `page-registry.ts`
- 不为 `/api-web` 提供任何框架级认证、CORS、响应包络——包络由下游 Controller 自己返回
- 不改 `check.mjs` 本体
- 不改 `state-waitlist.mjs`
- 不改任何已合入的 Flyway 脚本,不新增 Flyway 脚本
- 不新建 `weiran-cqt` 或任何示例业务模块(验证用的临时目录验完即删,不入库)
- 不支持多份 `application-biz.yml`(classpath import 不支持通配)
- 不处理下游往 `artifact.md` / `cross-biz.md` 追加条目时的冲突

## Capabilities

> 本节是 **proposal 与 specs 阶段之间的契约**:每个能力对应一个 `specs/<kebab-case>/spec.md`,
> 一一对应,不得多也不得少(`node openspec/check.mjs` 会逐项校验)。

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `downstream-extension` | ADDED | 长期负责「fork 下游不改上游文件即可扩展」的全部约定:模块发现、配置导入、迁移顺序、响应包络跳过、图标与清单的旁路文件 |

> 未改 `admin-foundation`:其 FR-001 约束的是 `/api/**` 的包络,本 change 不放宽它——`@SkipApiResponse`
> 只用于 `/api/**` 之外的前缀,该限制写进新能力的需求里。

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 新增/改造跨模块错误码、分页契约 | `weiran-common` 不动;`weiran-framework` 新增 `@SkipApiResponse`、改 `ApiResponseBodyAdvice` | 多厘 |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 新增/改造账号、RBAC、JWT 登录相关能力 | 不动 | — |
| PK-3 | `weiran-app` | 新增模块依赖聚合(通常只在新增整个模块时才动) | 构建脚本按清单生成依赖与聚合;`application.yml` 加两项配置 | 多厘 |
| PK-4 | `web` | 新增/改造 page、hook、组件 | 只改 `utils/icons.tsx` 与其测试 | 多厘 |

另:构建根(`settings.gradle.kts`、`weiran-dependencies`)、文档与 `openspec/` 流水线文件见 In Scope。

## 共享层影响(决定能否并行)

> 命中即进入 `exec/plan.md` 的 Layer 0,串行先做。本表来源是 `explore.md` 的共享层命中清单——
> 那里是完整清单,此处只做汇总勾选。

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☑ | 两处写死清单改为发现 + `gradle.extra` 共享 |
| `weiran-common` 的错误码/分页契约 | ☐ | 不涉及;新注解放 `weiran-framework` |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☑ | 依赖与覆盖率聚合按清单生成 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 不涉及 |

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 不新增权限码;登记表迁移只改文档位置,权限码前缀规则不变 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 不新增菜单;图标白名单扩展只影响菜单 `icon` 的可选值 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ | 不涉及 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☐ | `@SkipApiResponse` 只影响响应体包装,不影响 `@OperationLog` 切面 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☐ | 不涉及 |
| CC-7 幂等 (`idempotency`,尚未引入) | ☐ | 不涉及 |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

## Dependencies

- 产品/设计:无
- 后端:Spring `AnnotatedElementUtils`(已在 classpath)
- 前端:Vite `import.meta.glob`(已使用)
- 数据库变更(需按宪法 CP-7 去 `weiran-v1` 核对迁移文件):无迁移;`out-of-order` 只改执行策略
- 运维/配置:部署侧无新环境变量;`application-biz.yml` 由下游 jar 携带
- 测试:framework 单测(`WebLayerTest`)、web vitest(`icons.test.tsx`)、Gradle 临时目录手工验证、全量 L7

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 目录扫描误收 | `weiran-*` 下恰有某层子目录 | 命中任一层即要求五层齐全,否则失败 |
| `@SkipApiResponse` 被误用到 `/api/**` | 管理端 Controller 标了它 | 能力需求写明禁止;前端会拿不到 `code` 立即暴露 |
| `out-of-order` 掩盖顺序依赖 | 后执行的旧版本脚本依赖新脚本的表 | 契约注明脚本之间不得隐含顺序依赖 |
| 下游代码拉低聚合覆盖率 | 下游测试不足 | 契约注明门槛对下游同样生效 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

---
title: "部署与可观测性(#09 / #10 / #11 / #18)"
owner: "多厘"
status: "draft"
created_at: "2026-10-06"
updated_at: "2026-10-06"
---

# Proposal

## Why

- 背景:`artifact.md` 中 #09(`.env.example` 过期)、#10(日志体系缺失,P1)、#11(优雅停机未显式配置)、#18(缺部署步骤文档)都卡在「能上线」这一步。D-014 又新增了同源部署、反代透传头、`Secure` Cookie 等硬要求,目前只写在契约和决策记录里。
- 业务目标:让部署的人照着一份文档和一个 Compose 文件就能起一套能用的环境;线上出问题时,用一个请求号串起前端报错、访问日志、异常日志和操作日志。
- 当前问题:没有 requestId、没有日志配置、没有访问日志;4xx 业务异常不打日志;异步操作日志线程拿不到请求上下文;`.env.example` 还是 PHP 时代的内容;没有任何部署说明和镜像。
- 需求来源:见 `interview.md`。

## What Changes

- 新增:
  - requestId 过滤器(MDC + `X-Request-Id`,合法的入站 ID 沿用);
  - 访问日志;
  - 框架失败体 `ErrorResponse`(带 `requestId`);
  - `MdcTaskDecorator`;
  - `logback-spring.xml`;
  - `.env.example` 一致性测试;
  - 后端 / 前端 Dockerfile、`nginx.conf`、`docker-compose.yml`;
  - 部署文档 `02-部署.md`。
- 改造:
  - `GlobalExceptionHandler` 改为产出 `ErrorResponse`,并给 4xx 业务异常补 WARN 日志;
  - `ApiResponseBodyAdvice` 放行 `ErrorResponse`;
  - 拦截器把 userId 写进请求属性,供访问日志读取;
  - 操作日志线程池传递 MDC;
  - `application.yml` 显式写出优雅停机与日志相关配置;
  - 前端错误 Toast 显示请求号;
  - 整份重写 `.env.example`。
- 复用(来自 `explore.md`):`ClientIpResolver`、`CurrentUser`、Spring Boot 自带的 Logback / MDC / `TaskDecorator`,不加依赖。
- 下线/不做:见 Out of Scope。

## Scope

### In Scope

- #10 日志体系(requestId、失败体、日志配置、访问日志、异常日志分级、异步 MDC、前端显示)
- #11 优雅停机(显式配置 + 测试)
- #09 `.env.example` 整份重写 + 一致性测试
- #18 Docker Compose 部署(镜像、Nginx 同源反代、MySQL)+ 部署文档
- 契约、AGENTS.md、`artifact.md` 同步

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 不处理 #03(`X-Forwarded-For` 可信代理):部署文档只提示风险,不改 `ClientIpResolver`。
- 不做外部身份登录(CAS / OIDC,下一个 change)。
- 不引入链路追踪系统(OpenTelemetry / SkyWalking)、不做指标(Micrometer / Prometheus 端点)、不做 JSON 日志。
- 不改成功响应的包络,不给 `ApiResponse`(`weiran-common`)加字段。
- 不做 K8s 清单、不做 CI 构建 / 推送镜像、不做 HTTPS 证书配置(文档说明由外层负载均衡终止)。
- 访问日志不记请求体和响应体。

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `admin-foundation` | MODIFIED | FR-001 统一响应包络:失败响应额外带 `requestId`,成功响应形状不变 |
| `observability` | ADDED | 长期负责「线上出问题时能拿到现场」:请求号的生成与传递、访问日志、异常日志分级、日志输出与滚动、优雅停机 |
| `deployment` | ADDED | 长期负责「按仓库里的产物就能部署一套可用环境」:环境变量清单与一致性、容器镜像、同源反向代理、部署文档 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` / `weiran-framework` | 改造 | common 不改;framework 新增 `RequestIdFilter`、`ErrorResponse`、`MdcTaskDecorator`,改造异常处理、响应包装、拦截器 | 多厘 |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 改造 | 只有 application 的操作日志线程池加 TaskDecorator | 多厘 |
| PK-3 | `weiran-app` | 改造 | `application.yml`、新增 `logback-spring.xml`、集成测试 | 多厘 |
| PK-4 | `web` | 改造 | `request.ts` 显示请求号、`types/api.ts`、`Dockerfile` + `nginx.conf` | 多厘 |

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☐ | 不新增模块、不加依赖 |
| `weiran-common` 的错误码/分页契约 | ☐ | 不改 `ApiResponse` 与错误码;失败体形状变化由框架新类型承担,但作为 HTTP 契约放进 Layer 0 冻结 |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 不改构建脚本 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 不新增页面 |

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 不新增接口与权限码 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 不涉及 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ | 不涉及 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☑ | 操作日志异步线程带上 requestId(只进应用日志,不改 `sys_operation_log` 表结构);新增的访问日志属于应用日志,不入库 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☑ | 访问日志不记请求体和查询参数的值;入站 requestId 白名单校验,防日志注入;日志不得出现令牌、Cookie、CSRF 值(CP-9) |
| CC-7 幂等 (`idempotency`,尚未引入) | ☐ | 不涉及(requestId 不用作幂等键) |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

## Dependencies

- 产品/设计:错误 Toast 文案末尾加「(请求号 xxxxxxxx)」
- 后端:无新依赖
- 前端:无新依赖
- 数据库变更:无
- 运维/配置:新增 `WEIRAN_LOG_DIR`、`WEIRAN_LOG_MAX_HISTORY`、`WEIRAN_SHUTDOWN_TIMEOUT`;部署改用 Docker Compose(需要 Docker 24+ / Compose v2)
- 测试:框架单测、集成测试、前端 vitest、`docker compose` 真实启动验证

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 失败体多了字段 | 第三方按严格形状解析 | 只加字段、不改原有字段;契约写明 |
| 访问日志量大 | 高频接口 | 一行摘要;`com.weiran.access` 可单独调级别;健康检查走 DEBUG |
| 镜像构建依赖外网 | 拉取基础镜像失败 | 用官方镜像;失败如实记录到 verify |
| 日志写进容器层 | 未挂卷 | Compose 挂命名卷 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

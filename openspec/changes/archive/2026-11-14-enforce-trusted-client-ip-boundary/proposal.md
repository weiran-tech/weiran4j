---
title: "建立可信客户端 IP 边界"
owner: "Codex"
status: "draft"
created_at: "2026-11-14"
updated_at: "2026-11-14"
---

# Proposal

## Why

ClientIpResolver 无条件信任访客提交的转发头，其结果既写日志又参与短信 IP 限流。默认 Nginx 追加头不能阻止首项伪造。用户选择优先处理该问题，需求来源见 interview.md。

## What Changes

- 新增显式可信代理配置和统一解析策略，默认只认直接连接对端。
- 改造共用 IP 入口与代理头处理，保持静态调用签名、日志字段和短信限额不变。
- 复用框架自动配置、登录上下文和配置一致性测试，补全代理链与限流回归。
- 同步部署说明、环境变量模板、跨接口约束及 docs 文档站示例。

## Scope

### In Scope

可信代理 IP/CIDR、转发链解析与地址规范化、容器前置改写防护、默认 Nginx 边界清洗、消费者一致性和验证。

### Out of Scope

- 不改短信限额、验证码/MFA 流程、分布式限流存储或角色权限刷新机制。
- 不新增页面、菜单、数据库表、Flyway 迁移、REST 路由或第三方依赖。
- 不自动信任 loopback、整个私网、全部 Docker 网络或任意来源。

## Capabilities

已核对 openspec/specs/README.md 和现有能力正文。

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `observability` | ADDED | 新增 FR-007，规范所有 IP 消费者共用的信任边界 |
| `deployment` | MODIFIED | 修订 FR-002/FR-003 的代理头处理和部署配置要求 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | weiran-framework | 新增/改造 | 统一 IP 策略、过滤器和自动配置，Layer 0 | Codex |
| PK-2 | weiran-system-* | 复用/验证 | 登录、短信限流继续消费共用上下文 | Codex |
| PK-3 | weiran-app | 配置/测试 | 转发头策略、可信代理参数和集成验证 | Codex |
| PK-4 | web | 配置 | 只改 Nginx，不改页面组件 | Codex |

## 共享层影响(决定能否并行)

| 类别 | 是否命中 | 说明 |
|---|---|---|
| settings.gradle.kts / BOM | ☐ | 不增模块或依赖 |
| framework 错误码/分页契约 | ☐ | 保持包络和类型不变 |
| framework Web 与自动配置 | ☑ | 全消费者共享，串行 Layer 0 完成 |
| app/build.gradle.kts | ☐ | 不改依赖聚合 |
| 页面、动态菜单及序号资源 | ☐ | 不改页面、菜单或迁移 |

## 横切关注点

| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 | ☐ | 不增权限码 |
| CC-2 菜单 | ☐ | 不增页面或菜单 |
| CC-3 数据范围 | ☐ | 不引入数据范围 |
| CC-4 多租户 | ☐ | 非多租户 |
| CC-5 审计日志 | ☑ | 登录和操作日志采用可信 IP |
| CC-6 字段脱敏 | ☐ | 保留既有脱敏，不记录原始转发头 |
| CC-7 幂等 | ☐ | 不改请求幂等行为 |
| CC-8 导出 / 任务中心 | ☐ | 无本次改动 |
| CC-9 工作流绑定 | ☐ | 无审批流程 |

## Dependencies

- 后端：现有 Servlet/Spring 自动配置，无新增第三方库。
- 数据库、API、定时任务：无结构或协议变更。
- 运维：部署者配置实际可信代理地址；默认无代理信任。
- 文档：packages/server/docs 的部署与契约说明，以及 docs/deployment.md、docs/environment.md、docs/contracts.md 对应内容同步。
- 测试：JDK 21、Docker Testcontainers、现有仓库 L7 门禁。

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 代理地址成为共同限流桶 | 遗漏可信代理配置 | 发布前核对实际 socket peer，提供直连/单层/多层示例 |
| 信任范围过大 | 部署者配置整段私网 | 文档要求最小实际代理范围，默认值为空 |
| 多层代理先行改写 | 启用 Boot 转发头处理 | 显式 none 并启动检查 |

## Review Checklist

- [x] 范围与 interview 一致
- [x] 涉及包和 Owner 已确认
- [x] 共享层影响已勾选
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和发布策略已提出，等待 L3 批准

---
title: "以 Wuli3 1.1.1 作为框架基础设施"
owner: "Codex"
status: "draft"
created_at: "2026-11-27"
updated_at: "2026-11-27"
---
# Proposal

## Why

用户要求将已发布 Wuli3 1.1.1 接入基座。框架当前独立维护依赖与基础设施，需复用正式基座但保持既有业务和 HTTP 契约。来源见 interview.md，实际差异见 explore.md。

## What Changes

导入 Wuli3 BOM 和基础 starter，从 GitHub Packages 获取正式制品；复用 core 与 MySQL 基础依赖，保留 Weiran 协议兼容层；消除重复解析器和版本声明。更新 D-008 后续决策、开发与 CI 凭据文档。

## Scope

### In Scope

仓库、BOM、framework 装配、CI/容器构建的包读取权限与现有契约回归。

### Out of Scope

- 不修改历史 Flyway、不复制 Wuli3 的演示业务、不改前端业务。
- 不为了通过构建关闭版本漂移、静态检测或覆盖率门禁。
- 不自动启用 Redis、消息队列、搜索引擎或其他未部署中间件。

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `foundation-runtime` | ADDED | 正式框架制品的认证解析、基础 starter 装配与兼容边界 |
| `downstream-extension` | MODIFIED | 框架版本快照从直接两个 BOM 扩展为 Wuli3 BOM 及其传递平台 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | weiran-framework | 改造依赖 | 引入基础 starter，保留公共协议 | Codex |
| PK-2 | weiran-system-* | 不改业务 | 验证认证、审计、持久化回归 | Codex |
| PK-3 | weiran-app | 验证装配 | 验证应用启动和全部集成测试 | Codex |
| PK-4 | web | 不改 | HTTP 协议保持兼容 | Codex |

## 共享层影响(决定能否并行)

| 类别 | 是否命中 | 说明 |
|---|---|---|
| settings.gradle.kts / weiran-dependencies BOM | ☑ | 认证仓库与 Wuli3 平台串行调整 |
| weiran-framework 错误码/分页契约 | ☐ | 保留现有 Java/HTTP 签名，只改外层依赖 |
| weiran-app/build.gradle.kts 依赖聚合 | ☐ | 不新增业务模块 |
| manage 路由/菜单 | ☐ | 不改前端 |

## 横切关注点

| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 | ☐ | 不新增权限码，既有鉴权回归 |
| CC-2 菜单 | ☐ | 不改菜单与页面 |
| CC-3 数据范围 | ☐ | 不引入 |
| CC-4 多租户 | ☐ | 不引入 |
| CC-5 审计日志 | ☑ | 基础日志装配不能破坏现有请求号与操作日志 |
| CC-6 字段脱敏 | ☐ | 不启用 Wuli3 Web JSON 自动处理 |
| CC-7 幂等 | ☐ | 不新增写用例 |
| CC-8 导出 / 任务中心 | ☐ | 不改任务业务 |
| CC-9 工作流绑定 | ☐ | 不引入审批引擎 |

## Dependencies

- 后端：GitHub Packages Wuli3 1.1.1，JDK 21，Boot 3.5.15 / MP 3.5.16。
- 前端与数据库：无变更，不新增迁移。
- 运维：本地外部 Gradle 属性/环境变量；CI read:packages 与跨仓包读取授权；Docker 仅通过构建 secret 获取令牌。
- 测试：原有 framework 和 app 集成回归、依赖漂移和 domain 编译边界。

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 重复解析器 | starter 自带 4.9，与现有解析器冲突 | 排除 starter 的 4.9 变体 |
| 双重协议 | 启用 Web/权限/audit starter | 本阶段不接入这些行为性 starter |
| 跨仓包权限 | GITHUB_TOKEN 未获 Wuli3 包授权 | 配置包 Actions 访问，必要时用专用只读 secret |

## Review Checklist

- [x] 范围和非目标与 interview 一致
- [x] 包及 Owner 已确认
- [x] 共享层与横切关注点已列出
- [x] 数据库、接口、配置、发布影响已列出
- [x] 测试与回滚策略已明确

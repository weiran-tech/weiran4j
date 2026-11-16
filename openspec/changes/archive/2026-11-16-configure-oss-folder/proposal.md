---
title: "OSS 默认文件夹配置"
owner: "Codex"
status: "draft"
created_at: "2026-11-15"
updated_at: "2026-11-15"
---

# Proposal

## Why

- 当前 OSS 媒体对象根目录固定为 media，部署者无法按项目指定根文件夹。
- 需求来源见 interview.md；保持 media 默认值和现有链接兼容。

## What Changes

- 新增 OSS 文件夹部署配置，默认 media。
- 改造新对象生成与直传前缀，复用既有 UUID、Hashids、UTC 日期和签名票据。
- 对文件夹名做单级安全校验，保留历史对象访问与删除。
- 不下线现有能力。

## Scope

### In Scope

- OSS 媒体新对象根目录、配置绑定、结构校验、兼容性测试和文档。

### Out of Scope

- 不迁移或重命名 Bucket 内已有对象，不修改数据库表结构。
- 不新增后台配置页面，不修改本地存储与批处理存储的目录行为。
- 不新增未登录上传入口，不改权限与上传格式大小限制。

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `system-file-storage` | MODIFIED | 系统文件存储允许配置 OSS 根文件夹，保留默认值与历史对象 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | weiran-framework | 不涉及 | 不改框架 | Codex |
| PK-2 | weiran-system-* | 改造 infrastructure | OSS 配置与路径校验 | Codex |
| PK-3 | weiran-app | 改配置 | 环境变量绑定，不改装配 | Codex |
| PK-4 | web | 不涉及 | 使用服务端返回的前缀 | Codex |

packages/semi-components 不涉及；docs 更新部署说明；后端 docs 与 state 同步配置和路径口径。

## 共享层影响(决定能否并行)

| 类别 | 是否命中 | 说明 |
|---|---|---|
| settings.gradle.kts / BOM | ☐ | 不改模块与依赖 |
| framework 错误码/分页契约 | ☐ | 不改公共响应 |
| weiran-app/build.gradle.kts | ☐ | 不改装配 |
| 页面 / 菜单 | ☐ | 不改前端路由与菜单 |
| Flyway / build-logic | ☐ | 无数据迁移与质量规则修改 |

## 横切关注点

| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 | ☐ | 沿用登录上传与资源库删除权限 |
| CC-2 菜单 | ☐ | 无页面改动 |
| CC-3 数据范围 | ☐ | 无新增数据范围 |
| CC-4 多租户 | ☐ | 无租户能力 |
| CC-5 审计日志 | ☐ | 无写接口变更 |
| CC-6 字段脱敏 | ☐ | 不新增凭据与日志 |
| CC-7 幂等 | ☐ | 沿用禁止覆盖策略与删除重试 |
| CC-8 导出 / 任务中心 | ☐ | 批处理存储不变 |
| CC-9 工作流绑定 | ☐ | 无审批引擎改动 |

## Dependencies

- 产品/设计：默认 media，部署可配置；L3 审阅后实现。
- 后端：system infrastructure 现有存储端口。
- 前端：无变更。
- 数据库变更：无。
- 运维/配置：WEIRAN_STORAGE_ALIYUN_FOLDER，默认 media。
- 测试：配置默认值、定制前缀、授权、非法目录、历史删除与越界防护。

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 新目录不能登记 | 仍只认 media 正则 | 修改结构校验并验证用户票据 |
| 历史对象不能删除 | 校验绑定当前目录 | 允许已登记历史对象的安全结构，不修改对象名 |
| 缓存授权跨配置切换 | 客户端授权未过期 | 保留原签名票据前缀验收 |

## Review Checklist

- [x] 范围和非目标与 interview 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和回退策略已明确：默认无行为变化，回退 folder 仅影响后续新上传

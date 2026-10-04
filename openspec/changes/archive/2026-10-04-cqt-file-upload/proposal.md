---
title: "cqt-file-upload：前台文件上传（阿里云 OSS）"
owner: "zhaody901@gmail.com"
status: "done"
created_at: "2026-10-05"
updated_at: "2026-10-05"
---

# Proposal

## Why

- 背景：uniapp 的学校认证材料、作品 zip、批量导入 Excel 都靠 `/api-web/local-files/upload` 上传，后端还没有这个接口。
- 业务目标：提供上传能力，文件存阿里云 OSS，供学校认证与「赛事与报名」切片使用。
- 当前问题：无上传接口；FastAPI 版不要求登录、存本地磁盘。
- 需求来源：见 `interview.md`

## What Changes

- 新增：`POST /api-web/local-files/upload`（需登录）；文件存储端口 + OSS 实现（流式）+ 本地实现（开发 / 测试）；`CqtErrors` 两个码；multipart 配置（1GB、延迟解析）。
- 改造：`PortalExceptionAdvice` 对超大文件给出明确提示；uniapp 学校注册页隐藏两个上传项并提示注册后补交。
- 复用（来自 `explore.md` 的可复用点）：`/api-web` 底座、阿里云配置校验风格、下游依赖清单。
- 下线/不做：见 Out of Scope。

## Scope

### In Scope

- 上传接口、校验（非空 / 白名单 / 1GB）、对象命名
- OSS 存储（公共读 + UUID 名）与本地存储（仅开发 / 测试）
- uniapp 学校注册页调整
- 部署文档

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- OSS 前端直传、分片 / 断点续传
- 私有 Bucket 与签名 URL
- 旧文件迁移（`admin.cqtxj.org.cn/storage/...` 等旧地址）——另开 change
- 文件删除、替换旧文件、孤儿文件清理
- 文件内容校验（病毒扫描、zip 内容检查、图片真伪）
- 上传接口限流（已改为必须登录；登录用户滥用另行处理）
- uniapp 中 Dcat 时代的旧上传入口 `upload/image`、`Upload/file`
- 修改任何上游文件

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `cqt-file-storage` | ADDED | 前台文件上传：登录要求、类型与大小限制、对象命名、存储后端（OSS / 本地 / 未配置）与返回字段 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 新增/改造跨模块错误码、分页契约 | 不动 | — |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 新增/改造账号、RBAC、JWT 登录相关能力 | 不动；改动在 `weiran-cqt-*` | zhaody901@gmail.com |
| PK-3 | `weiran-app` | 新增模块依赖聚合(通常只在新增整个模块时才动) | 不改已有文件；下游自有测试 `CqtFileUploadIT` 与测试配置 | zhaody901@gmail.com |
| PK-4 | `web` | 新增/改造 page、hook、组件 | 不动（uniapp 注册页另改，不属 `web`） | — |

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☑ | 间接：OSS SDK 版本登记在下游清单，不改 BOM |
| `weiran-common` 的错误码/分页契约 | ☐ | 新码在 `CqtErrors` |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 自动 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 无后台页面 |

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 前台接口，只要求前台登录 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 无 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☑ | 对象名带上传者账号 ID，便于追溯；读取为公共读（用户决定） |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☑ | 每次上传记 info 日志：账号 ID、对象名、大小、原始文件名；不入库 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☑ | OSS AccessKey Secret 不进日志与异常 |
| CC-7 幂等 (`idempotency`,尚未引入) | ☐ | 每次上传生成新对象名，重复上传产生新文件（孤儿清理不做） |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

## Dependencies

- 产品/设计：用户准备公共读 Bucket 与只授该 Bucket 写权限的 RAM 子账号 AccessKey
- 后端：`com.aliyun.oss:aliyun-sdk-oss:3.18.5`（登记在下游依赖清单）
- 前端：uniapp `register.vue` 调整
- 数据库变更：无
- 运维/配置：`WEIRAN_CQT_STORAGE_MODE=oss` 与 `WEIRAN_CQT_OSS_*`；反向代理请求体 ≥ 1GB、读超时放宽
- 测试：单测（假 OSS 客户端）+ 集成（`mode=local`）+ 人工真实上传

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| SDK 传递依赖偏离框架版本 | 构建 | 查来源；排除优先，白名单需理由 |
| 代理拦截大文件 | 部署 | 文档写明代理配置 |
| 临时目录占满 | 并发大文件 | 临时目录放大盘 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

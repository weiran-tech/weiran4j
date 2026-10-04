---
title: "cqt-sms-aliyun：短信验证码接入阿里云"
owner: "zhaody901@gmail.com"
status: "done"
created_at: "2026-10-04"
updated_at: "2026-10-04"
---

# Proposal

## Why

- 背景：`cqt-portal-account` 做完了前台账号，但短信只有开发模式；生产默认 `disabled`，注册、验证码登录、重置密码都不可用（`cqt_portal_accounts.md#05`）。
- 业务目标：用阿里云短信发送验证码，让前台账号功能可以上线；同时防止被人批量换号刷短信费。
- 当前问题：没有真实发送实现；发送失败时已生成的验证码不回滚、会占用冷却；只有「同号 60 秒」限制，不防跨号码刷量。
- 需求来源：见 `interview.md`

## What Changes

- 新增：阿里云发送实现（官方 SDK，`mode=aliyun`）；按客户端 IP 的每小时发送上限；`CqtErrors.SMS_SEND_FAILED`；`server.forward-headers-strategy: native`。
- 改造：`SmsSender` 返回发送结果（成功 / 频控 / 号码非法 / 失败）；`SmsService#send` 接收客户端 IP；发送失败回滚验证码。
- 复用（来自 `explore.md` 的可复用点）：短信端口与条件注册、Caffeine、`CqtErrors.SMS_TOO_FREQUENT`、`Phones.mask`。
- 下线/不做：见 Out of Scope。

## Scope

### In Scope

- 阿里云 SendSms 发送、配置校验（启动失败）、失败分类与回滚
- 同一客户端 IP 每小时发送上限（默认 10）
- 可信客户端 IP（Tomcat 原生转发头处理）
- 依赖版本登记到上游扩展点指定的下游文件
- 部署文档

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 自签名 HTTP 实现（用户选官方 SDK）
- 国际短信、批量发送、短信回执查询（QuerySendDetails）
- 多实例共享的 IP 计数与验证码存储（仍是进程内）
- 图形验证码 / 人机校验
- 修改上游文件（依赖版本登记靠上游扩展点，由 weiran4j 会话完成）

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `cqt-sms-verification` | MODIFIED + ADDED | 发送接口增加 IP 上限与发送失败语义（FR-001 修改）；新增阿里云发送（FR-004）与 IP 上限（FR-005） |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 新增/改造跨模块错误码、分页契约 | 不动 | — |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 新增/改造账号、RBAC、JWT 登录相关能力 | 不动；改动在 `weiran-cqt-*` | zhaody901@gmail.com |
| PK-3 | `weiran-app` | 新增模块依赖聚合(通常只在新增整个模块时才动) | 不改已有文件；下游自有测试 `CqtAccountIT` 增用例 | zhaody901@gmail.com |
| PK-4 | `web` | 新增/改造 page、hook、组件 | 不动 | — |

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☑ | 间接：新依赖版本经上游新扩展点登记在下游文件，不改 BOM 本身；**前置依赖**上游 `downstream-dependency-versions` |
| `weiran-common` 的错误码/分页契约 | ☐ | 新码在 `CqtErrors` |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 自动 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 无页面 |

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 前台公开接口 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 无 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ | 不涉及 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☑ | 每次发送记 info / warn 日志：手机号掩码、阿里云 `Code`、`RequestId`、客户端 IP；不入库 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☑ | AccessKey Secret、验证码不得进日志；手机号只记掩码 |
| CC-7 幂等 (`idempotency`,尚未引入) | ☑ | 阿里云 SendSms 不幂等：关闭 SDK 自动重试；发送失败回滚验证码，由用户手动重发 |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

## Dependencies

- 产品/设计：阿里云控制台已审核通过的短信签名与验证码模板（模板变量 `${code}`、正文有效期 10 分钟）——由用户准备
- 后端：**上游 weiran4j `downstream-dependency-versions` 合入 main 并同步到 mono4j**；`com.aliyun:dysmsapi20170525:4.6.0`
- 前端：不改
- 数据库变更：无
- 运维/配置：`WEIRAN_CQT_SMS_MODE=aliyun`、`WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_ID`、`WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_SECRET`、`WEIRAN_CQT_SMS_ALIYUN_SIGN_NAME`、`WEIRAN_CQT_SMS_ALIYUN_TEMPLATE_CODE`；反向代理在内网并设置 `X-Forwarded-For`
- 测试：单测（假 SDK 客户端）+ 集成（IP 上限）+ 人工真实发送

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 上游扩展点未合入 | — | 本 change 实现阶段等待，不临时改上游 |
| 反向代理不在内网 | 部署拓扑 | 全站共用一个 IP 计数；部署文档写明，可配 `internal-proxies` |
| SDK 传递依赖冲突 | 构建 | L7 全量构建；必要时在下游依赖清单约束 |
| 凭据泄露 | 人工验收 | 只用本地环境变量，不入库、不进日志 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

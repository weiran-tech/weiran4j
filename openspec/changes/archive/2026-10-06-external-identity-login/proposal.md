---
title: "外部身份登录(CAS + OIDC)"
owner: "多厘"
status: "draft"
created_at: "2026-10-06"
updated_at: "2026-10-06"
---

# Proposal

## Why

- 背景:路线图第 2 期。D-014 已经把认证拆成三段,并定下「外部身份统一经 `sys_user_identity` 绑定表映射到本地用户」的方向;上上个 change 已经备好 `AuthService.authenticate` 与 Cookie 交付机制。
- 业务目标:后台能接入单位已有的统一身份(CAS 或任意标准 OIDC 提供方,如 Keycloak / IDaaS),用户不必再记一套密码;管理员能控制谁能进、以什么角色进。
- 当前问题:只有用户名密码登录。
- 需求来源:见 `interview.md`。

## What Changes

- 新增:
  - `sys_user_identity` 表与领域模型;
  - `ExternalIdentityVerifier` 端口及 CAS、OIDC 两个实现;
  - 外部登录 / 绑定流程(authorize → callback,签名 Lax 流程 Cookie);
  - 自动建号(按提供方开关);
  - 密码登录开关(内置超管应急);
  - 新接口:providers、sso、本人身份、管理员操作身份;
  - 三个错误码;
  - 按钮权限 `system:user:identity`;
  - 前端外部登录入口、个人中心绑定、用户管理绑定;
  - D-015。
- 改造:
  - 抽出登录收尾逻辑,密码登录与外部登录共用;
  - JWT 增加 `idp` claim;
  - `/me` 增加 `hasPassword`;
  - 登出响应改为 `{ssoLogoutUrl}`;
  - 删除用户时连带删除其绑定;
  - 锁屏、改密码对无本地密码用户的处理;
  - `AGENTS.md` 门禁 ③ 的过期说明。
- 复用:`authenticate`、`AuthCookies`、`JwtTokenCodec`、登录日志、Testcontainers、jjwt 的 JWK 支持。
- 下线/不做:见 Out of Scope。

## Scope

### In Scope

- CAS 3.0、OIDC 授权码 + PKCE 登录
- 绑定表、预先绑定与自动建号
- 管理员 / 本人的绑定管理
- 无本地密码的用户
- 密码登录开关
- 前端入口与提示
- 契约、部署文档、`.env.example`、state、`AGENTS.md`(含门禁 ③ 的修正)

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 不做后端通道单点登出(CAS logoutRequest、OIDC back-channel logout)。
- 不做提供方的后台管理界面和数据库配置。
- 不做钉钉、企业微信、飞书等非标准协议(它们以后可以作为 OIDC 或单独的 `ExternalIdentityVerifier` 实现接入)。
- 不做联邦令牌(路线图第 3 期):外部登录换的仍是本地 JWT。
- 不做 SAML。
- 不从外部身份同步部门、角色等组织信息(自动建号只给默认角色)。
- 不改 `sys_login_log` 表结构。
- 不做「记住外部身份提供方选择」、自动跳转 IdP(登录页始终先显示)。

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `external-identity` | ADDED | 长期负责「用外部身份提供方的账号登录本系统」:提供方配置与发现、协议流程(CAS / OIDC)、外部身份与本地用户的绑定与开通、无本地密码用户、密码登录开关、外部登出 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` / `weiran-framework` | 改造 | common:三个错误码;framework:`AuthCookies` 增加流程 Cookie 的生成与清除 | 多厘 |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 新增 / 改造 | 主体实现 + Flyway 迁移 | 多厘 |
| PK-3 | `weiran-app` | 改造 | `application.yml` 提供方配置、集成测试(Keycloak / 模拟 CAS) | 多厘 |
| PK-4 | `web` | 改造 | 登录页、个人中心、用户管理、锁屏、`useAuth` | 多厘 |

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☐ | 不新增模块、不加依赖 |
| `weiran-common` 的错误码/分页契约 | ☑ | 新增 `40102`、`40303`、`40304` → Layer 0 |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 不改构建脚本 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 不新增页面;菜单只加一个按钮权限行(Flyway,SL-4,Layer 0) |

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☑ | 新增 `system:user:identity`(`sys_menu` 按钮行 id 120,挂在用户管理下);本人的绑定 / 解绑只需登录 |
| CC-2 菜单(前端硬编码,无后端表) | ☑ | 只新增按钮行,不新增菜单页面 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ | 不涉及 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☑ | 外部登录成功和失败都写登录日志;管理员绑定 / 解绑、本人解绑标 `@OperationLog`;本人绑定是 GET 回调,不经过切面,由流程写一条操作日志 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☑ | ticket、code、id_token、client_secret 不进日志、登录日志和错误信息;管理员手工绑定的请求体没有敏感字段 |
| CC-7 幂等 (`idempotency`,尚未引入) | ☑ | 绑定靠 `(provider, external_id)` 唯一键兜底(冲突返回 40901);自动建号在并发首次登录时可能撞唯一键,捕获后按已绑定重试一次 |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

## Dependencies

- 产品/设计:登录页外部登录按钮、个人中心「外部账号」卡片、用户管理的外部身份区域
- 后端 / 前端:无新依赖
- 数据库变更:`V202610060001__system_user_identity.sql`(新表 + 菜单按钮行)
- 运维/配置:
  - `WEIRAN_PUBLIC_BASE_URL`、`WEIRAN_PASSWORD_LOGIN_ENABLED`;
  - 每个提供方的 `client_id` / `client_secret` 环境变量;
  - IdP 侧需要登记回调地址。
- 测试:Keycloak 容器(OIDC)、JDK HttpServer(模拟 CAS)、真实浏览器

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 账号被冒名接管 | IdP 用户名与本地已有用户同名 | 不自动关联同名用户;只认 `(provider, external_id)` |
| 开放重定向 | `redirect` 参数被篡改 | 只接受站内相对路径 |
| 登录 CSRF / 授权码注入 | 攻击者诱导回调 | state + PKCE + nonce;签名流程 Cookie |
| 账号锁死 | 无本地密码用户解绑最后一个外部身份 | 禁止解绑,提示管理员重置密码 |
| IdP 故障 | 外部登录不可用 | 关闭密码登录时仍保留内置超管的应急入口 |
| Keycloak 集成测试慢 | CI | 单独测试类、共享容器;耗时记进 verify |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

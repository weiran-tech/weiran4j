---
title: "外部身份登录 · 现实校验"
status: "done"
updated_at: "2026-10-06"
---

# Explore

> **L1 · 现实校验**。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-common` | `error/CommonErrors.java` | 三个新错误码 |
| `weiran-framework` | `auth/{AuthCookies,AuthInterceptor}.java` | 签名流程 Cookie、公开接口 |
| `weiran-base-domain` | `auth/*`、`user/{User,UserRepository}.java` | 外部身份端口、无密码用户 |
| `weiran-base-application` | `auth/AuthApplicationService.java`、`user/UserApplicationService.java` | 登录 / 建号 / 删除用户连带解绑 |
| `weiran-base-infrastructure` | `security/JwtTokenCodec.java`、`persistence/MybatisUserRepository.java`、`db/migration/system/*` | `idp` claim、表、菜单 |
| `weiran-base-adapter` | `web/{AuthController,UserController}.java` | 新接口 |
| `weiran-app` | `application.yml`、测试 | 提供方配置、Keycloak / 模拟 CAS 集成测试 |
| `web` | `pages/{login/LoginPage,profile/ProfilePage,system/users/UsersPage}.tsx`、`components/LockScreen.tsx`、`hooks/useAuth.ts`、`types/api.ts` | 前端入口 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 只校验凭据 | `AuthApplicationService.authenticate` | 已有(上上个 change);`login` 复用它 |
| 签发令牌 | `JwtTokenCodec.issue(TokenClaims)` | `TokenClaims(userId, username, version)`,没有 `idp` |
| Cookie 交付 | `AuthCookies.issue/clear`;`AuthController.login` | 已有 |
| 用户密码列 | `V202609260001__system_init_schema.sql`:`password varchar(100) not null` | **非空**,无密码用户只能用空串表示 |
| BCrypt 对空哈希 | `BCryptPasswordHasher.matches` | 返回 false 并打一条 warn(「Empty encoded password」),需要在领域层先判 `hasPassword` |
| 删除用户 | `MybatisUserRepository.deleteById:193` | 先删 `sys_user_role` 再删用户;没有外键,删用户时要连带删除绑定 |
| 种子菜单 | `V202609260002`:用户管理 id 3,按钮 100–103;基座最大 id 119 | 新按钮用 120 |
| 超管授权 | `super_admin` 放行一切 | 新权限码不需要写进 `sys_role_menu` |
| jjwt JWK 支持 | `jjwt-api-0.13.0.jar`:`Jwks`、`JwkSet`、`JwkSetParserBuilder`、`Locator` | 可以解析 JWKS 并按 `kid` 选公钥验签,**不需要新依赖** |
| 前端页面 | `LoginPage.tsx`(121 行)、`ProfilePage.tsx`(128)、`UsersPage.tsx`(506)、`LockScreen.tsx`(179) | 都需要改造 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `AuthApplicationService` 的登录收尾(`recordLogin` → 签发 → 成功日志) | 同上 | 抽成私有方法,密码登录和外部登录共用 | 是:抽方法 |
| `AuthCookies` | framework | 外部登录同样下发认证 Cookie;新增 `weiran_sso` 签名 Cookie 的生成和清除 | 是:加方法 |
| `UserApplicationService` 建用户的校验(用户名规则) | application | 自动建号复用用户名规则 | 视实现而定 |
| `ClientIpResolver` / `appendLog` | — | 外部登录的登录日志 | 否 |
| Testcontainers | `weiran-app` 测试已有 | Keycloak 用 `GenericContainer` | 否 |

## 真实约束

| 约束 | 证据 | 对设计的影响 |
|---|---|---|
| `password` 列非空 | 建表脚本 | 无密码用户写 `''`;`User.hasPassword()` 判空;`authenticate` 遇到空哈希时仍对 `DUMMY_HASH` 跑一次 BCrypt(保持耗时一致),然后返回 40101 |
| 认证 Cookie 是 `SameSite=Strict` | D-014 | IdP 回调是跨站发起的导航,`weiran_token` 带不上;bind 模式的当前用户必须放进 Lax 的签名流程 Cookie |
| CAS 验票要求 `service` 完全一致 | CAS 协议 | `service` = 公开回调地址 + `?state=…`;公开地址从配置读(`weiran.auth.public-base-url`),不从请求头推断,避免 Host 头注入 |
| 依赖方向 CP-12 / CP-13 | 宪法 | 外部身份校验放在基座(domain 端口 + infrastructure 实现);框架只提供 Cookie 工具 |
| 不引入 Spring Security | D-014 第 4 条 | OIDC 自己实现授权码 + PKCE |
| 拦截器只放行 `@PublicApi` | `AuthInterceptor` | authorize / callback / providers 标 `@PublicApi`;GET 不查 CSRF |
| `/me` 契约 | 契约 §6.1 | 增加 `hasPassword`(只加字段) |
| 登出响应 `data` 现为 null | 契约 §6.1 | 改为 `{ssoLogoutUrl}`:前端现在不读它,改了无害 |
| 访问日志会记路径 | `RequestIdFilter` | 回调路径不含敏感值(code / ticket 在查询串里,访问日志不记查询串),满足 CP-9 |

## 影响面

### 普通改动

见 interview「要做」;按模块分:
- domain:`identity` 包(`UserIdentity`、`UserIdentityRepository`、`ExternalIdentity`、`ExternalIdentityVerifier` 端口)、`User.hasPassword()`;
- application:`ExternalLoginService`(流程编排)、`AuthApplicationService` 抽方法并加密码登录开关;
- infrastructure:`CasVerifier`、`OidcVerifier`(+ discovery / JWKS 缓存)、`MybatisUserIdentityRepository`、迁移、`SsoStateCodec`;
- adapter:`SsoController`、`AuthController` / `UserController` 新端点;
- web:四个页面 + hooks + types。

### 共享层命中 ⚠️

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 全仓单点 | 未命中 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM | 未命中(不加依赖) |
| SL-3 | `weiran-app/build.gradle.kts` | 应用依赖 | 未命中(Testcontainers 的 `GenericContainer` 已在测试依赖里) |
| SL-4 | Flyway 种子菜单 | 菜单 id 与版本号是全局序号 | **命中**:`V202610060001__system_user_identity.sql`,`sys_menu` id 120 → Layer 0 |
| SL-5 | `web/src/pages/**` 与 `page-registry.ts` | 页面配对 | 未命中:不新增页面,只改现有页面 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `CommonErrors.java` | 跨模块错误码 | **命中**:`40102`、`40303`、`40304` → Layer 0 |
| SL-7 | `{page,response}/*` | 包络 | 未命中 |

#### 序号型资源

| 资源 | 是否命中 |
|---|---|
| Flyway 版本号 | **命中**:`V202610060001`(当前最大 `V202609270001`) |
| `sys_menu` id | **命中**:120(契约 §2.1 的用量从 119 改为 120) |

#### 被 2 个以上执行单元读取的(读也要先冻结)

| 对象 | 读取方 | 处理 |
|---|---|---|
| 新接口与 DTO(`providers`、`identities`、`/me.hasPassword`、登出 `ssoLogoutUrl`、`ssoError` 取值) | 后端、前端、集成测试 | Layer 0 冻结(契约先行) |
| 配置键 `weiran.auth.providers.*`、`weiran.auth.public-base-url`、`weiran.auth.password-login.enabled` 及对应环境变量 | 后端、`.env.example`、部署文档、Keycloak 集成测试 | Layer 0 冻结 |

## 本次不会碰的目录

- `weiran4j/weiran-base/**/platform/**`
- `weiran4j/build-logic/**`、`weiran-dependencies/**`、`settings.gradle.kts`
- 已有的 Flyway 脚本(只追加)
- `web/src/layouts/**` 的布局(登出跳转在 `useAuth` 里处理)
- `.github/workflows/**`

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 「自动建出的用户没有本地密码」 | `password` 列非空 | 用 `''` 表示;`hasPassword` 判空;不改表结构 | ☑(不改变需求,只是实现方式;interview 原文成立) |
| 回调地址 | CAS `service` 必须完全一致,不能信任 Host 头 | 新增配置 `weiran.auth.public-base-url`(对外访问地址,例如 `https://admin.example.com`) | ☑ 写进 design 与 `.env.example`(`WEIRAN_PUBLIC_BASE_URL`) |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| Keycloak 容器启动慢 | 集成测试 | 单独的测试类,只起一次容器;import realm JSON;超时 3 分钟 |
| Keycloak 镜像大、拉取慢 | CI | CI runner 有 Docker,可以拉取;耗时记进 verify |
| IdP 回调地址必须预先登记 | 部署 | 部署文档列出回调地址的格式 |
| JWKS 轮换 | IdP 更换密钥 | 按 `kid` 查不到时刷新一次 JWKS 缓存 |
| OIDC 时钟偏差 | 服务器时间不准 | id_token 校验允许 60s 偏差 |

## Gate

- [x] 共享层命中已完整列出
- [x] 与 interview 的冲突项已回写
- [x] 可复用点已确认

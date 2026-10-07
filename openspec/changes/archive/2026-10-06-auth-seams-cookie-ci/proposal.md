---
title: "认证三段式拆分 + HttpOnly Cookie + CI"
owner: "多厘"
status: "draft"
created_at: "2026-10-05"
updated_at: "2026-10-05"
---

# Proposal

## Why

- **背景**:同一会话评估过「本系统支持 CAS / 联邦令牌 / 自研 IAM」,结论是这些方向都要先过一道共同的结构改造;排查时在现有代码里核出 7 条问题(见 `interview.md` 澄清记录 #1)。
- **业务目标**:
  - 不引入任何新身份源,只把认证链路整理成能接新身份源的形状;
  - 补上实际存在的安全缺口:多节点吊销窗口、令牌可被 XSS 读走;
  - 补上缺失的 CI 门禁。
- **当前问题**:
  - JWT 没有 `iss`/`aud`,无法按签发方区分令牌。
  - `SystemTokenAuthenticator` 把验令牌、认身份、定权限三件事揉在一个类里。
  - `AuthService` 没有「只校验凭据」的入口。
  - 宪法 CP-8 的措辞会挡住将来的联邦令牌。
  - 吊销判断走进程内 30s 缓存(artifact.md#02)。
  - 令牌存在 `localStorage`。
  - 没有 CI(artifact.md#05)。
- **需求来源**:见 `interview.md`。

## What Changes

- **新增**:
  - `weiran-base-domain` 的认证端口 `TokenVerifier` / `IdentityResolver` / `PermissionSource`;
  - 按 `iss` 分发的 `DispatchingTokenAuthenticator`;
  - `AuthService.authenticate`;
  - 框架层的认证 Cookie 与 CSRF 双提交校验;
  - 错误码 `40302`;
  - `.github/workflows/ci.yml`;
  - 决策记录 D-014。
- **改造**:
  - 本地 JWT 写入并校验 `iss`/`aud`;
  - 配置键 `weiran.system.jwt.*` 改为 `weiran.auth.jwt.*`;
  - 吊销状态每次请求查库;
  - 登录、登出接口的令牌交付方式改为 Cookie,`X-Auth-Mode: token` 时改为响应体;
  - 前端登录态改由 `weiran_csrf` Cookie 驱动;
  - 宪法 CP-8 拆成本地令牌与联邦令牌两部分;
  - 契约 §3 / §4 / §6.1 同步修改。
- **复用**(来自 `explore.md` 的可复用点):
  - `AuthorizationResolver`、`AuthSnapshotCache`(收窄为只缓存权限);
  - `DUMMY_HASH` / `appendLog`;
  - `IntegrationTestSupport.call`;
  - 前端 `useSyncExternalStore` 外部 store 的写法;
  - `jjwt` 原生的 `requireIssuer` / `requireAudience`。
- **下线**:删除 `SystemTokenAuthenticator`;前端的 `TOKEN_KEY`、`tokenUserId`、Authorization 头。

## Scope

### In Scope

- 第 ① 条:`iss` / `aud`、三段式端口、配置键改名
- 第 ② 条:宪法 CP-8 修订
- 第 ③ 条:`AuthService.authenticate`
- 第 ④ 条:D-014
- 第 ⑤ 条:吊销绕过缓存;artifact.md#02 改为部分解决
- 第 ⑥ 条:HttpOnly Cookie + CSRF 双提交 + `X-Auth-Mode` + 同源约定,覆盖前后端、测试、契约
- 第 ⑦ 条:GitHub Actions CI;artifact.md#05 关闭

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 不实现任何外部身份登录(CAS / OIDC / 钉钉),不建 `sys_user_identity` 表,不加 `/api/auth/providers` 接口。
- 不实现联邦令牌校验(JWKS / RS256),不引入 Spring Security 或 Spring Authorization Server,不新增任何 Maven 依赖。
- 不引入 Redis,也不做角色、权限缓存的分布式失效(#02 剩余的 30s 窗口保留)。
- 不加 CORS,不支持前后端跨域部署。
- 不做 refresh token、滑动续期和「记住我」;令牌有效期仍为 `WEIRAN_JWT_TTL`(默认 12h)。
- 不改 springdoc / Swagger UI 的认证方式(它继续用 Bearer 头,local profile 才开)。
- 不配置 GitHub 分支保护规则(artifact.md#12 另案处理);CI 不做部署、不发版、不做缓存以外的优化。
- 不改密码哈希、`PasswordPolicy`、登录日志的表结构;本次没有 Flyway 迁移。

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `admin-foundation` | MODIFIED | 修改 FR-002(登录响应改为 Cookie 交付)与 FR-003(吊销跨实例立即生效);新增令牌签发方校验、令牌交付与携带方式、CSRF 防护、只校验凭据的认证入口四条需求 |
| `continuous-integration` | ADDED | 长期负责「合入主分支前必须由机器跑过哪些门禁」:PR 与 main 推送触发后端 check、前端 lint/test/build、openspec 结构检查 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` / `weiran-framework` | 改造 | common:新增错误码 `40302`;framework:`AuthInterceptor` 支持 Cookie 取令牌和 CSRF 校验,新增 `AuthCookies` / `AuthCookieProperties` | 多厘 |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 改造 | 三段式端口与实现、`iss`/`aud`、吊销绕过缓存、`authenticate`、登录与登出接口下发和清除 Cookie、配置键改名 | 多厘 |
| PK-3 | `weiran-app` | 改造 | 只改 `application.yml` 配置键与集成测试;不改构建脚本 | 多厘 |
| PK-4 | `web` | 改造 | 令牌存储换成 Cookie 会话、请求层加 CSRF 头、登录态与偏好归属、相关测试;不新增页面 | 多厘 |

## 共享层影响(决定能否并行)

> 来源:`explore.md` 的共享层命中清单。

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☐ | 不新增模块,不加依赖(SL-1/SL-2 未命中) |
| `weiran-common` 的错误码/分页契约 | ☑ | SL-6:新增 `CSRF_REJECTED(40302)`;40100/40101 语义不变 → Layer 0 |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | SL-3 未命中,只改 `application.yml` 与测试 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 不新增页面与菜单(SL-4/SL-5 未命中) |

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 不新增权限码;`@RequiresPermission` 的判定逻辑不变,只是权限来源经过 `PermissionSource` 端口(本地 RBAC 实现,结果等价) |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 不新增菜单行;`/api/auth/menus` 行为不变 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ | 尚未引入,本次不涉及 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☑ | 登录日志行为必须保持:`authenticate` 失败写失败日志;`login` 成功写成功日志;登出写登出日志。不新增写接口,不新增 `@OperationLog` |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☑ | 只涉及日志层:CSRF 失败、令牌校验失败的日志**不得**输出令牌、CSRF 值(CP-9);`X-Auth-Mode: token` 的响应体含令牌,同样不进日志 |
| CC-7 幂等 (`idempotency`,尚未引入) | ☐ | 不新增写接口 |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

## Dependencies

- **产品/设计**:无界面变化(登录页、锁屏外观不变)
- **后端**:`jjwt` 0.13(已有);不加新依赖
- **前端**:不加新依赖
- **数据库变更**:无。不新增 Flyway 迁移;`findAuthState` 只读已有的 `token_version`、`status` 列
- **运维/配置**:
  - 配置键改为 `weiran.auth.jwt.{secret,ttl,issuer,audience}`,新增 `weiran.auth.cookie.secure`;
  - 环境变量 `WEIRAN_JWT_SECRET` / `WEIRAN_JWT_TTL` 名称不变,新增可选的 `WEIRAN_JWT_ISSUER` / `WEIRAN_JWT_AUDIENCE` / `WEIRAN_COOKIE_SECURE`;
  - 部署必须同源(反向代理把 `/api` 转到后端);
  - 本次上线后,已签发的令牌全部失效(旧令牌没有 `iss`),需要重新登录。
- **测试**:
  - 后端:单测(端口实现、`JwtTokenCodec`、拦截器 CSRF)与集成测试(Cookie 登录、CSRF、跨实例吊销、`X-Auth-Mode`);
  - 前端:vitest;
  - 真实浏览器走一遍(AC-20)。
- **CI**:需要仓库开启 GitHub Actions(托管 runner,自带 Docker)

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 每次请求多一次主键查询 | 高 QPS | 只查两列、走主键;在 #02 的剩余说明里写明,真成为瓶颈时再换方案 |
| 开发者本地配置失效 | 本地还在用 `weiran.system.jwt.secret` | 启动失败的提示语写新键名;更新 `.example` 文件;契约注明改名 |
| CSRF 校验误伤 | 前端某个写请求没经过 `request.ts` | 前端只有 `request.ts` 一个出口(`http.*`);用单测锁定「写请求带头」 |
| 跨标签页登录态不同步 | 一个标签登出,另一个标签仍显示已登录 | 窗口重新获得焦点时重读 Cookie;即使不同步,下一次请求也会 40100 回到登录页 |
| CI 首跑失败 | runner 环境差异 | 第一次 PR 上观察;不阻塞本 change 的 L7(L7 在本地跑) |
| 已签发令牌全部失效 | 合入后 | 没有下游和生产部署,可以接受;契约里注明 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

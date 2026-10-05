---
title: "认证三段式拆分 + HttpOnly Cookie + CI · 任务"
status: "draft"
updated_at: "2026-10-05"
---

# Tasks

> **本文件是需求的权威源,粒度是「做什么」不是「怎么做」。**
> 两个能力的 FR 编号会撞号,撞号的一律写全名:`admin-foundation/FR-002`、`continuous-integration/FR-001`、`continuous-integration/FR-002`。

## 1. 共享契约层 `weiran-common` / `weiran-framework`(TG-1)

- [x] 1.1 `CommonErrors` 新增 `CSRF_REJECTED(40302, 403)`(FR-011)
- [x] 1.2 `weiran-framework` 新增 `AuthCookies`(Cookie 与请求头名称常量、生成与清除认证 Cookie 和 CSRF Cookie、解析 CSRF 值里的 userId)与 `AuthCookieProperties`(`weiran.auth.cookie.secure`)(FR-010)
- [x] 1.3 `AuthInterceptor`:Bearer 头优先、`weiran_token` Cookie 次之;Cookie 认证的非公开写请求做 CSRF 双提交校验(头值等于 Cookie 值,且 userId 与当前用户一致);自动配置注入 Cookie 配置;`TokenAuthenticator` SPI 签名不变(FR-010、FR-011)
- [x] 1.4 契约 `01-架构与接口契约.md`:
  - §3:认证流程、SPI 说明、吊销口径;
  - §4:40302、同源部署、Cookie / CSRF 约定;
  - §6.1:登录、登出两行,以及 JWT 的 `iss`/`aud` 与配置键说明。

  (FR-003、FR-009、FR-010、FR-011)

## 2. 领域层 `*-domain` / `*-api`(TG-2)

- [x] 2.1 `weiran-base-domain` 新增端口 `TokenIssuerReader`、`TokenVerifier`、`IdentityResolver`、`PermissionSource`,以及值对象 `VerifiedToken`、`AuthState`、`PrincipalSnapshot`;`TokenCodec` 收窄为只负责签发(FR-009)
- [x] 2.2 `UserRepository` 新增 `findAuthState(id)`(FR-003)
- [x] 2.3 `weiran-base-api`:
  - `AuthService` 新增 `authenticate`,返回 `AuthenticatedUser`(FR-012);
  - `LoginResult` 的 `accessToken` 改为可空,新增 `userId`(FR-010)。

## 3. 应用与基础设施层 `*-application` / `*-infrastructure`(TG-3)

- [x] 3.1 `JwtTokenCodec` 签发时写入 `iss`/`aud`,并提供 `TokenVerifier`(校验签名、`exp`、`iss`、`aud`)与 `TokenIssuerReader`(只读、不验签);配置迁移到 `AuthJwtProperties`(`weiran.auth.jwt.secret|ttl|issuer|audience`),密钥不合法时启动失败的提示语改用新键名(FR-009)
- [x] 3.2 `MybatisUserRepository.findAuthState`:只按主键查 `token_version`、`status` 两列(FR-003)
- [x] 3.3 `DispatchingTokenAuthenticator`:按 `iss` 分发,发现重复 issuer 时启动失败;新增 `LocalIdentityResolver`,每次请求查库判定吊销;新增 `LocalRbacPermissionSource`,复用 `AuthorizationResolver`,走 30s 快照缓存;删除 `SystemTokenAuthenticator`;`AuthSnapshotCache` 收窄为只缓存权限快照;更新两层自动配置(FR-003、FR-009)
- [x] 3.4 `AuthApplicationService.authenticate`:保留防枚举、40101 / 40301 和失败日志,不签令牌、不写成功日志;`login` 复用它并返回 `userId`(admin-foundation/FR-002、FR-012)
- [x] 3.5 `application.yml` 改用新配置键;local 示例配置与 `.env.example` 同步,包括 `WEIRAN_JWT_ISSUER`、`WEIRAN_JWT_AUDIENCE`、`WEIRAN_COOKIE_SECURE`(FR-009、FR-010)

## 4. 适配层 `*-adapter`(TG-4)

- [x] 4.1 `AuthController.login`:带 `X-Auth-Mode: token` 时在响应体返回令牌且不写 Cookie;否则写两个 Cookie,响应体不含 `accessToken`(FR-010)
- [x] 4.2 `AuthController.logout`:写登出日志后清除两个 Cookie(FR-010)

## 5. 前端 `web`(TG-5)

- [x] 5.1 `utils/token.ts` 替换为 `utils/session.ts`,包含:
  - 读取 `weiran_csrf`;
  - `useSession` / `getSession` / `sessionUserId`;
  - `clearSession` / `refreshSession`;
  - 窗口 focus / visibilitychange 时重读(用于跨标签页同步)。

  (FR-010)
- [x] 5.2 `utils/request.ts`:去掉 `Authorization` 头,使用 `credentials: 'same-origin'`;写请求带 `X-CSRF-Token`;会话失效时调用 `clearSession`;40302 按普通错误处理(FR-010、FR-011)
- [x] 5.3 `useAuth`、`hooks/queries/auth.ts`、`PreferencesProvider` 改由会话驱动:是否登录、query key、偏好归属;登录成功后调用 `refreshSession`(FR-010)
- [x] 5.4 `types/api.ts` 的 `LoginResult` 同步契约(`accessToken?`、`userId`)(FR-010)
- [x] 5.5 `vite.config.ts` 拒绝绝对地址的 `VITE_API_BASE_URL`,并同步 `config.ts` 的注释(FR-010)

## 6. 工程与文档

- [x] 6.1 新增 `.github/workflows/ci.yml`:PR 与推送 main 时触发,包含 backend(JDK 21 `./gradlew check`)、web(`pnpm lint`/`test`/`build`)、openspec(`node openspec/check.mjs`)三个 job(continuous-integration/FR-001、continuous-integration/FR-002)
- [x] 6.2 修订宪法 CP-8:本地令牌条款补「不经过缓存」;新增联邦令牌条款(FR-003)
- [x] 6.3 `00-决策记录.md` 新增 D-014(FR-009)
- [x] 6.4 `state/bizs/artifact.md`:#02 改为「部分解决」并写明剩余的权限 30s 窗口;#05 移入 §7 changelog,注明由本 change 关闭(FR-003、continuous-integration/FR-002)

## 7. 测试

- [x] 7.1 framework 单测覆盖以下情况(FR-010、FR-011):
  - 拦截器:Bearer 优先、Cookie 认证;
  - CSRF 返回 40302 的三种原因:缺头、值不等、userId 不符;
  - 不做 CSRF 校验的情况:GET、Bearer 认证、公开接口;
  - `AuthCookies` 的各项属性,以及 `Secure` 开关。
- [x] 7.2 base 单测覆盖以下情况(admin-foundation/FR-002、FR-003、FR-009、FR-012):
  - 分发器:按 iss 分发、未知 iss、重复 issuer;
  - `LocalIdentityResolver`:版本不符、禁用、用户不存在;
  - `authenticate`:成功、两类 40101、40301、失败日志;
  - `JwtTokenCodec` 的 `iss`/`aud`;
  - `TokenIssuerReader` 遇到异常输入。
- [x] 7.3 集成测试:登录 helper 改用令牌模式,现有 IT 全部通过;新增 `CookieAuthIT`,覆盖 FR-009、FR-010、FR-011 的各个场景,以及 FR-003「直接改库吊销」的 `token_version` 与 `status` 两种(admin-foundation/FR-002、FR-003、FR-009、FR-010、FR-011)
- [x] 7.4 前端测试:新增测试 helper;`session.test.ts`;`request.test.ts` 覆盖带 CSRF 头、40100 清会话、40302 不清会话;`LoginPage`、`PreferencesProvider` 及其余受影响的测试改用 helper 并通过(FR-010、FR-011)
- [x] 7.5 手动验证:`VITE_API_BASE_URL=https://x pnpm build` 失败;`ci.yml` 通过 actionlint 或 YAML 解析;真实浏览器走一遍登录 → 刷新 → 改资料 → 锁屏解锁 → 登出(FR-010、FR-011、continuous-integration/FR-002)

## 8. 发布

- [x] 8.1 配置迁移说明:`weiran.system.jwt.*` 改为 `weiran.auth.jwt.*`,环境变量名不变;部署必须同源;旧令牌全部失效。写进契约和 D-014

## 9. 上线后

- [x] 9.1 验收记录写入 `artifacts.md`(只写 verify.md 里没有的内容:给人读的摘要、真实浏览器验证、首次 CI 运行情况、已知缺口)

---
title: "认证三段式拆分 + HttpOnly Cookie + CI · 现实校验"
status: "done"
updated_at: "2026-10-05"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-common` | `error/CommonErrors.java` | 第 ⑥ 条要新增 CSRF 错误码 40302 |
| `weiran-framework` | `auth/{AuthInterceptor,TokenAuthenticator,LoginUser}.java`、`autoconfigure/WeiranFrameworkAutoConfiguration.java` | 令牌提取、CSRF 校验、拦截器装配 |
| `weiran-base-*` | `domain/auth/*`、`domain/user/UserRepository.java`、`application/auth/*`、`infrastructure/security/*`、`infrastructure/autoconfigure/*`、`adapter/web/AuthController.java` | 三段式拆分、`iss`/`aud`、吊销绕过缓存、`authenticate`、下发 Cookie |
| `weiran-app` | `src/main/resources/application.yml`、`src/test/java/com/weiran/app/{IntegrationTestSupport,AuthIT}.java` | 配置键改名;集成测试的登录方式 |
| `web` | `src/utils/{token,request}.ts`、`src/hooks/{useAuth,PreferencesProvider}.tsx`、`src/hooks/queries/auth.ts`、`src/config.ts`、`vite.config.ts`、相关 `__tests__` | 令牌存储、请求头、登录态、偏好归属 |
| 文档 / 流水线 | `weiran4j/docs/{00-决策记录,01-架构与接口契约}.md`、`openspec/rules/enforced/constitution.md`、`openspec/state/bizs/artifact.md` | D-014、契约、CP-8、#02/#05 |
| 仓库根 | `.github/`(不存在)、`package.json`、`openspec/project.json` | CI 要跑的命令 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 令牌提取 | `weiran-framework/.../auth/AuthInterceptor.java:69-91` | 只读 `Authorization: Bearer`;没有 Cookie 分支 |
| 认证与权限检查 | `AuthInterceptor.java:38-53` | 认证 → 非 `@PublicApi` 时要求登录 → 检查 `@RequiresPermission` → 通过后才写入 `CurrentUser` |
| SPI | `weiran-framework/.../auth/TokenAuthenticator.java:10-19` | `Optional<LoginUser> authenticate(String bearerToken)` |
| 拦截器装配 | `WeiranFrameworkAutoConfiguration.java:104-115` | `ObjectProvider<TokenAuthenticator>.getIfAvailable()`,只认一个实现 |
| 令牌校验实现 | `weiran-base-application/.../auth/SystemTokenAuthenticator.java:47-72` | 解析 → `AuthSnapshotCache.get(userId)` → 用**缓存里**的 `enabled`/`tokenVersion` 过滤 → 组装 `LoginUser`。吊销判断也走缓存,这正是 #02 的根因 |
| 快照缓存 | `.../auth/AuthSnapshotCache.java:20-27` | Caffeine,`expireAfterWrite` 30s,最多 1 万条;`evict` / `evictAll` 只作用于本进程 |
| JWT 编解码 | `weiran-base-infrastructure/.../security/JwtTokenCodec.java:27-99` | HS256;载荷只有 `sub`/`username`/`ver`/`iat`/`exp`;解析时不校验 `iss`/`aud` |
| 令牌声明 | `weiran-base-domain/.../auth/TokenClaims.java` | `record TokenClaims(long userId, String username, int version)` |
| 编解码端口 | `weiran-base-domain/.../auth/TokenCodec.java` | `issue` / `parse` / `ttl` |
| 安全配置 | `weiran-base-infrastructure/.../security/SystemSecurityProperties.java:13` | `@ConfigurationProperties("weiran.system")`,包含 `jwt.secret|ttl` 与 `bcryptStrength` |
| 配置值 | `weiran-app/src/main/resources/application.yml:28-34` | `weiran.system.bcrypt-strength` 与 `weiran.system.jwt.{secret,ttl}` |
| JWT Bean | `SystemInfrastructureAutoConfiguration.java:40-44` | `tokenCodec(properties, clock)` |
| 应用层装配 | `SystemApplicationAutoConfiguration.java:22-33` | `@Import` 包含 `SystemTokenAuthenticator`、`AuthSnapshotCache` |
| 登录 | `AuthApplicationService.java:100-123` | 查用户 → BCrypt(不存在时用 `DUMMY_HASH`)→ 失败写日志并抛 40101 → 禁用写日志并抛 40301 → `recordLogin` → 签发令牌 → 写成功日志 |
| 登录接口 | `AuthController.java` `login()` | `@PublicApi`,返回 `LoginResult(accessToken, tokenType, expiresIn)` |
| 用户仓储 | `weiran-base-domain/.../user/UserRepository.java:16-61` | 有 `findById`、`revokeTokens`;没有轻量的「只取吊销状态」查询 |
| 错误码 | `weiran-common/.../error/CommonErrors.java:9-33` | 40300 / 40301 已占用;40302 空闲 |
| 集成测试登录 | `weiran-app/src/test/.../IntegrationTestSupport.java:69-111` | `tokenOf` 从响应体 `data.accessToken` 取令牌,`call` 时用 `setBearerAuth` 发送;6 个 IT 类全部经过这里 |
| 前端令牌存储 | `web/src/utils/token.ts:9-55` | `localStorage['weiran_token']`;`useToken` 用 `useSyncExternalStore` 实现;跨标签页靠 `storage` 事件;`tokenUserId` 解析 JWT 的 `sub` |
| 前端请求层 | `web/src/utils/request.ts:46-91` | 每个请求都加 `Authorization: Bearer`;会话失效时 `clearToken()` |
| 登录态消费方 | `web/src/hooks/useAuth.ts:17-33`、`hooks/queries/auth.ts:20,30,55,71`、`hooks/PreferencesProvider.tsx:21-65` | `token` 用作「是否登录」、query key 的一部分;`tokenUserId(token)` 用作偏好缓存的归属 |
| 前端接口前缀 | `web/src/config.ts:3` | `VITE_API_BASE_URL \|\| ''`,可以填绝对地址(但后端没有 CORS,填了也跑不通) |
| CORS | 全仓搜索 `cors` 无结果 | 后端没有任何 CORS 配置,事实上已是同源部署 |
| CI | `.github/` 不存在 | 门禁 ③ 缺失 |
| L7 命令表 | `openspec/project.json` `commands` | build / test / lint 三条,后端加前端 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `AuthorizationResolver` + `Authorization` | `application/auth/AuthorizationResolver.java` | 原样包进 `LocalRbacPermissionSource` | 否 |
| `AuthSnapshotCache` | `application/auth/AuthSnapshotCache.java` | 继续缓存「角色 + 权限」快照 | 是:`Snapshot` 去掉 `tokenVersion`/`enabled`,只留权限部分 |
| `UserRepository.revokeTokens` / 改密 / 禁用路径 | 现有 | 吊销语义不变 | 否 |
| `JwtTokenCodec` 的密钥长度校验与 `Clock` 注入 | `JwtTokenCodec.java:49-58` | 保留 | 是:增加 `iss`/`aud` 的写入与校验 |
| `AuthApplicationService.appendLog` / `DUMMY_HASH` | `AuthApplicationService.java:255-275` | `authenticate` 直接复用 | 否 |
| `AuthController.clientOf` | `AuthController.java` 末尾 | 原样复用 | 否 |
| `IntegrationTestSupport.call` | `IntegrationTestSupport.java:101-111` | 给 `login` 加 `X-Auth-Mode: token` 头后,其余测试不用改 | 是:只改登录 helper |
| 前端 `useSyncExternalStore` 模式 | `web/src/utils/token.ts` | 新的 `session.ts` 沿用同一个外部 store 结构 | 是:数据源换成 `document.cookie` |
| `jjwt` 0.13 | BOM 已钉版本 | `requireIssuer` / `requireAudience` 原生支持 | 否,不加依赖 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| `weiran-framework` 不能依赖基座(CP-12) | 宪法 CP-12 | Cookie 名称、CSRF 校验、写 Cookie 的工具类都放在框架层,基座 adapter 调用它们;配置 `weiran.auth.cookie.*` 由框架的 properties 承载 |
| 拦截器 `preHandle` 抛异常时不会调用 `afterCompletion` | `AuthInterceptor.java:28-31` 注释 | CSRF 校验必须放在 `CurrentUser.set` **之前**,失败时直接抛异常 |
| `@PublicApi` 的登录接口也经过拦截器 | `AuthInterceptor.java:38-53` | 登录请求不能要求 CSRF(还没有 `weiran_csrf`);CSRF 只在「由 Cookie 认证成功」的请求上检查,公开接口在未认证时自然跳过 |
| 拦截器只匹配 `/api/**` | `WeiranFrameworkAutoConfiguration.java:113` | 认证 Cookie 用 `Path=/api` 刚好覆盖 |
| `*-domain` 不依赖框架 | 分层规矩 | `TokenVerifier` / `IdentityResolver` / `PermissionSource` 端口的签名只能用 domain 自己的类型(`VerifiedToken`、`AuthState`、`Authorization`),不能出现 `LoginUser` |
| `LoginUser` 在框架层 | `weiran-framework/.../auth/LoginUser.java` | 由 application 层的 `DispatchingTokenAuthenticator` 把 domain 结果组装成 `LoginUser` |
| 禁用 `java.util.Date` | 宪法 / Forbidden APIs | jjwt 边界继续使用就地 `@SuppressForbidden` |
| 测试 MySQL 用 Testcontainers | `IntegrationTestSupport.java:32` | AC-8 的「直接改库」用 `JdbcTemplate` 实现,不经过 service |
| `vitest` 的 jsdom 支持 `document.cookie` | jsdom 行为 | 前端单测可以直接写 `document.cookie` 来模拟登录态;HttpOnly 无法模拟,也不需要 |
| Safari 不接受 `http://localhost` 上的 Secure Cookie | 浏览器行为 | `weiran.auth.cookie.secure` 在 `local` profile 设为 `false` |
| GitHub Actions 的 `ubuntu-latest` 自带 Docker | GitHub 托管 runner | Testcontainers 能直接跑;JDK 21 用 `actions/setup-java` 安装,`JAVA_HOME_21` 环境变量与 `project.json` 的写法兼容 |
| `project.json` 的命令在 macOS 之外依赖 `JAVA_HOME_21` | `openspec/project.json` `commands` | CI 设置 `JAVA_HOME_21=$JAVA_HOME` 即可沿用 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran-framework/.../auth/AuthInterceptor.java` | 改造:Bearer 优先、Cookie 次之;Cookie 认证的写请求校验 CSRF |
| `weiran-framework/.../auth/AuthCookies.java`(新) | 新增:Cookie 名称常量与生成 / 清除 `ResponseCookie` 的工具 |
| `weiran-framework/.../auth/AuthCookieProperties.java`(新) | 新增:`weiran.auth.cookie.{secure}` |
| `weiran-framework/.../autoconfigure/WeiranFrameworkAutoConfiguration.java` | 改造:拦截器构造参数增加 Cookie 配置 |
| `weiran-base-domain/.../auth/{TokenVerifier,IdentityResolver,PermissionSource,VerifiedToken,AuthState}.java`(新) | 新增端口与值对象 |
| `weiran-base-domain/.../auth/{TokenCodec,TokenClaims}.java` | 改造:`TokenCodec` 收窄为本地签发;claims 增加 `issuer` |
| `weiran-base-domain/.../user/UserRepository.java` | 改造:新增 `findAuthState(long id)` |
| `weiran-base-application/.../auth/SystemTokenAuthenticator.java` | **删除**,由 `DispatchingTokenAuthenticator`、`LocalIdentityResolver`、`LocalRbacPermissionSource` 替代 |
| `weiran-base-application/.../auth/AuthSnapshotCache.java` | 改造:只缓存权限快照 |
| `weiran-base-application/.../auth/AuthApplicationService.java` | 改造:新增 `authenticate`,`login` 改为复用它 |
| `weiran-base-application/.../autoconfigure/SystemApplicationAutoConfiguration.java` | 改造:更新 `@Import` 列表 |
| `weiran-base-api/.../auth/{AuthService,LoginResult}.java`、新增 `AuthenticatedUser.java` | 改造:新增方法;`accessToken` 改为可空 |
| `weiran-base-infrastructure/.../security/{JwtTokenCodec,SystemSecurityProperties}.java` | 改造:写入并校验 `iss`/`aud`;配置前缀改为 `weiran.auth`;新增 `LocalJwtVerifier`(实现 `TokenVerifier`) |
| `weiran-base-infrastructure/.../persistence/MybatisUserRepository.java` | 改造:实现 `findAuthState`(只查两列) |
| `weiran-base-infrastructure/.../autoconfigure/SystemInfrastructureAutoConfiguration.java` | 改造:Bean 装配 |
| `weiran-base-adapter/.../web/AuthController.java` | 改造:登录按 `X-Auth-Mode` 决定下发 Cookie 还是返回令牌;登出清除 Cookie |
| `weiran-app/src/main/resources/application.yml`、`application-local.yml.example`(如有)、`weiran4j/.env.example` | 改造:改配置键;local 设 `secure: false` |
| `weiran-app/src/test/.../{IntegrationTestSupport,AuthIT}.java`、新增 `CookieAuthIT.java` | 改造与新增 |
| 各模块单测(`JwtTokenCodecTest`、`WebLayerTest` 等) | 改造与新增 |
| `web/src/utils/token.ts` → `session.ts` | 改造:读 `weiran_csrf` |
| `web/src/utils/request.ts` | 改造:去掉 Bearer 头,写请求带 `X-CSRF-Token`,会话失效时 `clearSession` |
| `web/src/hooks/{useAuth.ts,PreferencesProvider.tsx}`、`hooks/queries/auth.ts` | 改造:`token` 换成 `session` |
| `web/src/types/api.ts` | 改造:`LoginResult.accessToken?` |
| `web/src/config.ts` 或 `vite.config.ts` | 改造:拒绝绝对地址的 `VITE_API_BASE_URL` |
| `web/src/**/__tests__/*`(约 9 个文件) | 改造:`setToken` 换成写 `weiran_csrf` Cookie 的测试 helper |
| `.github/workflows/ci.yml` | 新增 |
| `weiran4j/docs/01-架构与接口契约.md` | 改造:§3、§4、§6.1 |
| `weiran4j/docs/00-决策记录.md` | 新增 D-014 |
| `openspec/rules/enforced/constitution.md` | 改造:CP-8 |
| `openspec/state/bizs/artifact.md` | 改造:#02、#05 |

### 共享层命中 ⚠️

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增非业务模块 / 改发现逻辑是全仓单点 | 未命中:不新增模块 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 constraints 是全仓单点 | 未命中:不加依赖(`jjwt` 已有) |
| SL-3 | `weiran-app/build.gradle.kts` | 应用级依赖 / 聚合 / bootRun | 未命中:只改 `application.yml` 和测试,不改构建脚本 |
| SL-4 | Flyway 种子菜单 `db/migration/**` | 菜单 id、版本号是全局序号 | 未命中:本次没有迁移 |
| SL-5 | `web/src/pages/**` 与 `page-registry.ts` | 页面与菜单配对 | 未命中:不新增页面 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/CommonErrors.java` | 跨模块错误码基座,前端依赖 40100 / 40101 的区分 | **命中**:新增 `CSRF_REJECTED(40302, 403, "请求校验失败,请刷新页面后重试")`。CSRF 是框架级概念(由 `weiran-framework` 拦截器抛出),符合「跨模块」准入。40100 / 40101 的语义不变 → **Layer 0** |
| SL-7 | `weiran-common/.../{page,response}/*` | 分页与响应包络 | 未命中 |

#### 序号型资源

| 资源 | 是否命中 |
|---|---|
| Flyway 版本号 | 未命中:本次没有迁移 |
| `sys_menu` id | 未命中 |

#### 被 2 个以上执行单元读取的(读也要先冻结)

| 对象 | 读取方 | 处理 |
|---|---|---|
| `weiran-framework` 的 `AuthCookies`(Cookie 名称、CSRF 头名) | 框架拦截器、基座 `AuthController`、前端 `session.ts`/`request.ts`、集成测试 | **Layer 0 冻结**:Cookie 名称 `weiran_token` / `weiran_csrf`,请求头 `X-CSRF-Token` / `X-Auth-Mode` |
| `weiran-base-domain` 新端口签名 | application、infrastructure | **Layer 0 冻结** |
| 契约 §4 / §6.1 | 后端、前端 | **Layer 0**:契约先行 |

## 本次不会碰的目录

- `weiran4j/build-logic/**`、`weiran4j/weiran-dependencies/**`、`weiran4j/settings.gradle.kts`
- `weiran4j/weiran-base/**/db/migration/**`(没有迁移)
- `weiran4j/weiran-base/**/com/weiran/platform/**`(字典 / 配置 / 操作日志)
- `weiran4j/weiran-base/**/system/{department,menu,role,loginlog}/**` 的业务逻辑(只读)
- `web/src/pages/**`(登录页可能只改测试;页面本身走 `useAuth`)、`web/src/layouts/**` 的业务部分(只改其测试里 `setToken` 的调用)
- `openspec/{schemas,guards,check.mjs,config.yaml,project.json}`
- `weiran4j/docs/business-modules.md`(40302 属于框架号段,基座号段的用量写在契约 §2.1)

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 「框架层 `AuthInterceptor` 不动」(来自第 ① 条) | 第 ⑥ 条的 Cookie 读取与 CSRF 校验只能放在框架拦截器里(CP-12:框架不能依赖基座,而认证入口在框架) | 第 ① 条的「不动」只针对三段式拆分;第 ⑥ 条允许改拦截器的令牌提取与 CSRF。SPI 签名仍然不变 | ☑ interview「对下游的硬约束」已经写的是「只增加 Cookie 提取与 CSRF 校验」,不冲突,无需改动 |
| AC-8「直接改库或另一实例」 | 集成测试只有一个实例 | 用 `JdbcTemplate` 直接改库来模拟另一个实例的写入 | ☑ AC-8 原文已包含「直接改库」 |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 每次请求多一次主键查询 | 高 QPS | 只查 `token_version`、`status` 两列,走主键;后续真成了瓶颈,再换成本地短缓存加广播。写进 #02 的剩余说明 |
| 改了配置键后本地启动失败 | 开发者的 `application-local.yml` 仍用 `weiran.system.jwt.secret` | 密钥缺失时启动报错的提示语写明新键名;同步修改 `application-local.yml.example`;D-014 / 契约里注明改名 |
| 已签发的旧令牌失效 | 上线即生效(旧令牌没有 `iss`) | 无下游、无生产,可以接受;在契约里注明 |
| 前端测试大面积改 `setToken` | 约 9 个测试文件 | 提供一个测试 helper `loginAs(userId)` 写 `weiran_csrf` Cookie,机械替换 |
| CI 首次运行耗时或 Testcontainers 不稳定 | GitHub runner | 只做 Gradle 和 pnpm 缓存;不在本 change 里调优 |
| CSRF 与锁屏、偏好的防抖写入 | 所有写请求 | 统一在 `request.ts` 里加头,不让调用方处理 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子

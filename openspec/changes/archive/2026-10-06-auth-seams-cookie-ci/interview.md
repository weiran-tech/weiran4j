---
title: "认证三段式拆分 + HttpOnly Cookie + CI"
status: "done"
updated_at: "2026-10-05"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。

## 一句话需求

> 用户原话,不要改写。

- 「处理 1-7」(指同一会话里对认证体系与工程门禁列出的 7 条问题,见下「澄清记录」#1)

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 「1-7」具体指什么 | 会话中列出的 7 条:①JWT 无 `iss`/`aud`;②CP-8 原文禁止用 TTL 代替吊销,与将来联邦令牌冲突;③`AuthService` 没有只校验凭据的方法;④基座不用 Spring Security,与将来 Spring Authorization Server 的边界未定;⑤`AuthSnapshotCache` 进程内 30s,多节点吊销有窗口(artifact.md#02);⑥前端令牌在 `localStorage`;⑦没有 CI(artifact.md#05) | 7 条全部在本 change 内处理 |
| 2 | 第 5 条做到哪一步 | 吊销绕过缓存 | `token_version` / `enabled` 每次请求按主键查库;角色、权限仍缓存 30s;#02 改为「部分解决」 |
| 3 | 第 6 条怎么处理 | 现在改成 HttpOnly Cookie | 本次完成 Cookie 迁移,必须同时补 CSRF 防护 |
| 4 | 走什么流程 | openspec 合并成一个 change | 7 条放进同一个 change `auth-seams-cookie-ci` |
| 5 | Cookie 之后登录响应体还返回 `accessToken` 吗 | 按请求头切换 | 默认只下发 Cookie,响应体 `{tokenType, expiresIn}`;请求带 `X-Auth-Mode: token` 时响应体带 `accessToken` 且**不**下发 Cookie |
| 6 | CSRF 防护方式 | SameSite=Strict + 双提交令牌 | 认证 Cookie `SameSite=Strict`;另发非 HttpOnly 的 `weiran_csrf`;以 Cookie 认证的写请求必须带等值 `X-CSRF-Token` 头,否则 403;Bearer 头认证的请求不查 |
| 7 | 是否把「前后端必须同源」写进契约 | 写死同源 | 契约 §4 声明同源部署;`VITE_API_BASE_URL` 只接受路径前缀,绝对地址构建/启动报错;不加 CORS |
| 8 | 无下游时配置键能否直接改名(`weiran.system.jwt.*` → `weiran.auth.*`) | 会话前文已确认「无下游,可直接改」 | 直接改,不留兼容别名;环境变量名 `WEIRAN_JWT_SECRET` / `WEIRAN_JWT_TTL` 不变 |

### 由 agent 判定、记录在案的技术决策(不需要人拍板,但下游必须遵守)

- **前端登录态来源**:JS 读不到 HttpOnly 令牌,改为读非 HttpOnly 的 `weiran_csrf`。它的值为 `<userId>.<随机串>`,同时充当三种角色:「是否登录」标志、本地偏好缓存的归属用户(替代 `tokenUserId`)、按会话隔离 TanStack Query 缓存的键(替代 `token`)。该值不是凭据:单独拿到它无法通过认证。
- **Cookie 路径**:认证 Cookie `Path=/api`(只随接口请求发送);`weiran_csrf` 用 `Path=/`(SPA 页面路径下的 JS 要能读到)。
- **Secure 标志**:`weiran.auth.cookie.secure` 可配置,默认 `true`;`local` profile 设为 `false`(Safari 不接受 `http://localhost` 上的 Secure Cookie)。
- **多标签页同步**:原来靠 `storage` 事件,Cookie 没有这类事件。改为窗口 `focus` / `visibilitychange` 时重新读取 Cookie。
- **CSRF 失败的错误码**:新增 `40302`(HTTP 403),属于框架号段。
- **401 时的前端处理**:前端删不掉 HttpOnly Cookie,只删 `weiran_csrf`(即「登出」本地态);服务端的认证 Cookie 本来就已失效,随它过期。

## 边界

### 要做

- ① 本地 JWT 写入并校验 `iss`、`aud`(可配置,默认都是 `weiran4j`);缺少或不符的令牌一律 401。
- ① 把 `SystemTokenAuthenticator` 拆成 `TokenVerifier` / `IdentityResolver` / `PermissionSource` 三个端口,由按 `iss` 分发的 `DispatchingTokenAuthenticator` 组装;本次只有本地这一套实现。
- ① 配置键 `weiran.system.jwt.*` 改为 `weiran.auth.jwt.*`,`weiran.system.bcrypt-strength` 保持不动。
- ② 修订宪法 CP-8:原有条款限定为「本地签发令牌」,另写一条「联邦令牌」的吊销规则(短 TTL + 签发方吊销),并写明后者在实现前不得启用。
- ③ `AuthService` 新增 `authenticate(username, password, client)`:只校验凭据,保留防枚举(`DUMMY_HASH`、统一 40101)、禁用账号 40301、失败写登录日志;`login` 改为复用它。
- ④ 在 `00-决策记录.md` 新增 D-014,记录认证三段式、外部身份绑定表方向、IAM 先买后建、Spring Security 的边界。
- ⑤ 每次请求按主键查 `token_version` + `status`,不走缓存;角色、权限快照仍走 30s 缓存。
- ⑥ 后端:登录下发认证 Cookie 与 `weiran_csrf`;`AuthInterceptor` 依次读 Bearer 头、认证 Cookie;CSRF 双提交校验;登出时清除两个 Cookie;支持 `X-Auth-Mode: token`。
- ⑥ 前端:去掉 `localStorage` 令牌和 Authorization 头;请求层写请求带 `X-CSRF-Token`;登录态、偏好归属、查询键、401 处理、跨标签同步全部改用 `weiran_csrf`;相关测试同步修改。
- ⑥ 契约:§4 写明同源部署与 Cookie/CSRF 约定,§6.1 更新登录与登出接口,§2.1 登记 40302;同步更新 `web/src/types/api.ts`。
- ⑦ 新增 `.github/workflows/ci.yml`:在 PR 和推送 main 时跑后端 JDK 21 `./gradlew check`、前端 `pnpm lint` / `pnpm test` / `pnpm build`、`node openspec/check.mjs`。
- 状态文档:artifact.md#02 改为部分解决,#05 关闭并移入 changelog;第 ⑥ 条完成后无遗留,不另登记;同步 `state/bizs/` 中受影响的认证相关文件。

### 明确不做

- 不实现任何外部身份登录(CAS / OIDC / 钉钉),不建 `sys_user_identity` 表,不加 `/api/auth/providers` 接口。
- 不实现联邦令牌校验(JWKS / RS256),不引入 Spring Security 或 Spring Authorization Server,不新增任何 Maven 依赖。
- 不引入 Redis,也不做角色、权限缓存的分布式失效(#02 剩余的 30s 窗口保留)。
- 不加 CORS,不支持前后端跨域部署。
- 不做 refresh token、滑动续期和「记住我」;令牌有效期仍为 `WEIRAN_JWT_TTL`(默认 12h)。
- 不改 springdoc / Swagger UI 的认证方式(它继续用 Bearer 头,local profile 才开)。
- 不配置 GitHub 分支保护规则(artifact.md#12 另案处理);CI 不做部署、不发版、不做缓存以外的优化。
- 不改密码哈希、`PasswordPolicy`、登录日志的表结构;本次没有 Flyway 迁移。

### 本次不决定(留给后续 change)

- 联邦令牌的权限来源选 A1 还是 A2(D-014 只写出两个选项)。
- 外部身份登录的接口形态(第一轮讨论的 CAS 方案,另开 change)。
- 自研 IAM 是否、何时启动。

## 验收标准

- [ ] AC-1 新签发的本地 JWT 载荷包含 `iss` 与 `aud`,值来自 `weiran.auth.jwt.issuer` / `weiran.auth.jwt.audience`(默认都是 `weiran4j`);缺少 `iss`、`iss` 不认识或 `aud` 不符的令牌请求受保护接口返回 40100(有单测或集成测试覆盖这三种情况)。
- [ ] AC-2 `SystemTokenAuthenticator` 不复存在;`weiran-base-domain` 中有 `TokenVerifier`、`IdentityResolver`、`PermissionSource` 三个端口,`DispatchingTokenAuthenticator` 按 `iss` 选择 verifier;`weiran-framework` 的 `TokenAuthenticator` SPI 签名不变。
- [ ] AC-3 改前已有的后端认证、权限集成测试改后全部通过(除因 Cookie 契约、`iss`/`aud` 而有意修改的断言外,不删测试)。
- [ ] AC-4 `application.yml` 中不再出现 `weiran.system.jwt`,改用 `weiran.auth.jwt.secret|ttl|issuer|audience`;`WEIRAN_JWT_SECRET` 缺失或不足 32 字节时应用照旧启动失败。
- [ ] AC-5 `constitution.md` 的 CP-8 写明适用于「本地签发令牌」,另有一条单独的联邦令牌吊销条款;`pnpm openspec:check` 通过。
- [ ] AC-6 `AuthService.authenticate` 存在;对它而言,用户名不存在与密码错误都抛 40101,且耗时同为一次 BCrypt 校验(复用 `DUMMY_HASH`);禁用账号抛 40301;失败都写一条登录日志;成功时**不**签发令牌,也不写成功日志(成功日志由 `login` 写)。
- [ ] AC-7 `00-决策记录.md` 有 D-014,覆盖四项:三段式、外部身份绑定表、IAM 先买后建、Spring Security 只管 `/oauth2/**` 与 `/.well-known/**`。
- [ ] AC-8 用户 A 持有有效令牌,在**不经过本进程缓存失效**(直接改库或换另一个服务实例)的前提下,改 `token_version` 或把 `status` 设为禁用后,A 的**下一次**请求返回 40100;有集成测试用「直接改库,不调用 `evict`」的方式验证。
- [ ] AC-9 浏览器默认登录(不带 `X-Auth-Mode`):响应体 `data` 中没有 `accessToken`;响应头有两个 Cookie:
  - 认证 Cookie:`HttpOnly`、`SameSite=Strict`、`Path=/api`、`Max-Age` 等于 TTL;
  - `weiran_csrf`:非 HttpOnly、`SameSite=Strict`、`Path=/`。

  `Secure` 跟随配置。
- [ ] AC-10 带 `X-Auth-Mode: token` 的登录:响应体含 `accessToken`,且响应**没有** `Set-Cookie`;用这个令牌通过 `Authorization: Bearer` 调写接口,不带 CSRF 头也能成功。
- [ ] AC-11 只靠认证 Cookie 认证的 POST/PUT/DELETE 请求,缺少 `X-CSRF-Token` 头或头值与 `weiran_csrf` 不一致时返回 40302,业务代码不执行;GET 请求不检查。
- [ ] AC-12 `POST /api/auth/logout` 的响应把两个 Cookie 都置为 `Max-Age=0`。
- [ ] AC-13 `web/src` 中不再出现读写令牌的 `localStorage` 调用和 `Authorization` 头;`TOKEN_KEY`、`tokenUserId` 被删除或替换。
- [ ] AC-14 前端单测通过,并覆盖四种情况:
  - 写请求带 `X-CSRF-Token`;
  - 40100 时清除 `weiran_csrf` 并回到登录页;
  - 登录后 `useSession` 有值;
  - 偏好缓存按 `weiran_csrf` 中的 userId 判定归属。
- [ ] AC-15 `VITE_API_BASE_URL` 设成以 `http://` 或 `https://` 开头的值时,`pnpm build` 失败并给出说明。
- [ ] AC-16 契约 §4 有同源部署与 Cookie/CSRF 约定;§6.1 的登录、登出行描述了 Cookie、`X-Auth-Mode`;§2.1 有 40302;`web/src/types/api.ts` 的 `LoginResult.accessToken` 为可选。
- [ ] AC-17 `.github/workflows/ci.yml` 存在,在 `pull_request` 和 `push: main` 上触发,包含三个 job:后端 JDK 21 `./gradlew check --no-daemon`、前端 `pnpm lint && pnpm test && pnpm build`、`node openspec/check.mjs`;用 `actionlint` 校验或至少通过 YAML 解析。
- [ ] AC-18 artifact.md#02 状态为「部分解决」,并写明剩余窗口(只剩角色、权限的 30s);#05 移入 §7 changelog 并注明由本 change 关闭。
- [ ] AC-19 后端 `./gradlew check`、前端 `pnpm lint/test/build`、`pnpm openspec:check` 三道 L7 门禁全绿。
- [ ] AC-20 在真实浏览器(`pnpm dev`)里完成一遍:登录 → 刷新后仍在登录态 → 修改个人资料成功 → 锁屏后解锁 → 登出回到登录页。

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 吊销实时性 | 每次请求按主键查 `token_version` / `status` | Redis 广播失效;维持 30s 窗口 | 不引入新基础设施;单行主键查询的成本可以忽略;权限 30s 延迟是可接受的业务口径,账号吊销的延迟则不是 |
| 令牌存储 | HttpOnly Cookie + 双提交 CSRF | 维持 `localStorage` | 用户决定;XSS 拿不到持久令牌 |
| 非浏览器调用方 | `X-Auth-Mode: token` 切换 | 响应体始终带令牌;只用 Cookie | 浏览器路径里 JS 从头到尾接触不到令牌,脚本调用方也不用去解析 Set-Cookie |
| 前端登录态 | 读非 HttpOnly 的 `weiran_csrf`(`<userId>.<随机串>`) | 每次启动先调 `/me` 判断 | 保持现有同步读取的语义(首屏不闪);只是把 `token` 换成另一个字符串,改动面最小 |
| 部署拓扑 | 写死同源 | 支持跨域 + `SameSite=None` | 当前本来就没有 CORS,事实上已经是同源;没有跨域需求 |
| 三段式的范围 | 只抽端口 + 本地实现 | 同时实现联邦 verifier | 没有真实签发方可以验证,做了也没法测(YAGNI) |
| change 粒度 | 7 条合并成一个 | 拆成两个 | 用户决定 |

## 未决歧义

- 无

## 对下游的硬约束

- 契约先行:先改 `weiran4j/docs/01-架构与接口契约.md`,再改代码;`web/src/types/api.ts` 手动同步。
- CP-8 本地令牌部分**不放松**:改密、重置、禁用仍必须递增 `token_version`;这次只是让这项校验不再经过缓存。
- 防枚举不得退化:`authenticate` 的两条失败路径必须共用 40101、共用提示语,且都要跑一次 BCrypt。
- 框架层 `TokenAuthenticator` SPI 签名不变;`AuthInterceptor` 只增加「从 Cookie 取令牌」和 CSRF 校验,其余流程(只在全部检查通过后写入 ThreadLocal)保持原样。
- 本次没有 Flyway 迁移;如果实现中发现需要,必须回到 L3 重新审批。
- 不新增 Maven / npm 依赖(CP-4)。
- 所有 Gradle 命令使用 JDK 21;不打开配置缓存。

## Gate

- [x] 「未决歧义」已清零
- [x] 验收标准均可判定真假
- [x] 「明确不做」已列出且足够具体

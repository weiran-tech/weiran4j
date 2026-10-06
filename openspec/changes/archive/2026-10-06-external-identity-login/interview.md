---
title: "外部身份登录(CAS + OIDC)"
status: "done"
updated_at: "2026-10-06"
---

# Interview

> **L0 · 消歧**。

## 一句话需求

> 用户原话,不要改写。

- 「处理 #18, #9, #10, #11, 实现第二期内容」→ 拆分后的第二个 change;「第二个change + ③ 道(CI)调整说明」

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 第 2 期支持哪些协议 | CAS + OIDC | CAS 3.0(`/p3/serviceValidate`,`format=JSON`)与 OIDC 授权码流程(PKCE S256 + state + nonce,id_token 用 JWKS 验签) |
| 2 | 首次外部登录、本地未绑定时怎么办 | 两种都支持 | 默认只认已绑定的;按提供方配置 `auto-provision: true` 后自动建号并绑定,赋予可配置的默认角色 |
| 3 | 提供方配置放哪 | `application.yml` + 环境变量 | `weiran.auth.providers.<id>.*` 静态配置,可以配多个;`client_secret` 等敏感值只走环境变量;改配置需要重启 |
| 4 | 绑定在哪管理 | 用户管理 + 个人中心 | 管理员在用户管理里查看、手工绑定、解绑(新增按钮权限);用户在个人中心「绑定外部账号」(已登录状态下再走一次外部登录完成绑定)和解绑 |
| 5 | 登出 | 可配置跳转登出 | 本地登出后,如果本次会话来自某提供方且该提供方配置了登出地址,前端跳过去一并登出;不做后端通道 SLO |
| 6 | 测试与验证用什么 IdP | Keycloak 容器 + 模拟 CAS | OIDC:Testcontainers 起 Keycloak(`GenericContainer`,不新增依赖),导入测试 realm;CAS:测试里用 JDK `HttpServer` 模拟验票接口;最后在真实浏览器里对 Keycloak 走一遍 |
| 7 | AGENTS.md 门禁 ③ 的过期说明 | 并入本 change | 门禁 ③ 改为「✅ GitHub Actions」并链接 `ci.yml`;补一句分支保护(`artifact.md#12`)需要用户在 GitHub 开启 |

### 由 agent 判定、记录在案的技术决策(L3 一并审阅)

- **流程走后端跳转,不用前端回调页**:
  - 浏览器整页跳到 `GET /api/auth/sso/{provider}/authorize?redirect=<站内路径>&mode=login|bind`,后端 302 到 IdP;
  - IdP 回调 `GET /api/auth/sso/{provider}/callback`,后端完成验票 / 换码、映射用户、下发认证 Cookie,再 302 回站内页面;
  - 失败时 302 到 `/login?ssoError=<code>`。

  理由:令牌全程不经过页面脚本,与 HttpOnly Cookie 设计一致。
- **流程状态放在签名 Cookie 里**:`weiran_sso`,HttpOnly、`SameSite=Lax`、`Path=/api/auth/sso`、10 分钟有效,用 JWT 密钥做 HMAC 签名。里面存 provider、state、nonce、PKCE verifier、redirect、mode,bind 模式还存发起绑定的 userId。
  - 必须是 Lax:IdP 回调是跨站发起的顶级导航,`SameSite=Strict` 的 Cookie 不会被带上——认证 Cookie `weiran_token` 在回调时同样带不上,所以 bind 模式的当前用户只能从这个签名 Cookie 取。
  - CAS 的 `service` 地址带上 `state` 参数,验票时用同一个 `service`,同样能防登录 CSRF。
- **`redirect` 只接受站内相对路径**(以单个 `/` 开头,且不是 `//`),否则改为首页,防开放重定向。
- **自动建号**:
  - 用户名取 OIDC `preferred_username`(没有时取 `sub`)或 CAS 的 user;
  - 规范化为字母开头、2–32 位,不合法就用 `<provider>_<短哈希>`;
  - **本地已有同名用户且没有绑定该外部身份时,不自动关联**,返回「账号未开通」,防止冒名接管已有账号,需要管理员手工绑定;
  - 昵称取 `name` / `nickname`,邮箱取 `email`(仅在 IdP 声明 `email_verified=true` 时采用);
  - 自动建出的用户**没有本地密码**。
- **没有本地密码的用户**:
  - `/me` 增加 `hasPassword`;
  - 个人中心的「修改密码」改为提示「未设置本地密码,可请管理员重置」;
  - 锁屏只提供「重新登录」(走外部登录),不显示密码框;
  - 管理员「重置密码」照常可用,重置后该用户就有了本地密码;
  - `authenticate` 对这类用户返回 40101(与密码错误同一口径)。
- **密码登录开关**:`weiran.auth.password-login.enabled`(默认 `true`)。关闭后,只有内置超管(`is_builtin` 且持有 `super_admin`)仍能用密码登录,作为 IdP 故障时的应急入口;其他人用密码登录返回新错误码「密码登录已关闭」。
- **令牌**:外部登录签发的仍是本地 JWT(D-014:外部身份只换身份,不换令牌),额外带 `idp` claim(提供方 id),用于登出时决定是否跳转外部登出。
- **登出响应**:`data` 从 `null` 改为 `{ssoLogoutUrl: string | null}`,前端拿到非空值时整页跳转过去。
- **登录日志**:沿用 `sys_login_log`,不加列;`message` 写「CAS 登录成功(<provider>)」「OIDC 登录成功(<provider>)」;外部登录失败同样记日志,`username` 记外部用户标识。
- **错误码(框架 / 基座号段 00–19)**:
  - `40102` 外部身份校验失败(票据或授权码无效、state 不符、id_token 验签失败);
  - `40303` 账号未开通(外部身份未绑定且不允许自动建号,或本地同名冲突);
  - `40304` 密码登录已关闭;
  - 绑定冲突(外部身份已绑定到别的用户)沿用 `40901`。
- **权限与菜单**:新增按钮权限 `system:user:identity`(查看、绑定、解绑他人的外部身份),`sys_menu` 按钮行 id `120`,挂在用户管理(id 3)下。迁移脚本为 `V202610060001__system_user_identity.sql`(建表 + 菜单行)。
- **不新增 Maven 依赖**:HTTP 用 JDK `HttpClient`,JSON 用 Jackson,id_token 用 jjwt 0.13 的 JWK 支持验签。

## 边界

### 要做

- `sys_user_identity` 表、领域模型、仓储;外部身份校验端口与 CAS、OIDC 两个实现;登录 / 绑定流程;自动建号;密码登录开关。
- 接口:
  - `GET /api/auth/providers`(公开):提供方列表与 `passwordLoginEnabled`;
  - `GET /api/auth/sso/{provider}/authorize`、`GET /api/auth/sso/{provider}/callback`;
  - `GET /api/auth/identities`、`DELETE /api/auth/identities/{id}`:本人的外部身份;
  - `GET /api/users/{id}/identities`、`POST /api/users/{id}/identities`、`DELETE /api/users/{id}/identities/{identityId}`:管理员操作;
  - `/me` 增加 `hasPassword`;
  - 登出响应改为 `{ssoLogoutUrl}`。
- 前端:
  - 登录页显示外部登录按钮,展示 `ssoError` 提示;
  - 个人中心增加「外部账号」卡片(绑定 / 解绑),没有本地密码时的提示;
  - 用户管理增加外部身份查看、绑定、解绑(按钮权限);
  - 锁屏对没有本地密码的用户只提供「重新登录」;
  - 登出时按需跳转外部登出。
- 契约(§3 / §4 / §5 / §6.1 / §6.2)、`.env.example`、`02-部署.md`(提供方配置、回调地址登记)、D-015、state(`sys_user.md`、新增 `sys_user_identity.md`)、`AGENTS.md`(认证要点 + 门禁 ③ 的过期说明)。
- 测试:单测、集成测试(Keycloak 容器、模拟 CAS)、真实浏览器对 Keycloak 走一遍。

### 明确不做

- 不做后端通道单点登出(CAS logoutRequest、OIDC back-channel logout)。
- 不做提供方的后台管理界面和数据库配置。
- 不做钉钉、企业微信、飞书等非标准协议(它们以后可以作为 OIDC 或单独的 `ExternalIdentityVerifier` 实现接入)。
- 不做联邦令牌(路线图第 3 期):外部登录换的仍是本地 JWT。
- 不做 SAML。
- 不从外部身份同步部门、角色等组织信息(自动建号只给默认角色)。
- 不改 `sys_login_log` 表结构。
- 不做「记住外部身份提供方选择」、自动跳转 IdP(登录页始终先显示)。

### 本次不决定(留给后续 change)

- 是否从 IdP 的 claims 映射角色。
- 是否需要「强制所有用户走外部登录」之外更细的策略(按角色、按部门)。

## 验收标准

- [ ] AC-1 `sys_user_identity` 表经 Flyway `V202610060001__system_user_identity.sql` 创建,`(provider, external_id)` 唯一,`user_id` 有索引;删除用户时连带删除其绑定;同一个迁移插入按钮权限 `system:user:identity`(`sys_menu` id 120)。
- [ ] AC-2 `GET /api/auth/providers`(公开)返回已启用的提供方 `[{id, type, name}]` 与 `passwordLoginEnabled`,不包含任何密钥和内部地址。
- [ ] AC-3 OIDC 登录:用 Keycloak 容器完成「authorize → IdP 登录 → callback」,下发认证 Cookie 并 302 回 `redirect`,之后 `/me` 返回绑定的本地用户;state 不符、nonce 不符、id_token 签名或受众错误时都会 302 到 `/login?ssoError=40102`,并且不下发认证 Cookie。
- [ ] AC-4 CAS 登录:模拟的 CAS 返回成功时完成登录;返回失败或 state 不符时得到 `ssoError=40102`;验票请求里的 `service` 与跳转时一致。
- [ ] AC-5 未绑定的外部身份:默认得到 `ssoError=40303`;打开 `auto-provision` 后,自动创建本地用户(默认角色、没有本地密码)并绑定,第二次登录命中同一个用户;本地同名用户存在且未绑定时**不**自动关联,返回 40303。
- [ ] AC-6 绑定与解绑:
  - 个人中心发起 bind 模式,完成后外部身份绑定到当前用户;
  - 该外部身份已绑定到别人时返回 40901;
  - 用户可以解绑自己的身份,但**没有本地密码且只剩最后一个外部身份时禁止解绑**(40901),否则会锁死账号;
  - 管理员凭 `system:user:identity` 查看、绑定、解绑任意用户的外部身份,没有该权限返回 40300。

  集成测试覆盖。
- [ ] AC-7 `redirect` 只接受站内相对路径:`https://evil.com` 和 `//evil.com` 都被改为 `/`。单测覆盖。
- [ ] AC-8 签名 Cookie `weiran_sso` 为 HttpOnly、`SameSite=Lax`、`Path=/api/auth/sso`、`Max-Age=600`;被篡改或过期时回调失败(40102)。
- [ ] AC-9 没有本地密码的用户:
  - `/me` 返回 `hasPassword=false`;
  - 用密码登录返回 40101;
  - `verify-password` 返回 40101;
  - `PUT /api/auth/password` 返回 40000,提示「未设置本地密码」;
  - 管理员重置密码后 `hasPassword=true`,可以用密码登录。
- [ ] AC-10 `weiran.auth.password-login.enabled=false` 时:普通用户用密码登录返回 40304;内置超管仍可登录;`/providers` 返回 `passwordLoginEnabled=false`。
- [ ] AC-11 外部登录签发的 JWT 带 `idp` claim;登出响应 `data.ssoLogoutUrl`:该提供方配置了登出地址时非空,否则为 null;密码登录的会话为 null。
- [ ] AC-12 登录日志:外部登录成功和失败都写 `sys_login_log`,`message` 含提供方 id。
- [ ] AC-13 前端:
  - 登录页按 `/providers` 显示外部登录按钮;`passwordLoginEnabled=false` 时隐藏密码表单,但保留「管理员应急登录」入口;`ssoError` 显示对应提示;
  - 个人中心「外部账号」卡片可以绑定、解绑;`hasPassword=false` 时修改密码区显示提示;
  - 用户管理有外部身份的查看、绑定、解绑(按钮受权限控制);
  - 锁屏对 `hasPassword=false` 的用户只显示「重新登录」;
  - 登出时 `ssoLogoutUrl` 非空就跳转。

  vitest 覆盖。
- [ ] AC-14 不新增 Maven / npm 依赖。
- [ ] AC-15 契约、`.env.example`(由 `EnvExampleTest` 守住)、`02-部署.md`(提供方配置与回调地址登记)、D-015、`sys_user.md`、新增 `sys_user_identity.md`、`AGENTS.md`(认证要点 + 门禁 ③ 改为 ✅、分支保护说明)都已同步。
- [ ] AC-16 L7 三道门禁全绿;真实浏览器对 Keycloak 走完「外部登录 → 刷新 → 个人中心查看绑定 → 登出(跳转 Keycloak 登出)」。

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 回调处理 | 后端回调 + 302 | 前端回调页 POST ticket / code | 令牌不经过页面脚本;CAS 与 OIDC 共用同一套流程 |
| 流程状态 | 签名的 Lax Cookie | 服务端存储(Redis / 表) | 无状态、多实例可用;必须 Lax 是 SameSite 的规则使然 |
| 外部登录后的令牌 | 本地 JWT + `idp` claim | 直接用 IdP 令牌 | D-014:外部身份只换身份,吊销仍走 `token_version` |
| 同名账号 | 不自动关联 | 按用户名自动关联 | 防冒名接管;D-014 第 2 条 |
| 依赖 | JDK HttpClient + jjwt JWK | Spring Security OAuth2 Client / Nimbus | 不引入 Spring Security(D-014 第 4 条),不新增依赖(CP-4) |
| 密码登录关闭 | 保留内置超管应急 | 完全关闭 | IdP 故障时必须还有入口 |

## 未决歧义

- 无

## 对下游的硬约束

- 契约先行;Flyway 只追加(CP-7);新错误码登记在 `CommonErrors` 的 00–19 段(CP-14);新菜单 id 120 在基座号段内(CP-15),契约 §2.1 的用量改为 120。
- 防枚举口径不退化:外部登录失败的提示语不区分「票据无效」与「用户不存在」;但「账号未开通」需要单独提示(管理员要据此去开通),这是有意的取舍,写进 D-015。
- 日志、登录日志、错误信息里不得出现 ticket、code、id_token、client_secret(CP-9)。
- 不新增依赖;不引入 Spring Security。

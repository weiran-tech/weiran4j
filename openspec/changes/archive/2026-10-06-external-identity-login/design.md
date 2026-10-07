---
title: "外部身份登录 · 设计"
status: "approved"
updated_at: "2026-10-06"
approved_by: "多厘"
approved_at: "2026-10-06"
---

# Design

## Context

- 需求来源:`interview.md`。用户决定:CAS + OIDC;预先绑定与自动建号两种都支持;提供方配置写在 yml,敏感值走环境变量;绑定在用户管理和个人中心两处管理;可配置的跳转登出;测试用 Keycloak 容器 + 模拟 CAS。
- 现有实现调研:`explore.md`。`password` 列非空;jjwt 0.13 自带 JWK 支持;用户管理按钮占到 id 103,基座最大菜单 id 119。
- 关键约束:不新增依赖;不引入 Spring Security;外部身份只换身份、不换令牌(D-014);不自动关联同名用户。

## 宪法对照

<!-- openspec:required-table mark=2 note=3 -->
| 原则 | 判定 | 说明 |
|---|---|---|
| CP-1 领域层不依赖框架 | ☑ | `domain.identity` 的模型与端口(`ExternalIdentityProvider`、`UserIdentityRepository`、`SsoStateSigner`)只用 JDK 与领域类型;HTTP、JWKS、Jackson 都在 infrastructure |
| CP-2 依赖方向单向向内 | ☑ | adapter → `ExternalLoginService`(api)→ application → domain 端口;infrastructure 实现端口 |
| CP-3 持久化类型不跨层 | ☑ | `SysUserIdentityDO` / Mapper 只在 infrastructure,对外返回 `UserIdentity` |
| CP-4 版本号只有一个来源 | ☑ | 不加依赖。测试用的 Keycloak 镜像标签写在测试常量里,与 Compose 镜像同理,不在 Gradle 版本体系内 |
| CP-5 质量规则只在 build-logic 里配置 | ☐ | 不涉及 |
| CP-6 豁免必须最小且带理由 | ☑ | jjwt 的 `Date` 边界沿用就地 `@SuppressForbidden`;不新增其它豁免 |
| CP-7 表结构只经 Flyway 迁移变更，已发布的迁移永不修改 | ☑ | 新增 `V202610060001__system_user_identity.sql`(建表 + 按钮行);不改旧脚本;`sys_user.password` 不改结构,用 `''` 表示没有本地密码 |
| CP-8 密码只用 BCrypt，令牌吊销只走 token_version | ☑ | 外部登录签发的仍是本地 JWT,吊销仍走 `token_version`(禁用 / 改密照样踢下线);不接受 IdP 令牌作为本系统令牌(联邦校验仍是第 3 期) |
| CP-9 凭据不进版本库、不进日志 | ☑ | `client_secret` 只走环境变量;ticket、code、id_token、PKCE verifier 不写日志、登录日志和错误信息;访问日志本来就不记查询串;流程 Cookie 只存签名过的 state / nonce / verifier,放在 HttpOnly Cookie 里 |
| CP-10 认证失败不泄露账号存在性 | ⚠ | 外部登录新增 `40303`「账号未开通」,与 `40102`「外部身份校验失败」可以区分。**偏离理由**:能拿到 40303 的前提是已经通过了 IdP 认证(证明了身份),它只说明「本系统没给你开通」,不泄露本地账号是否存在——同名本地用户存在时同样返回 40303,不单独提示;管理员需要据此去开通。密码登录口径不变(仍是统一的 40101)。不连带修订宪法,写进 D-015 |
| CP-11 错误码归属决定 HTTP 状态，不靠 Controller 判断 | ☑ | API 端点照常由异常处理器输出;回调端点是浏览器整页导航,失败时 302 到 `/login?ssoError=<code>`,code 来自 `BizException.getErrorCode()`,不手写 |
| CP-12 依赖只能业务 → 基座 → 框架，反向与同层横向禁止 | ☑ | 外部身份全部在基座;框架只给 `AuthCookies` 加流程 Cookie 工具和 `LoginUser.idp` |
| CP-13 业务只经基座的 weiran-base-api 接触基座 | ☑ | 新服务接口 `ExternalLoginService` 在 api 层 |
| CP-14 错误码按号段分配，业务不得占用框架与基座的号段 | ☑ | `40102`、`40303`、`40304` 序号都在 00–19 段,登记在 `CommonErrors` |
| CP-15 权限码、菜单 id 与 Flyway 模块段按层隔离 | ☑ | `system:user:identity`(基座 `system:` 前缀);菜单 id 120 在基座 1–999 段;脚本放 `db/migration/system/` |

## Architecture

```mermaid
sequenceDiagram
  participant B as 浏览器
  participant W as weiran4j(/api/auth/sso)
  participant I as IdP(Keycloak / CAS)
  B->>W: GET /sso/{p}/authorize?redirect=/x&mode=login
  W-->>B: 302 IdP 授权页 + Set-Cookie weiran_sso(签名, Lax)
  B->>I: 登录
  I-->>B: 302 /api/auth/sso/{p}/callback?code|ticket&state
  B->>W: GET callback(带 weiran_sso)
  W->>I: 换 token / 验票(后端直连)
  W->>W: 校验 → 映射本地用户(绑定 / 自动建号)→ 签发本地 JWT(idp)
  W-->>B: 302 /x + Set-Cookie weiran_token / weiran_csrf;清除 weiran_sso
```

## Data Flow

1. **authorize**(`@PublicApi` GET):
   - 校验 provider 存在且启用,把 `redirect` 规范化为站内路径;
   - bind 模式要求已登录:authorize 是同站导航,`weiran_token` 能带上,把当前 userId 写进流程状态;
   - 生成 `state`(32 字节随机)、`nonce`、PKCE `verifier`;流程状态 `SsoState{provider, state, nonce, verifier, redirect, mode, bindUserId, exp}` 签名后放进 `weiran_sso`;
   - 302 到 `provider.authorizeUrl(...)`:OIDC 带 `code_challenge` / `nonce` / `state`;CAS 带 `service=<publicBaseUrl>/api/auth/sso/{p}/callback?state=…`。
2. **callback**(`@PublicApi` GET):
   - 读取并验签 `weiran_sso`,核对 provider 与 `state`;
   - 调用 `provider.complete(params, ssoState)` 得到 `ExternalIdentity{provider, externalId, username, displayName, email}`:
     - OIDC:用授权码 + verifier 换 token,JWKS 验 id_token,校验 nonce;
     - CAS:用同一个 `service` 验票。
   - **login 模式**:
     - 按 `(provider, externalId)` 查绑定;
     - 查不到时,提供方开了 `auto-provision` 就建号,否则抛 40303;
     - 用户被禁用时抛 40301;
     - 收尾与密码登录共用:`recordLogin` → 签发(带 `idp`)→ 登录日志 → 下发 Cookie。
   - **bind 模式**:绑定到 `bindUserId`;外部身份已绑给别人时抛 40901;已绑给自己就当成功(幂等);写一条操作日志。
   - 清除 `weiran_sso`,302 到 `redirect`;bind 模式回到 `/profile?bound=<p>`。
   - 失败时清除 `weiran_sso`,302 到 `/login?ssoError=<code>`(bind 模式为 `/profile?ssoError=<code>`),并写失败的登录日志。
3. **登出**:`AuthController.logout` 照旧清除 Cookie,并按 `CurrentUser.idp` 取 `provider.logoutUrl(postLogoutRedirect=<publicBaseUrl>/login)`,返回 `{ssoLogoutUrl}`。

<!-- openspec:slot design-sections -->

## 跨模块契约变更(DS-1)

| 对象 | 文件 | 动作 | 消费方 |
|---|---|---|---|
| `EXTERNAL_AUTH_FAILED(40102, 401, "外部身份校验失败，请重新登录")`、`ACCOUNT_NOT_PROVISIONED(40303, 403, "账号未开通，请联系管理员")`、`PASSWORD_LOGIN_DISABLED(40304, 403, "密码登录已关闭，请使用统一身份登录")` | `weiran-common/.../CommonErrors.java` | 新增 | 基座、前端(`ssoError` 提示文案) |
| `LoginUser` 新增 `@Nullable String idp`(保留原 5 参构造器,`idp` 为 null) | `weiran-framework/.../auth/LoginUser.java` | 改造 | 基座认证器、`AuthController.logout` |
| `AuthCookies`:`SSO_COOKIE="weiran_sso"`;`ssoState(String value)`(Lax、HttpOnly、`Path=/api/auth/sso`、600s)/ `clearSsoState()` | `weiran-framework/.../auth/AuthCookies.java` | 新增方法 | `SsoController` |
| `TokenClaims` 增加 `@Nullable String idp`;JWT claim `idp` | domain / `JwtTokenCodec` | 改造 | 认证器把它带进 `LoginUser` |
| `ExternalLoginService`(api) | `weiran-base-api/.../auth/ExternalLoginService.java` | 新增 | adapter |
| 领域端口:`ExternalIdentityProvider{id(), type(), name(), autoProvision(), defaultRoleCodes(), authorizeUrl(SsoState, callbackUrl), complete(Map<String,String>, SsoState, callbackUrl) → ExternalIdentity, logoutUrl(String) → Optional<String>}`、`ExternalIdentityProviders`(注册表)、`UserIdentityRepository`、`SsoStateSigner` | `weiran-base-domain/.../identity/` | 新增 | application、infrastructure |
| `User.hasPassword()`;`UserRepository.insert` 允许空密码 | domain | 改造 | 认证、`/me` |

## API Design(DS-2)

| 路由 | 方法 | 所属模块 | 请求关键字段 | 返回关键字段 | 权限点 |
|---|---|---|---|---|---|
| `/api/auth/providers` | GET | `AuthController` | — | `{passwordLoginEnabled, providers:[{id, type, name}]}` | 🔓 |
| `/api/auth/sso/{provider}/authorize` | GET | `SsoController`(新) | `redirect?`、`mode=login\|bind` | 302 | 🔓(bind 模式内部要求已登录,否则 302 `/login?ssoError=40100`) |
| `/api/auth/sso/{provider}/callback` | GET | `SsoController` | OIDC:`code`、`state`(或 `error`);CAS:`ticket`、`state` | 302 | 🔓 |
| `/api/auth/identities` | GET | `AuthController` | — | `[{id, provider, providerName, externalId, displayName, createdAt}]` | 🔑 |
| `/api/auth/identities/{id}` | DELETE | `AuthController` | — | null;最后一个且无密码时 40901 | 🔑 + `@OperationLog` |
| `/api/users/{id}/identities` | GET | `UserController` | — | 同上 | `system:user:identity` |
| `/api/users/{id}/identities` | POST | `UserController` | `{provider, externalId, displayName?}` | `{id}`;冲突 40901,provider 未配置 40000 | `system:user:identity` + `@OperationLog` |
| `/api/users/{id}/identities/{identityId}` | DELETE | `UserController` | — | null(管理员可以解绑最后一个,前端二次确认) | `system:user:identity` + `@OperationLog` |
| `/api/auth/me` | GET | 改造 | — | 增加 `hasPassword: boolean` | 🔑 |
| `/api/auth/logout` | POST | 改造 | — | `{ssoLogoutUrl: string \| null}` | 🔑 |
| `/api/auth/login` | POST | 改造 | — | 开关关闭且不是内置超管时 40304 | 🔓 |

**配置**(`weiran.auth.*`):

```yaml
weiran:
  auth:
    public-base-url: ${WEIRAN_PUBLIC_BASE_URL:http://localhost:5373}   # 对外访问地址,用于拼回调与登出回跳
    password-login:
      enabled: ${WEIRAN_PASSWORD_LOGIN_ENABLED:true}
    providers: {}   # 部署时用环境变量填,例如:
    # WEIRAN_AUTH_PROVIDERS_KEYCLOAK_TYPE=oidc
    # WEIRAN_AUTH_PROVIDERS_KEYCLOAK_NAME=统一身份
    # WEIRAN_AUTH_PROVIDERS_KEYCLOAK_ISSUER=https://sso.example.com/realms/xx
    # WEIRAN_AUTH_PROVIDERS_KEYCLOAK_CLIENT_ID=weiran4j
    # WEIRAN_AUTH_PROVIDERS_KEYCLOAK_CLIENT_SECRET=...
    # WEIRAN_AUTH_PROVIDERS_KEYCLOAK_AUTO_PROVISION=false
    # WEIRAN_AUTH_PROVIDERS_KEYCLOAK_DEFAULT_ROLES=viewer
    # WEIRAN_AUTH_PROVIDERS_KEYCLOAK_LOGOUT=true
    # WEIRAN_AUTH_PROVIDERS_CAS_TYPE=cas / ..._SERVER_URL=https://cas.example.com/cas
```

- 提供方 id 只能是小写字母、数字和横线(2–32 位),它会出现在路径里。
- 提供方的配置写在环境变量里,不在 `application.yml` 里留 `${}` 占位符(提供方是部署相关的,而且数量不定),所以 `EnvExampleTest` 只覆盖 `WEIRAN_PUBLIC_BASE_URL` 与 `WEIRAN_PASSWORD_LOGIN_ENABLED`。`.env.example` 用注释给出提供方的示例,部署文档写全。
- OIDC 端点用 `issuer` 的 discovery 文档(`/.well-known/openid-configuration`)获取,惰性加载并缓存;JWKS 也缓存,按 `kid` 查不到时刷新一次。
- 默认 scope 为 `openid profile email`,可以用 `SCOPES` 覆盖。

## Database Design(DS-3)

| 表 | 动作 | 关键字段 | 索引 | 备注 |
|---|---|---|---|---|
| `sys_user_identity` | 新增 | `id`、`user_id`、`provider varchar(32)`、`external_id varchar(191)`、`display_name varchar(64) null`、`created_at`、`created_by` | `uk_sys_user_identity (provider, external_id)`、`idx_sys_user_identity_user_id (user_id)` | 不建外键(仓库约定);删除用户时由仓储连带删除 |
| `sys_menu` | 插入 | `(120, 3, '外部身份', 'button', 'system:user:identity', 5)` | — | 超管不需要写 `sys_role_menu` |

脚本:`weiran-base-infrastructure/src/main/resources/db/migration/system/V202610060001__system_user_identity.sql`。契约 §2.1 的菜单 id 用量从 119 改为 120,§5 增加表说明。

## 权限与已知缺口(DS-4)

| 项 | 设计 |
|---|---|
| 权限点 | `system:user:identity`:查看、绑定、解绑他人的外部身份。本人的查看、绑定、解绑只需要登录 |
| 菜单挂载 | 按钮行挂在用户管理(3)下 |
| `@OperationLog` | 管理员绑定 / 解绑、本人解绑都标注;本人绑定发生在 GET 回调里,由 `ExternalLoginService` 直接调用 `OperationLogRecorder` 写一条 |
| 已知缺口 | 没有后端通道 SLO:IdP 侧登出不会让本系统会话失效(本地令牌按 TTL 过期,或由管理员禁用);自动建号只给默认角色 |

## 分层与装配(DS-5)

| 项 | 设计 |
|---|---|
| domain | 新包 `com.weiran.system.domain.identity`:`UserIdentity`、`UserIdentityRepository`、`ExternalIdentity`、`ExternalIdentityProvider`、`ExternalIdentityProviders`、`SsoState`、`SsoStateSigner`、`SsoMode`、`RedirectPaths`(站内路径规范化,纯函数)、`ProvisionedUsername`(用户名规范化,纯函数) |
| application | `ExternalLoginApplicationService implements ExternalLoginService`。`AuthApplicationService` 抽出 `completeLogin(user, client, idp, message)`,密码登录和外部登录共用;加入密码登录开关;`authenticate` 先判 `hasPassword` |
| infrastructure | `identity/AuthProvidersProperties`(`weiran.auth.*`);`OidcIdentityProvider`(discovery、JWKS、PKCE、jjwt 的 `Locator<Key>`);`CasIdentityProvider`;`ConfiguredExternalIdentityProviders`(从配置构建、启动时校验);`HmacSsoStateSigner`(复用 `weiran.auth.jwt.secret` 派生的 HMAC 密钥,载荷是 JSON 的 base64url);`MybatisUserIdentityRepository`;迁移脚本 |
| adapter | `SsoController`(authorize / callback);`AuthController`(providers、identities、logout 响应);`UserController`(管理员接口) |
| 自动配置 | 现有的 `System*AutoConfiguration` 追加 `@Import` 与 Bean |

## 前端设计(DS-6)

| 项 | 内容 |
|---|---|
| 登录页 | 加载 `/providers`:<ul><li>每个提供方一个按钮,点击后 `location.assign('/api/auth/sso/{id}/authorize?redirect=…')`;</li><li>`passwordLoginEnabled=false` 时默认收起密码表单,只留一个「管理员应急登录」的折叠入口;</li><li>URL 带 `ssoError` 时显示对应提示(40102、40303、40301、40100)。</li></ul> |
| 个人中心 | 新增「外部账号」卡片:列出已绑定的,支持解绑;每个提供方一个「绑定」按钮(`mode=bind`)。读到 `?bound=`、`?ssoError=` 时给出提示并清理 URL。`hasPassword=false` 时修改密码区显示「未设置本地密码,可请管理员重置」 |
| 用户管理 | 行操作「外部身份」(受 `<Permission code="system:user:identity">` 控制)打开弹窗:列表 + 解绑 + 手工绑定表单(提供方下拉、外部用户标识) |
| 锁屏 | `hasPassword=false` 时不显示密码框,只有「重新登录」 |
| 登出 | `useAuth.logout` 读 `ssoLogoutUrl`,非空时清理本地会话后 `location.assign(ssoLogoutUrl)` |
| 类型与 hook | `types/api.ts`:`ProvidersView`、`UserIdentityView`、`CurrentUserView.hasPassword`、`LogoutResult`;`hooks/queries/identities.ts` |
| 组件登记 | 新组件(如 `ExternalAccountsCard`、`UserIdentitiesModal`)登记进 `rules/advisory/components.md` |

<!-- /openspec:slot design-sections -->

## 文档与决策

- **D-015 外部身份登录**:后端回调 + 签名的 Lax 流程 Cookie;只按 `(provider, external_id)` 映射,不自动关联同名用户;自动建号默认关闭;无本地密码用 `''` 表示;密码登录开关保留内置超管应急;CP-10 的有意偏离(40303)及理由。
- **契约**:§2.1 菜单用量改为 120;§4 新错误码;§5 新表;§6.1 / §6.2 新接口与改动;§3 `LoginUser.idp`。
- **部署文档**:新增「外部身份提供方」一节:
  - 环境变量写法;
  - 需要在 IdP 登记的回调地址 `<WEIRAN_PUBLIC_BASE_URL>/api/auth/sso/<id>/callback`;
  - OIDC 登出回跳地址 `<WEIRAN_PUBLIC_BASE_URL>/login`;
  - CAS 的 `service` 白名单。
- **`.env.example`**:新增两个变量,外加提供方的注释示例。按「整份重写」流程生成,由 `EnvExampleTest` 守住。
- **state**:`sys_user.md` 补充无本地密码用户与身份绑定;新增 `sys_user_identity.md`,并登记进 `bizs/README.md`。
- **`AGENTS.md`**:认证要点补外部登录;门禁表的 ③ 改为 ✅;分支保护(`artifact.md#12`)写明需要用户在 GitHub 设置里开启。

## Observability

- **日志**:
  - 外部登录成功 / 失败各打一行 INFO / WARN,含 provider 与错误码,**不含**任何票据或令牌;
  - discovery 与 JWKS 拉取失败打 ERROR,带提供方 id 与 HTTP 状态。
- **审计**:登录日志(成功和失败)、操作日志(绑定和解绑)。
- **排障**:回调失败时 `ssoError` 进入前端 URL,用户报出错误码;配合 requestId 检索。

## Test Plan

| 层级 | 范围 | 命令 |
|---|---|---|
| domain 单测 | `RedirectPaths`(各种恶意输入)、`ProvisionedUsername`、`User.hasPassword` | `./gradlew :weiran-base-domain:test` |
| infrastructure 单测 | `HmacSsoStateSigner`(篡改、过期);`CasIdentityProvider` 的验票响应解析(成功 / 失败 / 非 JSON);`OidcIdentityProvider` 的 id_token 校验(签名、aud、nonce、过期,用本地生成的 RSA 密钥和 JWKS) | `./gradlew :weiran-base-infrastructure:test` |
| application 单测 | 映射 / 建号 / 同名冲突 / 禁用;绑定冲突 / 防锁死;密码登录开关;无密码用户的 `authenticate` | `./gradlew :weiran-base-application:test` |
| 集成测试 | `OidcKeycloakIT`(Testcontainers `quay.io/keycloak/keycloak`,导入测试 realm;用 HTTP 客户端走完 authorize → 登录表单 → callback;state 篡改;登出地址);`CasLoginIT`(JDK HttpServer 模拟 CAS;成功、失败、自动建号、同名冲突、登录日志);`IdentityAdminIT`(管理员接口、权限、删除用户连带删除、本人解绑防锁死、`hasPassword`、密码登录开关) | `./gradlew :weiran-app:test` |
| 前端 | 登录页按钮与 `ssoError`;个人中心卡片;用户管理弹窗;锁屏分支;登出跳转 | `pnpm test` |
| 全量门禁 | — | `openspec/project.json` 的 build / test / lint |
| 真实浏览器 | 本机 `pnpm dev` + 本地 Keycloak 容器:外部登录 → 刷新 → 个人中心查看绑定 → 登出跳 Keycloak | 用 cmux 浏览器操作,结果记进 verify |

## Rollout Plan

1. Flyway 自动建表并插入按钮行。
2. 不配置任何提供方时,行为与现在完全一致:登录页没有外部按钮,密码登录照常。
3. 接入时:按部署文档在 IdP 登记回调地址,配置环境变量后重启;先开预先绑定,由管理员绑定;确认没问题后,按需打开自动建号或关闭密码登录。

## Rollback Plan

1. revert 锚点:本 change 的合并提交。
2. 迁移回滚策略:新表和按钮行可以保留(旧代码不读它们);如果要清理,另写一个追加脚本删除,不改已发布的迁移。
3. 回退后,无本地密码的自动建号用户无法登录,需要管理员重置密码。

## Open Questions

- 无

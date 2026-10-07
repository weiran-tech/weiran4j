---
status: "active"
---

# external-identity Specification

## Purpose
本能力长期负责「用外部身份提供方的账号登录本系统」:按配置接入 CAS 与标准 OIDC 提供方,经可校验的协议流程确认外部身份,
再通过绑定表把它映射到唯一的本地用户(预先绑定或按开关自动开通),之后照常签发本地令牌;同时管理无本地密码的用户、
密码登录开关与外部登出,保证接入外部身份不会削弱本地的吊销、防枚举与防冒名能力。

## Requirements

### Requirement: [FR-001] 提供方列表

系统 **MUST** 通过公开接口 `GET /api/auth/providers` 返回已启用的提供方 `[{id, type, name}]` 与 `passwordLoginEnabled`。**MUST NOT** 返回任何密钥或提供方的内部地址。

#### Scenario: 列出已配置的提供方
- **WHEN** 配置了一个 OIDC 提供方和一个 CAS 提供方后,未登录调用该接口
- **THEN** 返回两项,`type` 分别为 `oidc`、`cas`,不含 `clientSecret` 与任何 URL
- **判据**:集成测试断言响应 JSON 的键集合

### Requirement: [FR-002] OIDC 登录

OIDC 登录 **MUST** 使用授权码流程,带 PKCE(S256)、`state` 与 `nonce`;id_token **MUST** 用提供方 JWKS 校验签名、`iss`、`aud`、`exp`(允许 60s 偏差)与 `nonce`。
校验通过后 **MUST** 下发本地认证 Cookie,并 302 到站内 `redirect`;任何一项校验失败 **MUST** 302 到 `/login?ssoError=40102`,并且不下发认证 Cookie。

#### Scenario: 用 Keycloak 完成登录
- **WHEN** 已绑定的 Keycloak 用户走「authorize → Keycloak 登录 → callback」
- **THEN** 回调响应下发 `weiran_token` 与 `weiran_csrf` 并 302 到 `redirect`,随后 `/api/auth/me` 返回该本地用户
- **判据**:集成测试(Keycloak 容器)以 HTTP 客户端跟随整个流程并断言

#### Scenario: state 不符时拒绝
- **WHEN** 回调携带的 `state` 与流程 Cookie 里的不一致
- **THEN** 302 到 `/login?ssoError=40102`,没有认证 Cookie
- **判据**:集成测试断言 Location 头与 Set-Cookie

### Requirement: [FR-003] CAS 登录

CAS 登录 **MUST** 使用 CAS 3.0 的 `/p3/serviceValidate`(`format=JSON`)验票。`service` **MUST** 由配置的公开地址加 `state` 构成,验票时 **MUST** 使用与跳转时完全相同的 `service`。验票失败或 state 不符 **MUST** 得到 `ssoError=40102`。

#### Scenario: 模拟 CAS 验票成功
- **WHEN** 模拟的 CAS 对 ticket 返回 `authenticationSuccess`,user 已绑定
- **THEN** 登录成功,并且模拟服务收到的 `service` 参数与跳转时的一致
- **判据**:集成测试(JDK HttpServer 模拟 CAS)断言

#### Scenario: 模拟 CAS 验票失败
- **WHEN** 模拟的 CAS 返回 `authenticationFailure`
- **THEN** 302 到 `/login?ssoError=40102`
- **判据**:集成测试断言

### Requirement: [FR-004] 外部身份到本地用户的映射

外部身份 **MUST** 只按 `(provider, external_id)` 映射到本地用户。未绑定时:提供方关闭自动建号 **MUST** 拒绝(40303);开启自动建号 **MUST** 创建一个没有本地密码、带有配置的默认角色的本地用户并完成绑定。
本地已有同名用户且未绑定该外部身份时,**MUST NOT** 自动关联,**MUST** 返回 40303。

#### Scenario: 未绑定且未开启自动建号
- **WHEN** 未绑定的外部用户登录,提供方 `auto-provision=false`
- **THEN** 302 到 `/login?ssoError=40303`
- **判据**:集成测试断言

#### Scenario: 自动建号后第二次登录命中同一用户
- **WHEN** 开启自动建号的提供方上,新外部用户登录两次
- **THEN** 只创建一个本地用户,`hasPassword=false`,带默认角色;两次登录的 `/me.id` 相同
- **判据**:集成测试断言用户数与 id

#### Scenario: 同名本地用户不被自动关联
- **WHEN** 外部用户名与一个未绑定的本地用户同名,且开启了自动建号
- **THEN** 返回 40303,本地用户的绑定数仍为 0
- **判据**:集成测试断言

### Requirement: [FR-005] 绑定与解绑

已登录用户 **MUST** 能以 bind 模式走一次外部登录,把该外部身份绑定到自己;该外部身份已绑定到其他用户时 **MUST** 拒绝(40901)。用户 **MUST** 能解绑自己的外部身份;但没有本地密码且只剩最后一个外部身份时,**MUST** 拒绝解绑(40901)。
持有 `system:user:identity` 的管理员 **MUST** 能查看、手工绑定(提供方 + 外部用户标识)、解绑任意用户的外部身份;没有该权限 **MUST** 返回 40300。删除用户时 **MUST** 连带删除其绑定。

#### Scenario: 本人绑定
- **WHEN** 已用密码登录的用户发起 bind 模式并完成外部登录
- **THEN** `GET /api/auth/identities` 出现该绑定,且不改变当前会话的用户
- **判据**:集成测试断言

#### Scenario: 禁止解绑导致锁死
- **WHEN** 没有本地密码、只有一个外部身份的用户解绑它
- **THEN** 返回 40901,绑定仍在
- **判据**:集成测试断言

#### Scenario: 管理员手工绑定与权限
- **WHEN** 管理员 `POST /api/users/{id}/identities {provider, externalId}`;无权限用户调用同一接口
- **THEN** 前者成功,后者返回 40300
- **判据**:集成测试断言

### Requirement: [FR-006] 流程状态与重定向安全

authorize 与 callback 之间的流程状态 **MUST** 存在签名 Cookie `weiran_sso` 中:HttpOnly、`SameSite=Lax`、`Path=/api/auth/sso`、10 分钟有效。被篡改或过期 **MUST** 视为校验失败(40102)。
`redirect` **MUST** 只接受以单个 `/` 开头的站内路径,其它值 **MUST** 改为 `/`。

#### Scenario: 开放重定向被阻止
- **WHEN** 用 `redirect=https://evil.com`、`redirect=//evil.com` 发起 authorize
- **THEN** 流程 Cookie 里记录的 redirect 为 `/`
- **判据**:单测断言重定向规范化函数

#### Scenario: 篡改流程 Cookie
- **WHEN** 回调时 `weiran_sso` 的签名不对
- **THEN** 302 到 `/login?ssoError=40102`
- **判据**:单测或集成测试断言

### Requirement: [FR-007] 无本地密码的用户

没有本地密码的用户:
- `/me` **MUST** 返回 `hasPassword=false`;
- 用密码登录与 `verify-password` **MUST** 返回 40101,且仍跑一次 BCrypt;
- 修改密码 **MUST** 返回 40000「未设置本地密码」。

管理员重置密码后,该用户 **MUST** 获得本地密码。

#### Scenario: 自动建出的用户不能用密码登录
- **WHEN** 自动建号的用户以空密码或任意密码调用登录
- **THEN** 返回 40101
- **判据**:集成测试断言

### Requirement: [FR-008] 密码登录开关

`weiran.auth.password-login.enabled=false` 时,密码登录 **MUST** 只对内置超管(`is_builtin` 且持有 `super_admin`)开放;其他用户 **MUST** 得到 40304。`/providers` **MUST** 返回 `passwordLoginEnabled=false`。

#### Scenario: 关闭后普通用户被拒、内置超管可登录
- **WHEN** 开关关闭时,普通用户与 `admin` 分别用正确密码登录
- **THEN** 普通用户返回 40304,`admin` 登录成功
- **判据**:集成测试断言

### Requirement: [FR-009] 外部登出

外部登录签发的本地令牌 **MUST** 带 `idp` claim。登出响应 **MUST** 为 `{ssoLogoutUrl}`:会话来自配置了登出地址的提供方时为该地址(带回跳参数),否则为 `null`。

#### Scenario: 外部登录的会话登出时返回登出地址
- **WHEN** 经 Keycloak 登录后调用 `POST /api/auth/logout`
- **THEN** `data.ssoLogoutUrl` 指向 Keycloak 的 end_session 端点;密码登录的会话为 `null`
- **判据**:集成测试断言

### Requirement: [FR-010] 外部登录审计

外部登录成功和失败 **MUST** 写入 `sys_login_log`,`message` 含提供方 id。日志与登录日志 **MUST NOT** 出现 ticket、授权码、id_token 或 client_secret。

#### Scenario: 失败也留痕
- **WHEN** 一次 CAS 验票失败
- **THEN** 新增一条 `status=fail` 的登录日志,`message` 含提供方 id,不含 ticket
- **判据**:集成测试查询 `sys_login_log` 断言

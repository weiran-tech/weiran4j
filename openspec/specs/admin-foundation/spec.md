---
status: "active"
---

# admin-foundation Specification

## Purpose
本能力长期承担后台管理框架的底座职责：JWT 登录与令牌吊销、基于角色-菜单的权限模型（菜单驱动前端动态路由与按钮权限）、部门树、数据字典、系统配置，以及登录日志与操作日志两类审计。接口与字段的逐项定义见 `docs/01-架构与接口契约.md`（D-008 框架重写时建立），本 spec 只约束跨接口恒成立的行为。

## Requirements

### Requirement: [FR-001] 统一响应包络

所有 `/api/**` 接口 **MUST** 以 `{code, message, data}` 返回，成功时 `code` 为数字 `0`，失败时为五位数字错误码且前三位等于 HTTP 状态码。

#### Scenario: 成功响应的业务码是数字 0
- **WHEN** 已登录用户调用 `GET /api/auth/me`
- **THEN** 响应体 `code` 为数字 `0`，`data.username` 为当前用户名
- **判据**:集成测试断言 `$.code` 的 JSON 类型为 number 且值为 0

#### Scenario: 参数校验失败
- **WHEN** 调用 `POST /api/auth/login` 且 `username` 为空
- **THEN** 返回 HTTP 400，`code` 为 `40000`
- **判据**:响应状态 400 且 `$.code == 40000`

### Requirement: [FR-002] 登录与账号枚举防护

登录接口 **MUST** 对「用户名不存在」与「密码错误」返回同一错误码 `40101` 与同一 message,两种情况都要执行一次 BCrypt 校验,且无论成败都写入 `sys_login_log`。
只校验凭据的入口(`AuthService.authenticate`)**MUST** 遵守同样的规则;登录接口 **MUST** 复用它,而不是另写一份凭据校验。

#### Scenario: 用户名不存在与密码错误不可区分
- **WHEN** 分别用不存在的用户名、存在的用户名 + 错误密码调用登录
- **THEN** 两次均返回 HTTP 401、`code` 为 `40101`、message 相同
- **判据**:集成测试比对两次响应的 `code` 与 `message` 完全相等

#### Scenario: 内置管理员可登录
- **WHEN** 在全新库上以 `admin` / `admin123` 调用登录(带 `X-Auth-Mode: token`)
- **THEN** 返回 `accessToken`,用它以 Bearer 头调用 `/api/auth/me`,`permissions` 为 `["*"]`
- **判据**:集成测试依次断言登录 `code == 0`、`$.data.accessToken` 非空与 `$.data.permissions[0] == "*"`

### Requirement: [FR-003] 令牌吊销

修改密码、管理员重置密码、禁用账号 **MUST** 使该用户此前签发的全部本地令牌立即失效(`token_version` 递增)。
「立即」**MUST** 对所有服务实例成立:每次请求都必须从数据库读取令牌版本与账号状态来判定,**MUST NOT** 依赖进程内缓存。
角色与权限的变更允许最多 30 秒的生效延迟。

#### Scenario: 改密后旧令牌失效
- **WHEN** 用户调用 `PUT /api/auth/password` 成功后,再用旧令牌调用 `GET /api/auth/me`
- **THEN** 返回 HTTP 401、`code` 为 `40100`
- **判据**:集成测试断言旧令牌请求 `$.code == 40100`

#### Scenario: 其他实例的吊销在本实例立即生效
- **WHEN** 用户持有有效令牌并成功调用一次 `GET /api/auth/me`(本实例已缓存其快照),随后**绕过应用服务**直接在库中把该用户的 `token_version` 加 1(或把 `status` 改为 `disabled`)
- **THEN** 该用户的下一次请求返回 HTTP 401、`code` 为 `40100`
- **判据**:集成测试用 `JdbcTemplate` 直接改库,不调用任何缓存失效方法,断言下一次请求 `$.code == 40100`

### Requirement: [FR-004] 接口权限校验

标注 `@RequiresPermission` 的接口 **MUST** 拒绝未持有对应权限码的已登录用户（HTTP 403、`code` 为 `40300`），未登录请求 **MUST** 返回 HTTP 401；持有 `super_admin` 角色者放行一切。

#### Scenario: 无权限用户访问用户列表
- **WHEN** 一个未绑定任何角色的用户调用 `GET /api/users`
- **THEN** 返回 HTTP 403、`code` 为 `40300`
- **判据**:集成测试断言 `$.code == 40300`

#### Scenario: 未登录访问受保护接口
- **WHEN** 不带 `Authorization` 头调用 `GET /api/auth/me`
- **THEN** 返回 HTTP 401、`code` 为 `40100`
- **判据**:响应状态 401 且 `$.code == 40100`

### Requirement: [FR-005] 菜单驱动路由

`GET /api/auth/menus` **MUST** 返回当前用户可访问的 directory/menu 类型启用菜单树；前端 **MUST** 仅为其中 `type=menu` 且组件文件存在的节点注册路由，组件缺失时渲染占位而不崩溃。

#### Scenario: 种子菜单的组件全部存在
- **WHEN** 读取种子迁移中全部 `type=menu` 菜单的 `component`
- **THEN** 每一个都能在 `web/src/pages` 下解析到页面文件
- **判据**:`web` 的 page-registry 单测对全部种子 component 断言可解析

### Requirement: [FR-006] 树结构防环

菜单与部门的更新 **MUST** 拒绝把节点的 `parentId` 设为自身或其后代（HTTP 409、`code` 为 `40901`）；删除有子节点的菜单/部门 **MUST** 被拒绝。

#### Scenario: 部门挂到自己的后代下
- **WHEN** 把部门 A 的 `parentId` 更新为 A 的子部门 B
- **THEN** 返回 `code` 为 `40901`，A 的父节点不变
- **判据**:集成测试断言 `$.code == 40901` 且随后查询 A 的 `parentId` 未变

### Requirement: [FR-007] 内置数据保护

内置用户、角色、字典、配置（`is_builtin`）**MUST NOT** 被删除；内置管理员 **MUST** 始终保留 `super_admin` 角色。

#### Scenario: 删除内置角色被拒绝
- **WHEN** 调用 `DELETE /api/roles/{super_admin 的 id}`
- **THEN** 返回 `code` 为 `40901`，角色仍存在
- **判据**:集成测试断言 `$.code == 40901` 且随后 `GET /api/roles/{id}` 的 `code == 0`

### Requirement: [FR-008] 操作审计

标注 `@OperationLog` 的写接口 **MUST** 在 `sys_operation_log` 留下记录（含用户、路径、耗时、成功与否），请求体中的密码与令牌字段 **MUST** 以 `******` 代替；日志落库失败 **MUST NOT** 影响业务响应。

#### Scenario: 新增用户后可查到脱敏的操作日志
- **WHEN** 管理员调用 `POST /api/users`（请求体含 `password`）
- **THEN** 稍后 `GET /api/operation-logs` 可查到该记录，其 `requestBody` 不含明文密码
- **判据**:集成测试轮询等待记录出现，并断言 `requestBody` 包含 `******` 且不含明文密码

### Requirement: [FR-009] 令牌签发方与受众校验

本地签发的 JWT **MUST** 携带 `iss` 与 `aud`,取值来自配置(默认均为 `weiran4j`)。
认证 **MUST** 按 `iss` 选择对应的校验器;`iss` 缺失、无对应校验器或 `aud` 不含本系统的令牌 **MUST** 被视为无效(HTTP 401、`code` 为 `40100`)。

#### Scenario: 新签发令牌带签发方与受众
- **WHEN** 以 `X-Auth-Mode: token` 登录,解码返回的 `accessToken` 载荷
- **THEN** 载荷中 `iss == "weiran4j"` 且 `aud` 含 `"weiran4j"`
- **判据**:单测或集成测试解码载荷断言两个字段的值

#### Scenario: 签发方或受众不符的令牌被拒
- **WHEN** 用同一密钥签发 `iss` 缺失、`iss = "other"`、`aud = "other"` 的三个令牌,分别以 Bearer 头调用 `GET /api/auth/me`
- **THEN** 三次均返回 HTTP 401、`code` 为 `40100`
- **判据**:测试断言三次响应的 `$.code == 40100`

### Requirement: [FR-010] 令牌交付与携带方式

登录成功时,服务端 **MUST** 默认以 Cookie 交付令牌,响应体 **MUST NOT** 含 `accessToken`。下发两个 Cookie:
- 认证 Cookie `weiran_token`:`HttpOnly`、`SameSite=Strict`、`Path=/api`、`Max-Age` 等于令牌有效期;
- `weiran_csrf`:非 HttpOnly、`SameSite=Strict`、`Path=/`,值为 `<userId>.<随机串>`。

两者的 `Secure` 属性都由配置决定。请求带 `X-Auth-Mode: token` 时,服务端 **MUST** 把 `accessToken` 放进响应体,并且 **MUST NOT** 下发任何 Cookie。
受保护接口 **MUST** 接受两种携带方式:`Authorization: Bearer` 头,或认证 Cookie;两者同时存在时以 Bearer 头为准。
登出 **MUST** 以 `Max-Age=0` 清除这两个 Cookie。
前端 **MUST NOT** 把令牌存入任何 JS 可读的存储,也 **MUST NOT** 自行发送 `Authorization` 头。

#### Scenario: 浏览器默认登录只下发 Cookie
- **WHEN** 不带 `X-Auth-Mode` 头调用登录成功
- **THEN** 响应体 `data` 没有 `accessToken`;`Set-Cookie` 中有 `weiran_token`(含 `HttpOnly`、`SameSite=Strict`、`Path=/api`)与 `weiran_csrf`(不含 `HttpOnly`,含 `Path=/`)
- **判据**:集成测试解析响应头逐项断言属性,并断言 `$.data.accessToken` 不存在

#### Scenario: 只凭 Cookie 即可访问受保护接口
- **WHEN** 用上一步拿到的两个 Cookie、不带 `Authorization` 头调用 `GET /api/auth/me`
- **THEN** 返回 `code == 0`
- **判据**:集成测试断言 `$.code == 0`

#### Scenario: 令牌模式登录不下发 Cookie
- **WHEN** 带 `X-Auth-Mode: token` 调用登录成功
- **THEN** 响应体含 `accessToken`,响应头没有 `Set-Cookie`
- **判据**:集成测试断言 `$.data.accessToken` 非空且 `Set-Cookie` 头不存在

#### Scenario: 登出清除 Cookie
- **WHEN** 以 Cookie 方式登录后调用 `POST /api/auth/logout`(带正确的 CSRF 头)
- **THEN** 响应的 `Set-Cookie` 把 `weiran_token` 与 `weiran_csrf` 都设为 `Max-Age=0`
- **判据**:集成测试断言两个 Cookie 的 `Max-Age=0`

#### Scenario: 前端不再持有令牌
- **WHEN** 检索 `web/src` 下的非测试源码
- **THEN** 没有用 `localStorage` 读写令牌,也没有设置 `Authorization` 请求头
- **判据**:`grep -rnE "Authorization|weiran_token|TOKEN_KEY" web/src --include='*.ts' --include='*.tsx' --exclude-dir=__tests__` 无匹配

### Requirement: [FR-011] CSRF 双提交校验

由认证 Cookie 完成认证的 `POST` / `PUT` / `PATCH` / `DELETE` 请求 **MUST** 带 `X-CSRF-Token` 请求头,且其值与 `weiran_csrf` Cookie 完全相等;否则 **MUST** 返回 HTTP 403、`code` 为 `40302`,并且不执行业务逻辑。
`GET` / `HEAD` / `OPTIONS` 请求和由 Bearer 头认证的请求 **MUST NOT** 做此校验。
前端 **MUST** 在每个写请求上自动带上该头。

#### Scenario: Cookie 认证的写请求缺少 CSRF 头
- **WHEN** 只带两个 Cookie、不带 `X-CSRF-Token` 调用 `PUT /api/auth/profile`
- **THEN** 返回 HTTP 403、`code` 为 `40302`,随后 `/api/auth/me` 的昵称未变
- **判据**:集成测试断言 `$.code == 40302` 并复查资料未变

#### Scenario: CSRF 头与 Cookie 不一致
- **WHEN** 带两个 Cookie,`X-CSRF-Token` 填一个不同的值,调用 `PUT /api/auth/profile`
- **THEN** 返回 HTTP 403、`code` 为 `40302`
- **判据**:集成测试断言 `$.code == 40302`

#### Scenario: Bearer 头认证的写请求不查 CSRF
- **WHEN** 以 `X-Auth-Mode: token` 登录,用 Bearer 头、不带 CSRF 头调用 `PUT /api/auth/profile`
- **THEN** 返回 `code == 0`
- **判据**:集成测试断言 `$.code == 0`

#### Scenario: 前端写请求自动带 CSRF 头
- **WHEN** 已登录状态下前端通过 `http.put` 发出请求
- **THEN** 请求头 `X-CSRF-Token` 等于 `weiran_csrf` Cookie 的值;`http.get` 不带该头
- **判据**:`web/src/utils/__tests__/request.test.ts` 断言 fetch 调用的 headers

### Requirement: [FR-012] 只校验凭据的认证入口

`AuthService` **MUST** 提供 `authenticate(username, password, client)`:凭据有效且账号启用时返回用户标识,**MUST NOT** 签发令牌,也 **MUST NOT** 写成功登录日志;失败时 **MUST** 写失败登录日志,用户名不存在与密码错误都抛 `40101`,账号禁用抛 `40301`。

#### Scenario: 校验成功不产生令牌与成功日志
- **WHEN** 用正确的凭据调用 `authenticate`
- **THEN** 返回该用户的 id 与用户名;`sys_login_log` 中没有新增成功记录
- **判据**:应用层单测断言返回值,并断言 `LoginLogRepository.append` 未被以成功状态调用,`TokenCodec.issue` 未被调用

#### Scenario: 校验失败写失败日志
- **WHEN** 用不存在的用户名调用 `authenticate`
- **THEN** 抛出 `code` 为 `40101` 的异常,并写一条失败的登录日志
- **判据**:应用层单测断言异常码,以及 `append` 被以失败状态调用一次

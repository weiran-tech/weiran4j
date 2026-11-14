---
status: "active"
---

# admin-foundation Specification

## Purpose
本能力长期承担后台管理框架的底座职责：JWT 登录与令牌吊销、基于角色-菜单的权限模型（菜单驱动前端动态路由与按钮权限）、数据字典、系统配置，以及登录日志与操作日志两类审计。接口与字段的逐项定义见 `docs/01-架构与接口契约.md`（D-008 框架重写时建立），本 spec 只约束跨接口恒成立的行为。

## Requirements

### Requirement: [FR-001] 统一响应包络

所有 `/api-backend/**` 接口 **MUST** 以统一包络返回。成功时 **MUST** 为 `{code, message, data}`,`code` 为数字 `0`,**MUST NOT** 带其它键。失败时 **MUST** 为 `{code, message, data, requestId}`:`code` 为六位数字错误码，依次表示服务、资源、错误各两位，HTTP 状态由错误定义独立指定;`data` 为 `null`;`requestId` 与该响应的 `X-Request-Id` 头相同。

#### Scenario: 成功响应的业务码是数字 0
- **WHEN** 已登录用户调用 `GET /api-backend/auth/me`
- **THEN** 响应体 `code` 为数字 `0`,`data.username` 为当前用户名,且响应体没有 `requestId` 键
- **判据**:集成测试断言 `$.code` 的 JSON 类型为 number 且值为 0,`$.requestId` 不存在

#### Scenario: 参数校验失败
- **WHEN** 调用 `POST /api-backend/n/auth/login` 且 `username` 为空
- **THEN** 返回 HTTP 400,`code` 为 `100001`,`requestId` 等于响应头 `X-Request-Id`
- **判据**:响应状态 400、`$.code == 100001`,且 `$.requestId` 与响应头相等

#### Scenario: 拦截器拒绝时的失败体也带请求号
- **WHEN** 不带令牌调用 `GET /api-backend/auth/me`,以及无权限用户调用 `GET /api-backend/users`
- **THEN** 分别返回 100101 与 100102,两个响应体都带非空的 `requestId`,且与各自的响应头一致
- **判据**:集成测试断言两次响应的 `$.requestId` 都等于各自的 `X-Request-Id` 头

### Requirement: [FR-002] 登录与账号枚举防护

登录接口 **MUST** 对「用户名不存在」与「密码错误」返回同一错误码 `110101` 与同一 message,两种情况都要执行一次 BCrypt 校验,且无论成败都写入 `sys_login_log`。
只校验凭据的入口(`AuthService.authenticate`)**MUST** 遵守同样的规则;登录接口 **MUST** 复用它,而不是另写一份凭据校验。

#### Scenario: 用户名不存在与密码错误不可区分
- **WHEN** 分别用不存在的用户名、存在的用户名 + 错误密码调用登录
- **THEN** 两次均返回 HTTP 401、`code` 为 `110101`、message 相同
- **判据**:集成测试比对两次响应的 `code` 与 `message` 完全相等

#### Scenario: 内置管理员可登录
- **WHEN** 在全新库上以 `admin` / `admin123` 调用登录(带 `X-Auth-Mode: token`)
- **THEN** 返回 `accessToken`,用它以 Bearer 头调用 `/api-backend/auth/me`,`permissions` 为 `["*"]`
- **判据**:集成测试依次断言登录 `code == 0`、`$.data.accessToken` 非空与 `$.data.permissions[0] == "*"`

### Requirement: [FR-003] 令牌吊销

修改密码、管理员重置密码、禁用账号 **MUST** 使该用户此前签发的全部本地令牌立即失效(`token_version` 递增)。
「立即」**MUST** 对所有服务实例成立:每次请求都必须从数据库读取令牌版本与账号状态来判定,**MUST NOT** 依赖进程内缓存。
角色与权限的变更允许最多 30 秒的生效延迟。

#### Scenario: 改密后旧令牌失效
- **WHEN** 用户调用 `PUT /api-backend/auth/password` 成功后,再用旧令牌调用 `GET /api-backend/auth/me`
- **THEN** 返回 HTTP 401、`code` 为 `100101`
- **判据**:集成测试断言旧令牌请求 `$.code == 100101`

#### Scenario: 其他实例的吊销在本实例立即生效
- **WHEN** 用户持有有效令牌并成功调用一次 `GET /api-backend/auth/me`(本实例已缓存其快照),随后**绕过应用服务**直接在库中把该用户的 `token_version` 加 1(或把 `status` 改为 `disabled`)
- **THEN** 该用户的下一次请求返回 HTTP 401、`code` 为 `100101`
- **判据**:集成测试用 `JdbcTemplate` 直接改库,不调用任何缓存失效方法,断言下一次请求 `$.code == 100101`

### Requirement: [FR-004] 接口权限校验

标注 `@RequiresPermission` 的接口 **MUST** 拒绝未持有对应权限码的已登录用户（HTTP 403、`code` 为 `100102`），未登录请求 **MUST** 返回 HTTP 401；持有 `super_admin` 角色者放行一切。

#### Scenario: 无权限用户访问用户列表
- **WHEN** 一个未绑定任何角色的用户调用 `GET /api-backend/users`
- **THEN** 返回 HTTP 403、`code` 为 `100102`
- **判据**:集成测试断言 `$.code == 100102`

#### Scenario: 未登录访问受保护接口
- **WHEN** 不带 `Authorization` 头调用 `GET /api-backend/auth/me`
- **THEN** 返回 HTTP 401、`code` 为 `100101`
- **判据**:响应状态 401 且 `$.code == 100101`

### Requirement: [FR-005] 菜单驱动路由

当前用户菜单接口 **MUST** 返回当前用户可访问的 directory/menu 类型启用菜单树；前端 **MUST** 仅为其中 `type=menu` 且组件文件存在的节点注册路由，组件缺失时渲染占位而不崩溃。

角色创建/编辑、删除和分配菜单成功后，前端 **MUST** 使当前会话的用户资料和菜单查询失效并重新读取，使导航和权限按钮采用更新后的授权；写入失败 **MUST NOT** 因该次失败触发身份查询失效。既有角色资源缓存失效行为 **MUST** 保留。

#### Scenario: 种子菜单的组件全部存在
- **WHEN** 读取种子迁移中全部 `type=menu` 菜单的 `component`
- **THEN** 每一个都能在 `packages/manage/src/pages` 下解析到页面文件
- **判据**:前端 page-registry 单测对全部种子 component 断言可解析。

#### Scenario: 角色变更后同步当前界面权限
- **WHEN** 当前会话成功创建/编辑角色、删除角色或分配菜单
- **THEN** 当前会话的资料和菜单被重新获取，导航和 Permission 按钮随新结果更新，无需手工刷新。
- **判据**:回归覆盖各 mutation 的缓存失效与活动查询重新读取，并验证权限按钮/导航由可见变为隐藏或相反。

#### Scenario: 角色写入失败保持已有身份快照
- **WHEN** 角色写入请求失败
- **THEN** 不因该失败清除或主动重取当前身份查询。
- **判据**:测试对失败 mutation 断言没有对应的身份查询失效和额外读取。

### Requirement: [FR-006] 树结构防环

菜单更新 **MUST** 拒绝把节点的 `parentId` 设为自身或其后代（HTTP 409、`code` 为 `100004`）；删除有子节点的菜单 **MUST** 被拒绝。

#### Scenario: 菜单挂到自己的后代下
- **WHEN** 把菜单 A 的 `parentId` 更新为 A 的子菜单 B
- **THEN** 返回 `code` 为 `100004`，A 的父节点不变
- **判据**:集成测试断言 `$.code == 100004` 且随后查询 A 的 `parentId` 未变

### Requirement: [FR-007] 内置数据保护

内置用户、角色、字典、配置（`is_builtin`）**MUST NOT** 被删除；内置管理员 **MUST** 始终保留 `super_admin` 角色。

#### Scenario: 删除内置角色被拒绝
- **WHEN** 调用 `DELETE /api-backend/roles/{super_admin 的 id}`
- **THEN** 返回 `code` 为 `100004`，角色仍存在
- **判据**:集成测试断言 `$.code == 100004` 且随后 `GET /api-backend/roles/{id}` 的 `code == 0`

### Requirement: [FR-008] 操作审计

标注 `@OperationLog` 的写接口 **MUST** 在 `sys_operation_log` 留下记录（含用户、路径、耗时、成功与否），请求体中的密码与令牌字段 **MUST** 以 `******` 代替；日志落库失败 **MUST NOT** 影响业务响应。

#### Scenario: 新增用户后可查到脱敏的操作日志
- **WHEN** 管理员调用 `POST /api-backend/users`（请求体含 `password`）
- **THEN** 稍后 `GET /api-backend/operation-logs` 可查到该记录，其 `requestBody` 不含明文密码
- **判据**:集成测试轮询等待记录出现，并断言 `requestBody` 包含 `******` 且不含明文密码

### Requirement: [FR-009] 令牌签发方与受众校验

本地签发的 JWT **MUST** 携带 `iss` 与 `aud`,取值来自配置(默认均为 `weiran4j`)。
认证 **MUST** 按 `iss` 选择对应的校验器;`iss` 缺失、无对应校验器或 `aud` 不含本系统的令牌 **MUST** 被视为无效(HTTP 401、`code` 为 `100101`)。

#### Scenario: 新签发令牌带签发方与受众
- **WHEN** 以 `X-Auth-Mode: token` 登录,解码返回的 `accessToken` 载荷
- **THEN** 载荷中 `iss == "weiran4j"` 且 `aud` 含 `"weiran4j"`
- **判据**:单测或集成测试解码载荷断言两个字段的值

#### Scenario: 签发方或受众不符的令牌被拒
- **WHEN** 用同一密钥签发 `iss` 缺失、`iss = "other"`、`aud = "other"` 的三个令牌,分别以 Bearer 头调用 `GET /api-backend/auth/me`
- **THEN** 三次均返回 HTTP 401、`code` 为 `100101`
- **判据**:测试断言三次响应的 `$.code == 100101`

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
- **WHEN** 用上一步拿到的两个 Cookie、不带 `Authorization` 头调用 `GET /api-backend/auth/me`
- **THEN** 返回 `code == 0`
- **判据**:集成测试断言 `$.code == 0`

#### Scenario: 令牌模式登录不下发 Cookie
- **WHEN** 带 `X-Auth-Mode: token` 调用登录成功
- **THEN** 响应体含 `accessToken`,响应头没有 `Set-Cookie`
- **判据**:集成测试断言 `$.data.accessToken` 非空且 `Set-Cookie` 头不存在

#### Scenario: 登出清除 Cookie
- **WHEN** 以 Cookie 方式登录后调用 `POST /api-backend/auth/logout`(带正确的 CSRF 头)
- **THEN** 响应的 `Set-Cookie` 把 `weiran_token` 与 `weiran_csrf` 都设为 `Max-Age=0`
- **判据**:集成测试断言两个 Cookie 的 `Max-Age=0`

#### Scenario: 前端不再持有令牌
- **WHEN** 检索 `backend/src` 下的非测试源码
- **THEN** 没有用 `localStorage` 读写令牌,也没有设置 `Authorization` 请求头
- **判据**:`grep -rnE "Authorization|weiran_token|TOKEN_KEY" backend/src --include='*.ts' --include='*.tsx' --exclude-dir=__tests__` 无匹配

### Requirement: [FR-011] CSRF 双提交校验

由认证 Cookie 完成认证的 `POST` / `PUT` / `PATCH` / `DELETE` 请求 **MUST** 带 `X-CSRF-Token` 请求头,且其值与 `weiran_csrf` Cookie 完全相等;否则 **MUST** 返回 HTTP 403、`code` 为 `100103`,并且不执行业务逻辑。
`GET` / `HEAD` / `OPTIONS` 请求和由 Bearer 头认证的请求 **MUST NOT** 做此校验。
前端 **MUST** 在每个写请求上自动带上该头。

#### Scenario: Cookie 认证的写请求缺少 CSRF 头
- **WHEN** 只带两个 Cookie、不带 `X-CSRF-Token` 调用 `PUT /api-backend/auth/profile`
- **THEN** 返回 HTTP 403、`code` 为 `100103`,随后 `/api-backend/auth/me` 的昵称未变
- **判据**:集成测试断言 `$.code == 100103` 并复查资料未变

#### Scenario: CSRF 头与 Cookie 不一致
- **WHEN** 带两个 Cookie,`X-CSRF-Token` 填一个不同的值,调用 `PUT /api-backend/auth/profile`
- **THEN** 返回 HTTP 403、`code` 为 `100103`
- **判据**:集成测试断言 `$.code == 100103`

#### Scenario: Bearer 头认证的写请求不查 CSRF
- **WHEN** 以 `X-Auth-Mode: token` 登录,用 Bearer 头、不带 CSRF 头调用 `PUT /api-backend/auth/profile`
- **THEN** 返回 `code == 0`
- **判据**:集成测试断言 `$.code == 0`

#### Scenario: 前端写请求自动带 CSRF 头
- **WHEN** 已登录状态下前端通过 `http.put` 发出请求
- **THEN** 请求头 `X-CSRF-Token` 等于 `weiran_csrf` Cookie 的值;`http.get` 不带该头
- **判据**:`backend/src/utils/__tests__/request.test.ts` 断言 fetch 调用的 headers

### Requirement: [FR-012] 只校验凭据的认证入口

`AuthService` **MUST** 提供 `authenticate(username, password, client)`:凭据有效且账号启用时返回用户标识,**MUST NOT** 签发令牌,也 **MUST NOT** 写成功登录日志;失败时 **MUST** 写失败登录日志,用户名不存在与密码错误都抛 `110101`,账号禁用抛 `110103`。

#### Scenario: 校验成功不产生令牌与成功日志
- **WHEN** 用正确的凭据调用 `authenticate`
- **THEN** 返回该用户的 id 与用户名;`sys_login_log` 中没有新增成功记录
- **判据**:应用层单测断言返回值,并断言 `LoginLogRepository.append` 未被以成功状态调用,`TokenCodec.issue` 未被调用

#### Scenario: 校验失败写失败日志
- **WHEN** 用不存在的用户名调用 `authenticate`
- **THEN** 抛出 `code` 为 `110101` 的异常,并写一条失败的登录日志
- **判据**:应用层单测断言异常码,以及 `append` 被以失败状态调用一次

### Requirement: [FR-013] 分组式系统配置表单

字典与系统配置分组 **MUST** 共用 `sys_group` 表，且不得保留独立 `sys_dict` 主表。`sys_group.type` **MUST** 支持 `config` 与 `dict`，唯一键为 `(type, group_key, code)`；既有字典记录迁移后为 `type=dict`，配置分组为 `type=config`。系统配置组使用 `group_key=config_system`，短信配置组使用 `group_key=config_sms`，两者允许同名编码。字典项继续存于 `sys_dict_item`，数据库列 `group_id` 引用对应 `type=dict` 的组 ID；既有 HTTP 字段 `dictId` 保持兼容。字典 API **MUST** 只查询和修改 `dict` 类型组，配置 API **MUST** 只查询和引用 `config` 类型组。系统配置页面 **MUST** 在左侧展示适用于系统配置的启用配置组导航，在右侧展示当前组选中的配置项及其表单；短信配置项使用 `sms.` 键前缀并由独立短信配置页面展示，不能出现在系统配置表单中。每个配置项的表单字段类型、选项与必填规则 **MUST** 决定控件渲染和前后端校验。支持单行输入、多行文本、数字、布尔开关、下拉选择和 JSON 字段，值类型必须与字段类型兼容。配置键 **MUST** 遵循 `{range}.{group}.{value}`，其中 `range` 为 `system` 或 `sms`，`group` 与配置项所属 `sys_group.code` 相同，`value` 为组内编码；新建配置及修改配置键或分组时必须校验。既有不合规自定义键允许原位改值。内置配置 **MUST** 保留键名且不可删除。内置标题配置 **MUST** 使用 `system.general.title` 并归属系统配置的 `general` 组；系统配置 **MUST NOT** 保留 `site` 组。匿名配置读取 **MUST** 只允许 `system.general.title`，且不隐式改变前端展示。系统站点内容配置及其存储表 **MUST NOT** 存在。

#### Scenario: 配置 API 统一使用 system 路径
- **WHEN** 客户端访问配置列表、分组、全量、详情、写入或公开读取接口
- **THEN** 请求通过 `/api-backend/system/config/{action}[/{id}]` 路由处理
- **判据**:所有 ConfigController 路由均为 `/api-backend/system/config/{action}[/{id}]` 结构，前端不再请求 `/api-backend/configs/**`；不存在挂在 `/api-backend/system/config` 根路径的接口

#### Scenario: 按类型查询配置组并显示双栏页面
- **WHEN** 管理员打开系统配置页面
- **THEN** 左侧显示启用的系统配置组，右侧显示当前分组的非短信配置项，并按配置元数据渲染字段控件和必填/选项校验；`config_sms` 短信配置域不显示在此页面
- **判据**:`GET /api-backend/system/config/listGroups` 仍返回 `config` 类型启用组；页面隐藏短信模板专用组与 `sms.` 配置项

#### Scenario: 从配置侧栏新增分组
- **WHEN** 有配置创建权限的管理员从分组侧栏新增一个分组
- **THEN** 分组以 `type=config`、启用状态保存，并在刷新后显示且自动选中
- **判据**:`createGroup` 拒绝非法或重复编码；字典 API 不返回该分组

#### Scenario: 新增配置项默认沿用当前分组
- **WHEN** 管理员选中一个配置分组并点击新增配置项
- **THEN** 新增表单的分组字段默认选中该组
- **判据**:表单提交时 `groupKey` 等于当前选中分组编码

#### Scenario: 配置项标题与字段设置操作
- **WHEN** 管理员查看右侧配置项表单
- **THEN** 配置键不在页面标题中展示，内置状态以标签显示；字段设置入口使用设置图标并紧随必填标记，且仅在鼠标悬停或键盘聚焦标题时绝对定位显示，不占据标题布局空间；删除按钮在字段设置弹窗内始终可见
- **判据**:配置项标题显示说明文案；编辑弹窗中无删除权限或记录为内置项时删除按钮置灰，其他情况可用

#### Scenario: 新增配置项放在分组标题栏
- **WHEN** 管理员查看配置项分组内容
- **THEN** 新增配置项按钮与当前分组标题位于同一行并靠右显示，按钮包含添加图标
- **判据**:按钮位于 `PageContainer` 标题栏的 `extra` 区域并受创建权限控制

#### Scenario: 配置分组显示元数据并编辑名称
- **WHEN** 管理员查看配置分组侧栏或选中一个分组
- **THEN** 侧栏条目显示创建时间和内置状态并提供受更新/删除权限控制的编辑和删除操作；右侧只显示分组名称，不重复时间、内置或可删除状态
- **判据**:`listGroups` 返回 `createdAt`、`isBuiltin`、`canDelete`；`updateGroup/{key}` 只允许修改名称，编码不变；内置或仍有配置项的分组标记为不可删除

#### Scenario: 配置分组列表沿用字典列表交互
- **WHEN** 管理员查看系统配置左侧分组列表
- **THEN** 列表使用与字典列表相同的名称/编码搜索、回车提交、分页和每页条数控制；条目选择、元信息布局、标题栏操作菜单及响应式宽度保持一致
- **判据**:搜索清空后回车恢复完整分组列表；分页切换后默认选中当前页第一组；创建分组后自动选中并定位到新分组所在页

#### Scenario: 删除空的自定义配置分组
- **WHEN** 有删除权限的管理员删除一个非内置且没有配置项的分组
- **THEN** 系统删除该分组并刷新分组列表
- **判据**:`DELETE /api-backend/system/config/deleteGroup/{key}` 成功；内置分组或含配置项的分组返回 100004；无删除权限返回 100102

#### Scenario: 配置项使用共享分组
- **WHEN** 管理员新增带 `system.` 键前缀的配置项并选择一个启用的 `config` 分组
- **THEN** 配置项被保存并显示在该分组表单中
- **判据**:重新查询后字段元数据完整保留；无效、停用或 `dict` 类型分组会被服务端拒绝

#### Scenario: 字典与配置共用分组表并按类型隔离
- **WHEN** 数据库迁移从既有版本升级
- **THEN** 原字典记录保留 ID 并迁入 `sys_group`，标记 `type=dict`；新增配置分组标记 `type=config`
- **判据**:`sys_dict` 表不存在；`sys_group` 唯一约束包含 `type,group_key,code`；`sys_dict_item.group_id` 保留原关联值并关联原字典 ID

#### Scenario: 字典 API 只操作 dict 类型分组
- **WHEN** 字典列表、编码查询、创建、修改或删除被调用
- **THEN** 这些操作只作用于 `type=dict` 记录，字典项仍按对应组 ID 查询
- **判据**:字典 API 不返回配置组；配置组 CRUD 不会被字典 API 修改或删除

#### Scenario: 用户分组提供手机号验证码登录开关
- **WHEN** 数据库迁移创建内置系统配置
- **THEN** `system.user.enable_phone_login` 以 `user` 分组的布尔开关呈现，初始值为 `false`
- **判据**:系统配置接口返回该内置配置，用户组页面显示关闭状态

#### Scenario: 移除站点内容配置
- **WHEN** 管理员使用当前版本数据库迁移
- **THEN** 站点内容配置菜单与 `sys_site_config` 表被移除
- **判据**:菜单不再返回站点配置，数据库不存在该表

### Requirement: [FR-014] 用户列表查询反馈与恢复

用户管理页面 **MUST** 区分请求失败、成功无记录和成功无匹配结果；查询失败时持续显示错误与重试入口，后台刷新失败时保留已有数据并明确告知更新失败。重试 **MUST** 沿用当前已生效筛选和分页，成功后清除错误反馈；无匹配结果 **MUST** 提供清空条件入口。

#### Scenario: 首次查询失败后重试成功
- **WHEN** 用户列表首次查询失败，用户随后点击重试且请求成功
- **THEN** 失败阶段显示持久错误提示而非无记录提示，重试后显示返回数据且错误消失。
- **判据**: 组件测试模拟先失败后成功，断言错误提示、重试请求参数、数据行和错误提示移除。

#### Scenario: 后台刷新失败保留已有数据
- **WHEN** 已展示用户数据后，同一查询刷新失败
- **THEN** 页面仍显示已有数据，并显示更新失败与重试入口。
- **判据**: 组件测试断言刷新失败后旧用户行仍存在，并可点击重试。

#### Scenario: 空结果与查询条件对应
- **WHEN** 用户列表成功返回空列表
- **THEN** 无条件查询显示无记录；有条件查询显示无匹配结果，清空条件后回到未筛选第一页。
- **判据**: 组件测试分别断言两种空态文案，并验证清空条件的请求参数。

### Requirement: [FR-015] 用户编辑弹窗输入保护

用户新增和编辑弹窗 **MUST** 在内容相较初值实际改变时，关闭前要求确认放弃；继续编辑 **MUST** 保留输入，无改动或恢复初值时 **MUST** 直接关闭。保存请求进行中 **MUST** 阻止关闭和重复提交，失败保留输入，成功正常关闭且不触发放弃确认。保护过程 **MUST NOT** 持久化或记录表单草稿。

#### Scenario: 有改动时继续编辑或放弃
- **WHEN** 用户修改字段后点击取消、关闭按钮或按 Esc
- **THEN** 弹出放弃修改确认；选择继续编辑保留字段，确认放弃才关闭原表单。
- **判据**: 组件测试断言关闭确认出现、继续编辑后输入保留、确认放弃后弹窗移除。

#### Scenario: 无实际改动时直接关闭
- **WHEN** 用户未编辑，或把字段恢复到初值后关闭弹窗
- **THEN** 弹窗直接关闭且不显示放弃确认。
- **判据**: 组件测试覆盖未改动和改回初值两种路径。

#### Scenario: 保存期间和保存结果保护
- **WHEN** 用户发起有效保存并尝试再次保存或关闭，随后请求失败或成功
- **THEN** 等待期间维持弹窗且只发出一次保存；失败保留输入，成功关闭且无放弃确认。
- **判据**: 组件测试用可控异步请求断言请求次数、等待中的弹窗和完成后的状态。

### Requirement: [FR-016] 权限分配依赖保护

权限分配界面 **MUST** 在菜单树和角色详情均成功可用且未处于刷新过程时才允许编辑和保存；任何依赖失败时 **MUST** 显示持续错误与重试，保存处理器同样校验前置状态，避免把未加载的详情解释为空权限。成功加载后的真实空权限 **MUST** 仍可被用户明确保存。

#### Scenario: 任一依赖失败禁止误保存
- **WHEN** 菜单树或角色详情首次读取失败，或刷新失败
- **THEN** 保存及依赖这些数据的编辑操作禁用，并提供重试；不能提交默认空 menuIds。
- **判据**:组件测试分别模拟两个接口失败和恢复，断言保存禁用、失败阶段无写请求、重试成功后勾选恢复。

#### Scenario: 合法空权限允许保存
- **WHEN** 两个依赖成功返回，角色没有已分配权限，用户明确保存
- **THEN** 可以提交空 menuIds；真实空结果不被当作加载失败。
- **判据**:组件测试断言成功空详情情况下保存可用且请求体为用户确认的空数组。

### Requirement: [FR-017] 设置读取错误恢复

安全设置与上传设置页面 **MUST** 区分读取中、读取失败和成功数据，失败时提供持续错误与重试，必要数据不可用、刷新中或读取失败时禁止依赖该数据的保存。上传设置 **MUST** 分别处理上传规则与配置列表查询，重试 **MUST NOT** 清除已输入的本地草稿。

#### Scenario: 安全设置读取失败后恢复
- **WHEN** 安全设置首次读取失败，用户重试成功
- **THEN** 错误阶段不继续显示无限加载；重试后显示真实设置；后台刷新失败时保留可读缓存并禁止修改/保存。
- **判据**:组件测试覆盖首次失败、成功恢复及有缓存时失败状态，断言错误、重试、真实值和操作禁用。

#### Scenario: 上传设置任一必要查询失败后恢复
- **WHEN** 上传规则或配置列表读取失败，用户在页面内重试
- **THEN** 明确显示对应失败并可恢复；必要数据恢复前不能保存，恢复后沿用本地草稿。
- **判据**:测试分别模拟两个接口失败，断言保存条件和输入值在重试前后保持一致。

### Requirement: [FR-018] 页面状态文档演示

页面示例与组件演示 **MUST** 统一位于 docs 文档站并随实际交互更新；本轮权限分配、设置读取和权限同步 **MUST** 提供可交互的加载、失败、重试、禁用与更新后状态演示。演示 **MUST** 使用本地示例数据并复用实际状态呈现组件或共用判定逻辑，不依赖登录、真实业务数据或生产接口。

#### Scenario: 文档站切换并恢复页面状态
- **WHEN** 读者进入页面状态演示并选择权限分配、安全设置、上传设置或权限同步场景
- **THEN** 可操作相应状态，观察失败时保存不可用、重试恢复数据、权限更新后菜单与按钮变化。
- **判据**:浏览器验证各演示场景可切换与操作，模拟失败不产生业务接口请求；文档站构建成功，AGENTS.md 包含统一归属说明。

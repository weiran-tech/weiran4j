# sys_user 用户管理

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `packages/server/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`UserController.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/UserController.java)、
> [`CreateUserRequest.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/request/CreateUserRequest.java) /
> [`UpdateUserRequest.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/request/UpdateUserRequest.java) /
> [`ResetPasswordRequest.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/request/ResetPasswordRequest.java)、
> [`UserApplicationService.java`](../../../packages/server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/user/UserApplicationService.java)、
> [`User.java`](../../../packages/server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/user/User.java) /
> [`PasswordPolicy.java`](../../../packages/server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/user/PasswordPolicy.java) /
> [`Gender.java`](../../../packages/server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/user/Gender.java)、
> [`MybatisUserRepository.java`](../../../packages/server/weiran-system/weiran-system-infrastructure/src/main/java/com/wulicode/weiran/system/infrastructure/persistence/MybatisUserRepository.java) /
> [`SysUserDO.java`](../../../packages/server/weiran-system/weiran-system-infrastructure/src/main/java/com/wulicode/weiran/system/infrastructure/persistence/entity/SysUserDO.java)、
> [`V202609260001__system_init_schema.sql`](../../../packages/server/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609260001__system_init_schema.sql) /
> [`V202609270001__system_user_preferences.sql`](../../../packages/server/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609270001__system_user_preferences.sql)、
> 个人偏好 / 收藏 / 锁屏：[`AuthController.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/AuthController.java) →
> [`AuthApplicationService.java`](../../../packages/server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/auth/AuthApplicationService.java)，
> 领域规则 [`UserPreferences.java`](../../../packages/server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/user/UserPreferences.java) /
> [`FavoriteMenus.java`](../../../packages/server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/user/FavoriteMenus.java)、
> [`UsersPage.tsx`](../../../packages/manage/src/pages/system/users/UsersPage.tsx) /
> [`UserFormModal.tsx`](../../../packages/manage/src/pages/system/users/UserFormModal.tsx) /
> [`ResetPasswordModal.tsx`](../../../packages/manage/src/pages/system/users/ResetPasswordModal.tsx)、
> [`hooks/queries/users.ts`](../../../packages/manage/src/hooks/queries/users.ts)、[`utils/password.ts`](../../../packages/manage/src/utils/password.ts)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_user` 统一账号与资料（关联 `sys_user_role` 用户角色；关联表以自增 `id` 为主键，`(user_id, role_id)` 唯一） |
| 菜单 | 系统管理 › 用户管理（`sys_menu.id = 3`） |
| 路由 | `/system/users` |
| 页面组件 | `system/users/UsersPage`（弹窗 `UserFormModal`、`ResetPasswordModal`） |
| 后端模块 | `weiran-system`（DDD 五层）；`UserController` → `UserApplicationService` → `MybatisUserRepository` |
| 接口前缀 | `/api/users` |
| 权限码 | `system:user:list`（列表/详情）· `system:user:create` · `system:user:update` · `system:user:delete` · `system:user:reset-password`；`GET /options` 仅需登录 |
| 种子 | `admin`（id=1，内置，初始密码 `admin123`，绑定 `super_admin`） |
| 资料字段 | `sys_user.avatar` 为 `{"text":"…","background":"#RRGGBB"}` JSON；`gender`、`preferences`、`favorite_menus` 均在同表 |

## 1. 列表

- 高级筛选首部提供关键字（用户名/昵称/手机）入口，与宽屏快捷输入共享 draft.keyword；窄屏仍可模糊查询昵称。

用户列表查询失败时持续显示错误与重试入口；后台刷新失败保留上次数据并提示更新失败。成功的空结果区分「暂无记录」与「没有匹配结果」，后者可清空条件。重试沿用当前已生效查询与分页。

接口 `GET /api/users`，按 `id` 升序，后端不接受排序参数；前端表格也不提供列排序。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 0 | ID | `id` | 原值(宽 160) |
| 1 | 用户名 | `username` | 原值(宽 140，减少多行展示) |
| 2 | 昵称 | `nickname` | 原值 |
| 4 | 角色 | 派生：`sys_user_role → sys_role.name`（`roleNames`，含禁用角色） | 多个 `Tag`；空 `—` |
| 5 | 手机 | `phone` | 空值 `—` |
| 6 | 性别 | `sys_user.gender` | `DictTag`（字典 `sys_user_gender`） |
| 7 | 状态 | `status` | `StatusTag` |
| 8 | 最后登录 | `last_login_at` | 空值 `—` |
| 9 | 创建时间 | `created_at` | 原值 |
| 10 | 操作 | — | 有 `update` / `reset-password` / `delete` 任一权限才出现该列;桌面宽度 300（启用外部身份时 372）以完整显示文字按钮;固定在右侧;窄屏（< 992px，与便捷搜索隐藏同一断点）收成「…」图标按钮(`TableActions` + `useCompactActions`) |

列宽合计 1316(弹性列「角色」按 78 计，含「设置账号信息」操作；配置外部身份提供方时为 1388),1440 宽下部分布局可横向滚动、操作列固定在右侧;手机 116、时间 158 按最坏数据算,不折行(见 `rules/advisory/list-view.md` 二.4)。

`UserView` 还返回 `avatar`、`lastLoginIp`、`isBuiltin`、`roleIds`、`updatedAt`，列表未展示；**绝不返回** `password` / `token_version`。

**搜索栏**（按设计稿 `wuli-design/testing.pen`「用户列表」）：最左「新增用户」→ 常用筛选（下表三项）→ 图标「查询」→「高级筛选」开关
（默认收起，展开后面板为 8 个单字段条件 +「搜索 / 重置」，状态与工具栏共用草稿）；右侧工具「列设置」「刷新」。点查询后，工具栏下方出现
「已选条件」胶囊标签（原值或可读名称：状态 / 角色 / 性别取名称，时间显示「开始 ~ 结束」），× 删除单个条件并立即重查、回第 1 页，「清空」= 重置。

**筛选项**（点「查询」才生效，「重置」/「清空」清空并回第 1 页）：

| 控件 | 参数 | 后端口径 |
| --- | --- | --- |
| 输入框「用户名 / 昵称 / 手机」 | `keyword` | 三列 `LIKE` 模糊（`OR`），前后空白去除 |
| `DictSelect`（字典 `sys_common_status`） | `status` | 等值；非 `enabled/disabled` 返回 100001 |
| 高级筛选「用户名」 | `username` | 等值（去首尾空白），不模糊 |
| 高级筛选「用户 ID」（整数输入） | `userId` | 等值；非数字 100001 |
| 高级筛选「手机号」 | `phone` | 等值（去首尾空白），不模糊 |
| 高级筛选「角色」（`useRoleOptions`，只列启用角色） | `roleId` | 拥有该角色（子查询，一人只出一行）；已禁用角色在下拉里选不到，但接口参数对其照常生效 |
| 高级筛选「性别」（字典 `sys_user_gender`） | `gender` | `sys_user.gender` 等值；非 `male/female/unknown` 返回 100001（`Gender.filterOf`，空白不过滤） |
| 高级筛选「创建时间」「最后登录时间」（按天） | `createdStartTime` / `createdEndTime`、`lastLoginStartTime` / `lastLoginEndTime` | 闭区间，前端补成当天 `00:00:00` / `23:59:59`；可单边；传登录时间任一端即排除从未登录；格式错 100001 |

全部条件（含 `keyword`）取交集；开始晚于结束返回空页。

**分页**：`page` 默认 1、`pageSize` 默认 20；后端越界值钳到边界（`pageSize` 上限 200），不报错。前端可切换每页条数、显示总数。

## 2. 字段与表单

新增与编辑共用 `UserFormModal`（宽 600，`maskClosable=false`）。

该弹窗内容实际改变后，取消、关闭按钮和 Esc 会先确认是否放弃；继续编辑保留输入，未改动或恢复初值直接关闭。校验及保存期间禁止重复保存与关闭，失败保留输入，成功直接关闭。关闭保护仅在内存工作，不持久化密码或其他草稿；不提供浏览器刷新后的草稿恢复。

| 字段 | 前端控件 | 前端校验 | 后端校验 | DB 列 / 类型 |
| --- | --- | --- | --- | --- |
| 用户名 | `Form.Input`，编辑态 `disabled`；行操作「设置账号信息」中单独修改 | 必填；2–32 位，仅允许小写英文字母、数字和 `_` | 创建与单独修改均去首尾空白后全局查重，重复 100003「用户名已存在」 | `username varchar(32)`，全局唯一 |
| 昵称 | `Form.Input` | 必填；`maxLength=32` | `@NotBlank` `@Size(max=32)` | `nickname varchar(32)` |
| 初始密码 | `Form.Input mode=password`，**仅新增** | 必填；`/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/` | `@NotBlank` + 领域 `PasswordPolicy`：8–64 位且同时含字母与数字，否则 100001 `password: …` | `password varchar(100)`（BCrypt） |
| 角色 ❓ | `Form.Select multiple`，选项来自 `GET /api/roles/options`（仅启用角色，见 #04） | 无（可不选） | `@NotNull`（可为空数组）；每个 ID 必须存在，否则 100001；授予/移除 `super_admin` 需操作人本身是超管，否则 100102；内置用户必须保留 `super_admin`，否则 100004 | `sys_user_role`（全量覆盖） |
| 性别 | `Form.Select`（字典 `sys_user_gender`），可清空 | 无 | 可空；新增空值落 `unknown`，编辑空值**保持原值**；非法值 100001 | `sys_user.gender varchar(16)` 默认 `unknown` |
| 手机 | `Form.Input`，**仅新增**；行操作「设置账号信息」中可单独修改 | `maxLength=20`；单独设置时留空可清除 | `@Size(max=20)`；非空值全局唯一，冲突 100003「手机号已存在」 | `phone varchar(20) null`，全局唯一 |
| 状态 | `Form.RadioGroup`（启用/禁用），内置用户 `disabled` | 无 | 新增空值落 `enabled`，编辑空值保持原值；内置用户禁用 100004「内置用户不可禁用」 | `status varchar(16)` 默认 `enabled` |

表单外的列：`avatar` 只能由本人在个人中心改（文字与背景色存于同一个 JSON 字段），管理员编辑时原值保留；本人手机号仅能通过发码、验证后设置。个人中心采用条目式布局，点击头像或「修改头像」打开可预览的文字/背景色编辑弹窗；安全手机号和登录密码分别在弹窗中操作；
`token_version` / `last_login_at` / `last_login_ip` / `password_updated_at` 由各自用例定向更新（见 §3）；
`is_builtin` 只能由种子写入；`created_at/updated_at/created_by/updated_by` 为审计列，自动填充。

**`updated_at` 口径**：只反映资料 / 状态 / 角色 / 密码 / 令牌版本等真实变更（编辑用户、改资料、改密、重置密码、禁用时刷新）。
列定义带 `on update current_timestamp`，因此登录信息更新显式写 `updated_at = updated_at` 抵消自动刷新。
PUT 偏好与 PUT 收藏只定向更新 `sys_user` 对应 JSON 列，并保持 `updated_at` 不变。

**本人数据列**（不在用户表单中，只由本人经 `/api/auth/*` 读写，见 §3）：

| 列 | 类型 | 写入口径 |
| --- | --- | --- |
| `preferences` | `json null` | 任意 JSON **对象**，序列化后 ≤ 16KB（`UserPreferences.MAX_BYTES`，按 UTF-8 字节计）；非对象或超限 100001；全量覆盖；后端不解析字段含义（事实源为前端 `usePreferences.tsx`）。MySQL JSON 列会规整键顺序，读回的对象键序可能与写入时不同 |
| `favorite_menus` | `json null` | 菜单 ID 数组，按收藏顺序；PUT 去重（保留首次位置）后 ≤ 50 个（`FavoriteMenus.MAX_SIZE`），每个 ID 必须在 `Authorization.accessiblePageIds` 内（可见菜单中 `type=menu` 的节点：自身与祖先均启用、本人有权限，超管为全部启用菜单），否则 100001；读取时按同一口径过滤，不回写库 |

这两列位于 `SysUserDO`，标 `select = false` + `insertStrategy/updateStrategy = NEVER`：常规查询不带出它们，只由仓储专用方法显式 `select` 与定向 `UPDATE`。

**重置密码弹窗**（`ResetPasswordModal`）：只有「新密码」一项，前后端校验口径同上表「初始密码」。

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增用户（工具栏） | `POST /api/users` → `{id}` | `system:user:create` | ✅ 用户管理 / 新增用户 | 见 §2；`token_version=0`，`password_updated_at=now` |
| 编辑（行） | `PUT /api/users/{id}` | `system:user:update` | ✅ 修改用户 | 404 用户不存在；定向更新昵称/性别/状态三列（`updateAccount`），再全量覆盖角色；启用 → 禁用时 `token_version + 1`（原子加一），该用户已签发令牌立即失效；授权快照缓存按用户失效 |
| 设置账号信息（行） | `PUT /api/system/user/updateAccountField/{id}` | `system:user:update` | ✅ 设置用户账号信息 | 每次请求只更新用户名、手机号中的一项；用户名不允许清空，手机号传空值清为 `NULL`；重复值返回 100003；更新后失效该用户授权快照缓存 |
| 本人修改用户名 | `PUT /api-backend/system/auth/updateUsername` | 仅登录 | ✅ 修改用户名 | 从登录态确定用户 ID；2–32 位，仅允许小写英文字母、数字和 `_`，全局唯一；更新后失效授权快照缓存，现有令牌继续有效 |
| 本人设置手机号 | `POST /api-backend/system/auth/sendBindPhoneCode` → `PUT /api-backend/system/auth/bindPhone` | 仅登录 | ❌ 验证码不记录在操作日志 | 发码目标为新手机号；6 位验证码 5 分钟有效、一次使用，失败尝试和发送频率受限；验证通过才保存手机号 |
| 重置密码（行） | `PUT /api/users/{id}/password` | `system:user:reset-password` | ✅ 重置密码（请求体 `password` 被脱敏为 `******`） | 定向更新密码与 `password_updated_at`，`token_version + 1` |
| 删除（行「操作」列，确认后执行；窄屏（< 992px）收在「…」菜单里） | `DELETE /api/users/{id}` | `system:user:delete` | ✅ 删除用户 | 内置用户 100004「内置用户不可删除」；删除自己 100004「不能删除当前登录用户」；同时删 `sys_user_role`。前端只对内置用户禁用按钮，删自己靠后端拦 |
| —（下拉数据源） | `GET /api/users/options` | 仅登录 | — | 启用用户 `[{id, username, nickname}]` |
| —（详情） | `GET /api/users/{id}` | `system:user:list` | — | 前端页面未调用 |
| —（本人，界面偏好读） | `GET /api/auth/preferences` | 仅登录 | — | 原样返回存储的对象；从未保存返回 `null` |
| —（本人，界面偏好写） | `PUT /api/auth/preferences` | 仅登录 | ❌ 刻意不记（前端 500ms 防抖高频写） | 见 §2「本人数据列」；定向 `UPDATE preferences`（`updatePreferences`），不刷新 `updated_at`、不填 `updated_by` |
| —（本人，收藏菜单读） | `GET /api/auth/favorite-menus` | 仅登录 | — | `number[]`，按收藏顺序；已删除 / 已禁用 / 已无权访问的 ID 过滤掉；从未保存返回 `[]` |
| —（本人，收藏菜单写） | `PUT /api/auth/favorite-menus` | 仅登录 | ❌ 不记 | `{menuIds}`（`@NotNull`）；规则见 §2；定向 `UPDATE favorite_menus`（`updateFavoriteMenuIds`），不刷新 `updated_at` |
| —（本人，锁屏解锁） | `POST /api/auth/verify-password` | 仅登录 | ❌ 不记 | `{password}`（`@NotBlank` ≤ 64）；BCrypt 比对当前用户密码，正确返回 `null`，错误 110101「密码错误」；**不签发令牌、不改 `token_version`、不写登录日志**；无失败次数限制 |
| —（登录页，短信验证码） | `POST /api-backend/n/system/auth/sendPhoneCode`、`POST /api-backend/n/system/auth/loginWithPhoneCode` | 免登录 | 登录写 `sys_login_log`；`local` 发码成功另写 `sms_code` 事件 | 仅在手机号登录开关、短信发送器及模板均就绪时开放；6 位验证码 5 分钟有效、一次使用，按手机号/IP 限流；手机号不存在返回 110106，账号已禁用返回 110107，发送失败也返回错误；错误登录统一返回 110101，失败日志手机号脱敏；`local` 发码日志保留验证码明文 |

按钮显隐：无对应权限时 `Permission` 不渲染（非 disabled）；「删除」对内置用户为 disabled。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`（含 `leading` / `advanced` + `SearchField` / `conditions` / `onRefresh`）、`Permission`
- `StatusTag`（列表状态列）与 `STATUS_OPTIONS`（表单状态单选）
- `DictTag`（性别列）、`DictSelect`（状态筛选，字典 `sys_common_status`）

## 5. 说明与建议

- **写入方式**：仓储对 `sys_user` 一律「定向更新」，每个用例只 `SET` 自己负责的列（`updateProfile` / `updateAccount` /
  `recordLogin` / `changePassword` / `revokeTokens` / `updatePreferences` / `updateFavoriteMenuIds`），`SysUserDO` 上密码、令牌版本、登录信息、
  偏好与收藏标 `updateStrategy = NEVER`。
  因此登录、改密、禁用之间不会互相覆盖；但管理员编辑昵称/性别/状态之间仍是后写覆盖（见 #01）。
- **令牌吊销**：改密 / 管理员重置 / 启用→禁用三处让 `token_version` 原子加一。编辑用户若未改变启用状态，令牌不受影响。
  认证时 `token_version` 与 `status` 每次请求按主键查库（`findAuthState`），不经过下面的快照缓存，所以多实例下吊销同样立即生效（宪法 CP-8）。
- **授权快照缓存**（用户名 / 昵称 / 角色 / 权限码，30s）：编辑、删除、重置密码都会 `cache.evict(userId)`，只作用于本进程；前端当前登录人自己的 `me` / 菜单查询
  `staleTime=Infinity`，改自己的角色后侧边栏与按钮不刷新（同一机制见 `sys_role.md#01`）。
- **`last_login_ip`**：与登录日志同源于 `ClientIpResolver`（`X-Forwarded-For` 优先），可被伪造的问题登记在 `artifact.md#03`。

## 6. 已知问题汇总

- **#01 ⚠️ P3 管理员编辑用户无乐观锁，两人同时编辑同一用户时后写覆盖先写**
  `sys_user` 无版本列；`MybatisUserRepository.updateAccount` 按 `id` 直接 `SET` 昵称/性别/状态，
  `replaceRoles` 先删后插角色关联。两个管理员基于同一份旧数据先后提交，后提交者整组覆盖先提交者的修改，不报错。
  敏感列（密码、令牌版本、登录信息）走独立定向更新，不受此影响。已由后端声明为知情接受。
- **#04 ❓ P3 编辑绑定了禁用角色的用户时，角色下拉没有该角色的选项**
  角色选项来自 `GET /api/roles/options`（只含启用角色），而 `initValues.roleIds` 含用户的全部角色 ID。
  禁用角色的 ID 在下拉里找不到对应选项，实际显示形态取决于 Semi `Select` 对未匹配值的处理（未实测）；
  保存时该 ID 会原样随 `roleIds` 提交并保留绑定。
- **#05 ❓ P3 契约 §6.2 未记载的后端规则（与代码不符，以代码为准）**
  契约只写了「内置用户与自己不能删（100004）」与重置密码 `token_version+1`。代码另有：
  新增与重置密码同样执行 8–64 位含字母数字的密码策略；内置用户不可禁用（100004）且必须保留 `super_admin`（100004）；
  只有超管能授予或移除 `super_admin`（100102）；编辑时省略的 `gender` / `status` 保持原值。契约需补记。

- **#10 ⚠️ P3 启用外部身份后，用户列表在部分布局下横向滚动**
  症状：配置了外部身份提供方后，操作列多出「外部身份」（宽度 300 → 372），列宽合计 1388。1440 宽屏幕下，双列（可用 1115）与侧边 / 混合（1135）布局会出现横向滚动；顶部菜单布局不受影响，没配置提供方的部署也不受影响。
  可选的改法：把「重置密码」「外部身份」收进「…」菜单（需要给 `TableActions` 加「部分收起」能力），或者压窄其它列。

## 7. changelog

**2026-11-14**

- **#11 ✅ P2 窄屏用户列表缺少昵称模糊查询入口**
  由 `recover-pages-and-sync-menu-permissions` 解决。高级面板首部补齐共享keyword输入，与快捷框共用草稿和查询、重置、条件移除逻辑；390px昵称查询与跨屏状态经浏览器验证。
  原症状：症状：小于 992px 时 `search-toolbar__quick` 隐藏用户名/昵称/手机关键字框，高级面板只提供用户名、手机号等单字段条件，没有同一关键字条件，昵称模糊查询因窗口变窄而不可用。应在高级面板补齐共用 draft.keyword 的入口，保持不同屏幕的查询能力一致。
（`improve-admin-interaction-recovery`）

- 用户列表增加持久错误与重试，刷新失败保留旧数据，空态区分无记录与无匹配；新增/编辑弹窗增加未保存确认与保存中关闭保护，草稿不持久化。

**2026-10-27**（统一用户名字符规则）

- 创建、管理员修改、本人修改及外部身份自动开通的用户名统一为 2–32 位小写英文字母、数字和下划线；历史用户名不自动改写。
- **#02 ✅ 前端用户名校验与后端一致**：新增用户表单补齐长度下限和字符规则，非法输入在提交前拦截。

**2026-10-27**（统一用户资料与文字头像）

- `sys_user_backend` 资料迁回 `sys_user` 后删除扩展表；删除 `type`、`email`，用户名与非空手机号改为全局唯一。
- `avatar` 使用单列 JSON 保存 `text` 与 `background`；旧图片头像和对应资源引用不再使用。个人资料不能直接改手机号，新增向新号码发码并验证的设置流程；管理员编辑表单移除手机号和邮箱。

**2026-10-23**（关联表自增主键）

- `sys_user_role` 增加自增 `id` 主键，原 `(user_id, role_id)` 联合主键改为唯一索引，用户角色去重规则不变。

**2026-10-23**（账号标识按类型唯一）

- 将用户名、手机号、邮箱的全局唯一索引替换为 `(type, username)`、`(type, phone)`、`(type, email)`；后台账号查重限定 `backend`，不同类型可复用相同标识，手机号和邮箱的 `NULL` 仍可重复。

**2026-10-23**（拆分后台账号资料）

- `sys_user.type` 取 `packages/manage/web`；现有账号迁为 `backend`，后台认证及用户管理只处理该类型。
- `avatar`、`gender`、`preferences`、`favorite_menus` 迁入一对一的 `sys_user_backend`，原列从基础表删除。

**2026-10-23**（移除部门能力）

- 移除部门管理及用户归属字段；新增迁移清理菜单、权限、`sys_user.department_id` 和 `sys_department`。
- **#03 ✅ P3** 部门表退役后，删除用户不再留下悬空的负责人引用。

**2026-10-21**（API 入口分离）

- 手机验证码发送与登录迁到 `/api-backend/n/`；用户资料、权限与管理接口迁到 `/api-backend/`。

新条目插在本节最上方（按日期倒序，新在上）。

**2026-10-21**（手机号验证码发码反馈）

- 未绑定或禁用账号的手机号请求验证码分别返回 110106「手机号不存在」或 110107「手机号已禁用」；短信发送失败也返回错误。登录页仅在发码成功后显示查收提示和重发倒计时；`local` 模式成功发码还会在登录日志中记录明文验证码。

**2026-10-20**（用户列表账号信息设置）

- 用户行操作新增「设置账号信息」，在弹窗中选择用户名、手机号或邮箱，一次只修改一项；用户名、非空手机号和非空邮箱跨用户唯一，邮箱比较遵循数据库 collation；手机号和邮箱留空时清除为 `NULL`。
- `sys_user.email` 与 `sys_user.phone` 新增唯一索引；部署迁移前须按列 collation 检查并清理已有重复值。

**2026-10-20**（手机号验证码登录）

- 登录页读取公开认证方式，管理员同时启用手机号验证码配置、短信发送器并配置模板 CODE 后显示手机号登录；验证码登录复用本地 Cookie/JWT、账号状态校验和登录日志。

**2026-10-06**（`external-identity-login`）

- 外部身份登录（D-015）：
  - 外部身份自动开通的用户没有本地密码（`password` 存空串，`/me.hasPassword=false`），用密码登录、锁屏解锁都返回 110101，修改密码返回 100001；管理员重置密码后恢复本地密码。
  - 删除用户时连带删除其外部身份绑定。
  - 行操作新增「外部身份」（`system:user:identity`），只在配置了提供方时显示。
  - 关闭密码登录（`WEIRAN_PASSWORD_LOGIN_ENABLED=false`）后，只有内置超管还能用密码登录。
  - 绑定规则见 `sys_user_identity.md`。

**2026-10-05**（`auth-seams-cookie-ci`）

- 认证改为三段式（D-014）：吊销判定（`token_version` / `status`）每次请求查库，不再经过 30s 授权快照缓存；新增仓储方法 `findAuthState`。
- 浏览器登录改为 HttpOnly Cookie 交付令牌（契约 §4、§6.1），本表字段与接口不变。

**2026-09-27**
- **#08 ✅ P3 设计稿高级筛选的 8 个字段后端不支持，面板暂未放出**
  由 change `user-advanced-filter` 关闭：`GET /api/users` 新增 `username` / `userId` / `phone` / `email`（精确）、`roleId`、`gender`、
  创建时间与最后登录时间范围（闭区间）；契约 §6.2 同步；高级筛选面板按设计稿放出 10 个字段（「是否启用」与状态同义未做）。
- **#09 ✅ P3 搜索栏按设计稿改造**
  「新增用户」移到最左；查询按钮改图标 + 高级筛选开关（默认收起）；右侧工具按约定只出列设置、刷新；
  新增「已选条件」胶囊标签（可逐个删除、清空）。随 change `user-advanced-filter` 一并提交（该 change 同时补齐了后端字段，见 #08）。
- **#07 ✅ P? 追加个人偏好、收藏菜单与锁屏密码校验**
  `V202609270001` 给 `sys_user` 追加 `preferences`、`favorite_menus` 两个 JSON 列；新增 `GET/PUT /api/auth/preferences`、
  `GET/PUT /api/auth/favorite-menus`、`POST /api/auth/verify-password`（口径见 §2「本人数据列」与 §3）。
  两列均定向更新，不参与用户整行读取；领域规则 `UserPreferences`（16KB）与 `FavoriteMenus`（≤ 50、去重、可访问）有纯单测，
  接口由 `PreferencesIT` 覆盖。
  同日起登录、PUT 偏好、PUT 收藏三条定向更新显式写 `updated_at = updated_at`，`sys_user.updated_at` 不再被登录与界面自动保存刷新
  （此前每次登录都会刷新它）；改密 / 重置 / 禁用等真实变更照常刷新。口径见 §2。

**2026-09-26**
- **#06 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_user` 的列表、表单、动作与已知问题。

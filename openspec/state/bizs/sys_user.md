# sys_user 用户管理

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `weiran4j/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`UserController.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/UserController.java)、
> [`CreateUserRequest.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/request/CreateUserRequest.java) /
> [`UpdateUserRequest.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/request/UpdateUserRequest.java) /
> [`ResetPasswordRequest.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/request/ResetPasswordRequest.java)、
> [`UserApplicationService.java`](../../../weiran4j/weiran-system/weiran-system-application/src/main/java/com/weiran/system/application/user/UserApplicationService.java)、
> [`User.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/user/User.java) /
> [`PasswordPolicy.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/user/PasswordPolicy.java) /
> [`Gender.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/user/Gender.java)、
> [`MybatisUserRepository.java`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/java/com/weiran/system/infrastructure/persistence/MybatisUserRepository.java) /
> [`SysUserDO.java`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/java/com/weiran/system/infrastructure/persistence/entity/SysUserDO.java)、
> [`V202609260001__system_init_schema.sql`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609260001__system_init_schema.sql)、
> [`UsersPage.tsx`](../../../web/src/pages/system/users/UsersPage.tsx) /
> [`UserFormModal.tsx`](../../../web/src/pages/system/users/UserFormModal.tsx) /
> [`ResetPasswordModal.tsx`](../../../web/src/pages/system/users/ResetPasswordModal.tsx)、
> [`hooks/queries/users.ts`](../../../web/src/hooks/queries/users.ts)、[`utils/password.ts`](../../../web/src/utils/password.ts)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_user`（关联表 `sys_user_role`：`user_id + role_id` 联合主键） |
| 菜单 | 系统管理 › 用户管理（`sys_menu.id = 3`） |
| 路由 | `/system/users` |
| 页面组件 | `system/users/UsersPage`（弹窗 `UserFormModal`、`ResetPasswordModal`） |
| 后端模块 | `weiran-system`（DDD 五层）；`UserController` → `UserApplicationService` → `MybatisUserRepository` |
| 接口前缀 | `/api/users` |
| 权限码 | `system:user:list`（列表/详情）· `system:user:create` · `system:user:update` · `system:user:delete` · `system:user:reset-password`；`GET /options` 仅需登录 |
| 种子 | `admin`（id=1，内置，初始密码 `admin123`，部门「总公司」，绑定 `super_admin`） |

## 1. 列表

接口 `GET /api/users`，按 `id` 升序，后端不接受排序参数；前端表格也不提供列排序。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 用户名 | `username` | 原值 |
| 2 | 昵称 | `nickname` | 原值 |
| 3 | 部门 | 派生：`department_id → sys_department.name` | 空值 `—` |
| 4 | 角色 | 派生：`sys_user_role → sys_role.name`（`roleNames`，含禁用角色） | 多个 `Tag`；空 `—` |
| 5 | 手机 | `phone` | 空值 `—` |
| 6 | 性别 | `gender` | `DictTag`（字典 `sys_user_gender`） |
| 7 | 状态 | `status` | `StatusTag` |
| 8 | 最后登录 | `last_login_at` | 空值 `—` |
| 9 | 创建时间 | `created_at` | 原值 |
| 10 | 操作 | — | 有 `update` / `reset-password` / `delete` 任一权限才出现该列 |

`UserView` 还返回 `email`、`avatar`、`lastLoginIp`、`isBuiltin`、`roleIds`、`updatedAt`，列表未展示；**绝不返回** `password` / `token_version`。

**筛选项**（点「查询」才生效，「重置」清空并回第 1 页）：

| 控件 | 参数 | 后端口径 |
| --- | --- | --- |
| 输入框「用户名 / 昵称 / 手机」 | `keyword` | 三列 `LIKE` 模糊（`OR`），前后空白去除 |
| `DictSelect`（字典 `sys_common_status`） | `status` | 等值；非 `enabled/disabled` 返回 40000 |
| `DepartmentTreeSelect` | `departmentId` | **含全部子部门**（`Hierarchy.selfAndDescendantsOf`） |

**分页**：`page` 默认 1、`pageSize` 默认 20；后端越界值钳到边界（`pageSize` 上限 200），不报错。前端可切换每页条数、显示总数。

## 2. 字段与表单

新增与编辑共用 `UserFormModal`（宽 600，`maskClosable=false`）。

| 字段 | 前端控件 | 前端校验 | 后端校验 | DB 列 / 类型 |
| --- | --- | --- | --- | --- |
| 用户名 ❌ | `Form.Input`，编辑态 `disabled` | 必填；`maxLength=32`（缺长度下限与字符规则，见 #02） | `@NotBlank` `@Size(2..32)` `@Pattern ^[A-Za-z][A-Za-z0-9_.-]*$`；去首尾空白后查重，重复 40900「用户名已存在」 | `username varchar(32)` 唯一 |
| 昵称 | `Form.Input` | 必填；`maxLength=32` | `@NotBlank` `@Size(max=32)` | `nickname varchar(32)` |
| 初始密码 | `Form.Input mode=password`，**仅新增** | 必填；`/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/` | `@NotBlank` + 领域 `PasswordPolicy`：8–64 位且同时含字母与数字，否则 40000 `password: …` | `password varchar(100)`（BCrypt） |
| 部门 | `Form.TreeSelect`（全量部门树，含禁用部门） | 无 | 可空；非空时部门必须存在，否则 40000 `departmentId: 部门不存在`；**不校验部门是否启用** | `department_id bigint null` |
| 角色 ❓ | `Form.Select multiple`，选项来自 `GET /api/roles/options`（仅启用角色，见 #04） | 无（可不选） | `@NotNull`（可为空数组）；每个 ID 必须存在，否则 40000；授予/移除 `super_admin` 需操作人本身是超管，否则 40300；内置用户必须保留 `super_admin`，否则 40901 | `sys_user_role`（全量覆盖） |
| 性别 | `Form.Select`（字典 `sys_user_gender`），可清空 | 无 | 可空；新增空值落 `unknown`，编辑空值**保持原值**；非法值 40000 | `gender varchar(16)` 默认 `unknown` |
| 邮箱 | `Form.Input` | `type: email`；`maxLength=128` | `@Email` `@Size(max=128)` | `email varchar(128) null` |
| 手机 | `Form.Input` | `maxLength=20` | `@Size(max=20)`，无格式校验 | `phone varchar(20) null` |
| 状态 | `Form.RadioGroup`（启用/禁用），内置用户 `disabled` | 无 | 新增空值落 `enabled`，编辑空值保持原值；内置用户禁用 40901「内置用户不可禁用」 | `status varchar(16)` 默认 `enabled` |

表单外的列：`avatar` 只能由本人在个人中心改（`PUT /api/auth/profile`），管理员编辑时原值保留；
`token_version` / `last_login_at` / `last_login_ip` / `password_updated_at` 由各自用例定向更新（见 §3）；
`is_builtin` 只能由种子写入；`created_at/updated_at/created_by/updated_by` 为审计列，自动填充。

**重置密码弹窗**（`ResetPasswordModal`）：只有「新密码」一项，前后端校验口径同上表「初始密码」。

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增用户（工具栏） | `POST /api/users` → `{id}` | `system:user:create` | ✅ 用户管理 / 新增用户 | 见 §2；`token_version=0`，`password_updated_at=now` |
| 编辑（行） | `PUT /api/users/{id}` | `system:user:update` | ✅ 修改用户 | 404 用户不存在；定向更新昵称/邮箱/手机/性别/部门/状态六列（`updateAccount`），再全量覆盖角色；启用 → 禁用时 `token_version + 1`（原子加一），该用户已签发令牌立即失效；授权快照缓存按用户失效 |
| 重置密码（行） | `PUT /api/users/{id}/password` | `system:user:reset-password` | ✅ 重置密码（请求体 `password` 被脱敏为 `******`） | 定向更新密码与 `password_updated_at`，`token_version + 1` |
| 删除（行，`Popconfirm`） | `DELETE /api/users/{id}` | `system:user:delete` | ✅ 删除用户 | 内置用户 40901「内置用户不可删除」；删除自己 40901「不能删除当前登录用户」；同时删 `sys_user_role`。前端只对内置用户禁用按钮，删自己靠后端拦 |
| —（下拉数据源） | `GET /api/users/options` | 仅登录 | — | 启用用户 `[{id, username, nickname}]`，部门负责人下拉在用 |
| —（详情） | `GET /api/users/{id}` | `system:user:list` | — | 前端页面未调用 |

按钮显隐：无对应权限时 `Permission` 不渲染（非 disabled）；「删除」对内置用户为 disabled。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`、`Permission`
- `StatusTag`（列表状态列）与 `STATUS_OPTIONS`（表单状态单选）
- `DictTag`（性别列）、`DictSelect`（状态筛选，字典 `sys_common_status`）
- `DepartmentTreeSelect`（部门筛选）与 `useDepartmentTreeData`（表单部门树）

## 5. 说明与建议

- **写入方式**：仓储对 `sys_user` 一律「定向更新」，每个用例只 `SET` 自己负责的列（`updateProfile` / `updateAccount` /
  `recordLogin` / `changePassword` / `revokeTokens`），`SysUserDO` 上密码、令牌版本、登录信息标 `updateStrategy = NEVER`。
  因此登录、改密、禁用之间不会互相覆盖；但管理员编辑这六列之间仍是后写覆盖（见 #01）。
- **令牌吊销**：改密 / 管理员重置 / 启用→禁用三处让 `token_version` 原子加一。编辑用户若未改变启用状态，令牌不受影响。
- **授权快照缓存**：编辑、删除、重置密码都会 `cache.evict(userId)`；前端当前登录人自己的 `me` / 菜单查询
  `staleTime=Infinity`，改自己的角色后侧边栏与按钮不刷新（同一机制见 `sys_role.md#01`）。
- **部门可选禁用部门**：表单部门树取自不带 `status` 的 `GET /api/departments`，后端也只校验存在性，用户可被挂到禁用部门下。
- **`last_login_ip`**：与登录日志同源于 `ClientIpResolver`（`X-Forwarded-For` 优先），可被伪造的问题登记在 `artifact.md#03`。
- 建议：前端用户名校验补齐后端的长度下限与字符规则（#02）；删除用户时顺带清理部门负责人引用（#03）。

## 6. 已知问题汇总

- **#01 ⚠️ P3 管理员编辑用户无乐观锁，两人同时编辑同一用户时后写覆盖先写**
  `sys_user` 无版本列；`MybatisUserRepository.updateAccount` 按 `id` 直接 `SET` 昵称/邮箱/手机/性别/部门/状态，
  `replaceRoles` 先删后插角色关联。两个管理员基于同一份旧数据先后提交，后提交者整组覆盖先提交者的修改，不报错。
  敏感列（密码、令牌版本、登录信息）走独立定向更新，不受此影响。已由后端声明为知情接受。
- **#02 🔴 P3 前端用户名校验比后端宽，不合法用户名要提交后才被拒**
  `UserFormModal` 的用户名只有「必填」与 `maxLength=32`；后端 `CreateUserRequest` 还要求至少 2 位、字母开头、
  只含字母数字 `_ . -`。症状：输入 `1abc` 或单个字符，表单通过，提交后 Toast 显示 40000
  「username: 需以字母开头，只能包含字母、数字、下划线、点或横线」（或长度提示）。
- **#03 🔴 P3 删除用户不清理 `sys_department.leader_id`，之后编辑该部门会被后端拒绝**
  `MybatisUserRepository.deleteById` 只删 `sys_user_role` 与 `sys_user`，不处理把该用户设为负责人的部门。
  症状：部门列表「负责人」列显示 `—`（`leaderName` 查不到）；打开该部门的编辑弹窗，负责人下拉回填的是已删除用户的 ID
  （选项里没有），原样提交时 `DepartmentApplicationService.ensureLeaderExists` 返回 40000「leaderId: 负责人不存在」，
  必须先清空负责人才能保存。
- **#04 ❓ P3 编辑绑定了禁用角色的用户时，角色下拉没有该角色的选项**
  角色选项来自 `GET /api/roles/options`（只含启用角色），而 `initValues.roleIds` 含用户的全部角色 ID。
  禁用角色的 ID 在下拉里找不到对应选项，实际显示形态取决于 Semi `Select` 对未匹配值的处理（未实测）；
  保存时该 ID 会原样随 `roleIds` 提交并保留绑定。
- **#05 ❓ P3 契约 §6.2 未记载的后端规则（与代码不符，以代码为准）**
  契约只写了「内置用户与自己不能删（40901）」与重置密码 `token_version+1`。代码另有：用户名 2–32 位且字母开头；
  新增与重置密码同样执行 8–64 位含字母数字的密码策略；内置用户不可禁用（40901）且必须保留 `super_admin`（40901）；
  只有超管能授予或移除 `super_admin`（40300）；编辑时省略的 `gender` / `status` 保持原值。契约需补记。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-09-26**
- **#06 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_user` 的列表、表单、动作与已知问题。

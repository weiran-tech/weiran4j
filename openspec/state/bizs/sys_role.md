# sys_role 角色管理

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `packages/server/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`RoleController.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/RoleController.java)、
> [`SaveRoleRequest.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/request/SaveRoleRequest.java) /
> [`AssignMenusRequest.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/request/AssignMenusRequest.java)、
> [`RoleApplicationService.java`](../../../packages/server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/role/RoleApplicationService.java)、
> [`Role.java`](../../../packages/server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/role/Role.java)、
> [`Authorization.java`](../../../packages/server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/auth/Authorization.java)、
> [`MybatisRoleRepository.java`](../../../packages/server/weiran-system/weiran-system-infrastructure/src/main/java/com/wulicode/weiran/system/infrastructure/persistence/MybatisRoleRepository.java)、
> [`V202609260001__system_init_schema.sql`](../../../packages/server/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609260001__system_init_schema.sql)、
> [`RolesPage.tsx`](../../../packages/manage/src/pages/system/roles/RolesPage.tsx) /
> [`RoleFormModal.tsx`](../../../packages/manage/src/pages/system/roles/RoleFormModal.tsx) /
> [`RoleMenuSheet.tsx`](../../../packages/manage/src/pages/system/roles/RoleMenuSheet.tsx)、
> [`hooks/queries/roles.ts`](../../../packages/manage/src/hooks/queries/roles.ts)、[`utils/menu.ts`](../../../packages/manage/src/utils/menu.ts)（`applyMenuCheck`）。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_role`（关联表 `sys_role_menu`：自增 `id` 主键、`(role_id, menu_id)` 唯一；`sys_user_role` 见 `sys_user.md`） |
| 菜单 | 系统管理 › 角色管理（`sys_menu.id = 4`） |
| 路由 | `/system/roles` |
| 页面组件 | `system/roles/RolesPage`（弹窗 `RoleFormModal`、侧滑 `RoleMenuSheet`） |
| 后端模块 | `weiran-system`；`RoleController` → `RoleApplicationService` → `MybatisRoleRepository` |
| 接口前缀 | `/api/roles` |
| 权限码 | `system:role:list` · `system:role:create` · `system:role:update` · `system:role:delete` · `system:role:assign-menu`；`GET /options` 仅需登录 |
| 种子 | `super_admin`「超级管理员」（id=1，内置），绑定全部菜单 |

## 1. 列表

接口 `GET /api/roles`，按 `sort`、`id` 升序；无排序参数，前端不提供列排序。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 角色名称 | `name` | 内置角色追加蓝色「内置」`Tag` |
| 2 | 角色编码 | `code` | 原值 |
| 3 | 描述 | `description` | 空值 `—` |
| 4 | 排序 | `sort` | 原值 |
| 5 | 用户数 | 派生：`sys_user_role` 按 `role_id` 计数（`userCount`） | 原值 |
| 6 | 状态 | `status` | `StatusTag` |
| 7 | 创建时间 | `created_at` | 原值 |
| 8 | 操作 | — | 有 `update` / `assign-menu` / `delete` 任一权限才出现 |

**筛选项**：输入框「角色名称 / 编码」→ `keyword`（`name`、`code` 两列 `LIKE`）；`DictSelect`（`sys_common_status`）→ `status`（等值）。点「查询」生效，「重置」清空。

**分页**：`page` 默认 1、`pageSize` 默认 20（上限 200，越界钳位）；前端可切换条数、显示总数。

## 2. 字段与表单

新增 / 编辑共用 `RoleFormModal`。

| 字段 | 前端控件 | 前端校验 | 后端校验 | DB 列 / 类型 |
| --- | --- | --- | --- | --- |
| 角色名称 | `Form.Input` | 必填；`maxLength=64` | `@NotBlank` `@Size(max=64)` | `name varchar(64)` |
| 角色编码 | `Form.Input`，内置角色 `disabled` | 必填；`/^[a-z][a-z0-9_]{1,63}$/` | `@NotBlank` `@Size(max=64)`；领域 `Role.validateCode` 同一正则，否则 100001；查重 100003「角色编码已存在」；内置角色改编码 100004 | `code varchar(64)` 唯一 |
| 描述 | `Form.TextArea` | `maxLength=256` | `@Size(max=256)`；空白存 `null` | `description varchar(256) null` |
| 排序 | `Form.InputNumber` | `min=0` | 可空；新增空值 0，编辑空值保持原值；不限下限 | `sort int` 默认 0 |
| 状态 ❌ | `Form.RadioGroup`（启用/禁用），**内置角色也可选禁用** | 无 | 新增空值 `enabled`，编辑空值保持原值；内置角色禁用 100004「内置角色不可禁用」 | `status varchar(16)` 默认 `enabled` |

`is_builtin` 只能由种子写入；审计列自动填充。

**分配权限**（`RoleMenuSheet`，宽 520 的侧滑）：

- 数据：全量菜单树 `GET /api/menus`（含按钮、含禁用）+ 角色详情 `GET /api/roles/{id}` 的 `menuIds`。
- `Tree` 以 `checkRelation="unRelated"` 模式渲染，联动由 `applyMenuCheck` 自己算：勾选一个节点连带勾上全部后代与全部祖先；
  取消一个节点连带取消全部后代，祖先保持不变。另有「全选」「清空」按钮与「已选 N 项」计数。
- 菜单树和详情均成功且未刷新时才允许勾选、全选、清空和保存；分别提供错误与重试，重试保留仍有效的草稿，成功的真实空权限可保存。
- 提交体 `{menuIds:number[]}`，可包含目录节点；后端 `@NotNull`，每个 ID 必须存在，否则 100001「menuIds: 包含不存在的菜单」。

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增角色（工具栏最左） | `POST /api/roles` → `{id}` | `system:role:create` | ✅ 角色管理 / 新增角色 | 见 §2；`is_builtin=false` |
| 编辑（行） | `PUT /api/roles/{id}` | `system:role:update` | ✅ 修改角色 | 404 角色不存在；内置角色改编码或禁用 100004；编码查重 100003；成功后全部授权快照失效 |
| 分配权限（行） | `PUT /api/roles/{id}/menus` | `system:role:assign-menu` | ✅ 分配菜单 | 全量覆盖 `sys_role_menu`（先删后插，去重后按 ID 排序）；成功后全部授权快照失效 |
| 删除（行「操作」列，确认后执行；窄屏（< 992px）收在「…」菜单里） | `DELETE /api/roles/{id}` | `system:role:delete` | ✅ 删除角色 | 内置角色 100004「内置角色不可删除」；仍有用户绑定 100004「角色下仍有 N 个用户，请先解除绑定」；同时删 `sys_role_menu`。前端只对内置角色禁用按钮；有用户时确认框仅提示人数，确认后由后端拒绝 |
| —（下拉数据源） | `GET /api/roles/options` | 仅登录 | — | 启用角色 `[{id, name, code}]`，按 `sort`、`id`；用户表单在用 |
| —（详情） | `GET /api/roles/{id}` | `system:role:list` | — | `RoleView` + `menuIds`（升序）；分配权限侧滑在用 |

**授权生效口径**（`Authorization` / `AuthorizationResolver`）：只有**启用**角色参与授权；角色编码含 `super_admin` 即为超管，
拥有全部「自身及祖先都启用」的菜单；非超管的可见导航 = 被授予且链路启用的菜单 + 其祖先。禁用一个角色即时收回其权限。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`（`leading` / `conditions` / `onRefresh`）、`TableActions`（`useActionsColumn`）、`Permission`
- `StatusTag`（列表）与 `STATUS_OPTIONS`（表单）
- `DictSelect`（状态筛选，字典 `sys_common_status`）
- 工具函数（非组件）：`utils/menu.ts` 的 `applyMenuCheck`、`flattenTree`

## 5. 说明与建议

- 角色新增/编辑已接入 `useFormCloseGuard`：有实际修改时关闭须确认，校验和保存期间禁止关闭与重复提交，失败保留草稿。角色列表提供持续失败提示、原参数重试、缓存刷新失败说明和可清空条件的成功空态。

- 角色创建/编辑、删除和分配菜单成功后，当前会话主动刷新资料和菜单，按钮与导航采用更新授权；写入失败保留原身份快照。其他管理员会话不在主动刷新范围。
- 种子里 `super_admin` 仍绑定全部菜单，只为在分配权限侧滑里显示一致的勾选状态；超管判定本身不依赖 `sys_role_menu`。
- 建议：内置角色的状态单选与用户表单保持一致，前端直接禁用（#02）。

## 6. 已知问题汇总

- **#02 🔴 P3 内置角色编辑弹窗仍可选「禁用」，提交后才被拒**
  `RoleFormModal` 只对内置角色禁用了「角色编码」，状态单选可改；后端 `Role.withDetails` 对内置角色禁用返回 100004
  「内置角色不可禁用」。对照：用户表单对内置用户的状态单选是 `disabled` 的。
- **#03 ❓ P3 契约 §6.3 未记载的后端规则（与代码不符，以代码为准）**
  契约只写「内置角色 code 不可改」「内置角色不能删；有用户绑定时 100004」。代码另有：内置角色不可禁用（100004）；
  分配菜单时 `menuIds` 含不存在的菜单返回 100001；只有启用角色参与授权。契约需补记。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-11-14**

- **#06 ✅ P1 分配权限详情加载失败后仍可保存空权限**
  由 `guard-permission-editing-and-refresh` 解决。菜单树及详情均成功且未刷新才开放勾选和保存；分别提供错误与重试，保留有效草稿，合法空权限可保存。

- **#01 ✅ P3 改角色 / 分配权限后，当前登录人的侧边栏与按钮权限不刷新**
  由 `guard-permission-editing-and-refresh` 解决。角色创建/编辑、删除及分配菜单成功后，保留角色查询失效并刷新当前资料及菜单；失败不触发身份失效。

**2026-10-23**（关联表自增主键）

- `sys_role_menu` 增加自增 `id` 主键，原 `(role_id, menu_id)` 联合主键改为唯一索引，角色菜单去重规则不变。

**2026-09-27**
- **#05 ✅ P3 角色列表按 `rules/advisory/list-view.md` 约定改造**
  「新增角色」移到工具栏最左；操作列（编辑 / 分配权限 / 删除）改用 `TableActions`，表格容器窄屏（< 992px）收成「…」；加刷新按钮与「已选条件」（关键字、状态名称）。

**2026-09-26**
- **#04 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_role` 的列表、表单、分配权限与已知问题。

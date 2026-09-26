# sys_role 角色管理

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `weiran4j/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`RoleController.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/RoleController.java)、
> [`SaveRoleRequest.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/request/SaveRoleRequest.java) /
> [`AssignMenusRequest.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/request/AssignMenusRequest.java)、
> [`RoleApplicationService.java`](../../../weiran4j/weiran-system/weiran-system-application/src/main/java/com/weiran/system/application/role/RoleApplicationService.java)、
> [`Role.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/role/Role.java)、
> [`Authorization.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/auth/Authorization.java)、
> [`MybatisRoleRepository.java`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/java/com/weiran/system/infrastructure/persistence/MybatisRoleRepository.java)、
> [`V202609260001__system_init_schema.sql`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609260001__system_init_schema.sql)、
> [`RolesPage.tsx`](../../../web/src/pages/system/roles/RolesPage.tsx) /
> [`RoleFormModal.tsx`](../../../web/src/pages/system/roles/RoleFormModal.tsx) /
> [`RoleMenuSheet.tsx`](../../../web/src/pages/system/roles/RoleMenuSheet.tsx)、
> [`hooks/queries/roles.ts`](../../../web/src/hooks/queries/roles.ts)、[`utils/menu.ts`](../../../web/src/utils/menu.ts)（`applyMenuCheck`）。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_role`（关联表 `sys_role_menu`：`role_id + menu_id` 联合主键；`sys_user_role` 见 `sys_user.md`） |
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
| 角色编码 | `Form.Input`，内置角色 `disabled` | 必填；`/^[a-z][a-z0-9_]{1,63}$/` | `@NotBlank` `@Size(max=64)`；领域 `Role.validateCode` 同一正则，否则 40000；查重 40900「角色编码已存在」；内置角色改编码 40901 | `code varchar(64)` 唯一 |
| 描述 | `Form.TextArea` | `maxLength=256` | `@Size(max=256)`；空白存 `null` | `description varchar(256) null` |
| 排序 | `Form.InputNumber` | `min=0` | 可空；新增空值 0，编辑空值保持原值；不限下限 | `sort int` 默认 0 |
| 状态 ❌ | `Form.RadioGroup`（启用/禁用），**内置角色也可选禁用** | 无 | 新增空值 `enabled`，编辑空值保持原值；内置角色禁用 40901「内置角色不可禁用」 | `status varchar(16)` 默认 `enabled` |

`is_builtin` 只能由种子写入；审计列自动填充。

**分配权限**（`RoleMenuSheet`，宽 520 的侧滑）：

- 数据：全量菜单树 `GET /api/menus`（含按钮、含禁用）+ 角色详情 `GET /api/roles/{id}` 的 `menuIds`。
- `Tree` 以 `checkRelation="unRelated"` 模式渲染，联动由 `applyMenuCheck` 自己算：勾选一个节点连带勾上全部后代与全部祖先；
  取消一个节点连带取消全部后代，祖先保持不变。另有「全选」「清空」按钮与「已选 N 项」计数。
- 提交体 `{menuIds:number[]}`，可包含目录节点；后端 `@NotNull`，每个 ID 必须存在，否则 40000「menuIds: 包含不存在的菜单」。

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增角色（工具栏） | `POST /api/roles` → `{id}` | `system:role:create` | ✅ 角色管理 / 新增角色 | 见 §2；`is_builtin=false` |
| 编辑（行） | `PUT /api/roles/{id}` | `system:role:update` | ✅ 修改角色 | 404 角色不存在；内置角色改编码或禁用 40901；编码查重 40900；成功后全部授权快照失效 |
| 分配权限（行） | `PUT /api/roles/{id}/menus` | `system:role:assign-menu` | ✅ 分配菜单 | 全量覆盖 `sys_role_menu`（先删后插，去重后按 ID 排序）；成功后全部授权快照失效 |
| 删除（行，`Popconfirm`） | `DELETE /api/roles/{id}` | `system:role:delete` | ✅ 删除角色 | 内置角色 40901「内置角色不可删除」；仍有用户绑定 40901「角色下仍有 N 个用户，请先解除绑定」；同时删 `sys_role_menu`。前端只对内置角色禁用按钮；有用户时 `Popconfirm` 仅提示人数，确认后由后端拒绝 |
| —（下拉数据源） | `GET /api/roles/options` | 仅登录 | — | 启用角色 `[{id, name, code}]`，按 `sort`、`id`；用户表单在用 |
| —（详情） | `GET /api/roles/{id}` | `system:role:list` | — | `RoleView` + `menuIds`（升序）；分配权限侧滑在用 |

**授权生效口径**（`Authorization` / `AuthorizationResolver`）：只有**启用**角色参与授权；角色编码含 `super_admin` 即为超管，
拥有全部「自身及祖先都启用」的菜单；非超管的可见导航 = 被授予且链路启用的菜单 + 其祖先。禁用一个角色即时收回其权限。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`、`Permission`
- `StatusTag`（列表）与 `STATUS_OPTIONS`（表单）
- `DictSelect`（状态筛选，字典 `sys_common_status`）
- 工具函数（非组件）：`utils/menu.ts` 的 `applyMenuCheck`、`flattenTree`

## 5. 说明与建议

- **后端即时、前端不即时**：角色与授权变更都会 `AuthSnapshotCache.evictAll()`，接口层的权限校验立刻按新授权执行；
  但前端当前登录人的 `me`（权限码）与侧边栏菜单是 `staleTime=Infinity` 的查询，角色相关 mutation 不让它们失效（见 #01）。
- 种子里 `super_admin` 仍绑定全部菜单，只为在分配权限侧滑里显示一致的勾选状态；超管判定本身不依赖 `sys_role_menu`。
- 建议：内置角色的状态单选与用户表单保持一致，前端直接禁用（#02）。

## 6. 已知问题汇总

- **#01 🔴 P3 改角色 / 分配权限后，当前登录人的侧边栏与按钮权限不刷新**
  `useAssignRoleMenus` 成功后只让 `roleKeys.detail(id)` 失效，`useSaveRole` / `useDeleteRole` 只让 `roleKeys.all` 失效；
  `authKeys.me` 与 `authKeys.menus` 为 `staleTime: Infinity` 且无人失效。症状：管理员修改了自己所属角色的菜单或状态后，
  侧边栏与 `Permission` 控制的按钮仍按旧授权显示，点击时后端按新授权返回 403；刷新页面或重新登录后才一致。
- **#02 🔴 P3 内置角色编辑弹窗仍可选「禁用」，提交后才被拒**
  `RoleFormModal` 只对内置角色禁用了「角色编码」，状态单选可改；后端 `Role.withDetails` 对内置角色禁用返回 40901
  「内置角色不可禁用」。对照：用户表单对内置用户的状态单选是 `disabled` 的。
- **#03 ❓ P3 契约 §6.3 未记载的后端规则（与代码不符，以代码为准）**
  契约只写「内置角色 code 不可改」「内置角色不能删；有用户绑定时 40901」。代码另有：内置角色不可禁用（40901）；
  分配菜单时 `menuIds` 含不存在的菜单返回 40000；只有启用角色参与授权。契约需补记。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-09-26**
- **#04 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_role` 的列表、表单、分配权限与已知问题。

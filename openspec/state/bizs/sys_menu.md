# sys_menu 菜单管理

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `server/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`MenuController.java`](../../../server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/backend/MenuController.java)、
> [`SaveMenuRequest.java`](../../../server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/backend/request/SaveMenuRequest.java)、
> [`MenuApplicationService.java`](../../../server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/menu/MenuApplicationService.java) /
> [`MenuAssembler.java`](../../../server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/menu/MenuAssembler.java)、
> [`Menu.java`](../../../server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/menu/Menu.java) /
> [`MenuType.java`](../../../server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/menu/MenuType.java) /
> [`Hierarchy.java`](../../../server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/hierarchy/Hierarchy.java) /
> [`Authorization.java`](../../../server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/auth/Authorization.java)、
> [`MybatisMenuRepository.java`](../../../server/weiran-system/weiran-system-infrastructure/src/main/java/com/wulicode/weiran/system/infrastructure/persistence/MybatisMenuRepository.java)、
> [`V202609260001__system_init_schema.sql`](../../../server/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609260001__system_init_schema.sql) /
> [`V202609260002__system_seed_data.sql`](../../../server/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609260002__system_seed_data.sql)、
> [`MenusPage.tsx`](../../../backend/src/pages/system/menus/MenusPage.tsx) /
> [`MenuFormModal.tsx`](../../../backend/src/pages/system/menus/MenuFormModal.tsx)、
> [`hooks/queries/menus.ts`](../../../backend/src/hooks/queries/menus.ts)、[`utils/menu.ts`](../../../backend/src/utils/menu.ts)、
> [`App.tsx`](../../../backend/src/App.tsx)、[`AdminLayout.tsx`](../../../backend/src/layouts/AdminLayout.tsx) / [`useTabs.ts`](../../../backend/src/layouts/useTabs.ts)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_menu`（目录 / 菜单 / 按钮共用一张表；`sys_role_menu` 见 `sys_role.md`） |
| 菜单 | 系统管理 › 菜单管理（`sys_menu.id = 5`） |
| 路由 | `/system/menus` |
| 页面组件 | `system/menus/MenusPage`（弹窗 `MenuFormModal`） |
| 后端模块 | `weiran-system`；`MenuController` → `MenuApplicationService` → `MybatisMenuRepository` |
| 接口前缀 | `/api/menus`（管理）；`/api/auth/menus`（当前用户可见菜单树，`AuthController`） |
| 权限码 | `system:menu:list` · `system:menu:create` · `system:menu:update` · `system:menu:delete` |
| 种子 | 通用菜单 id 1–13 固定；可选 local/test 演示 id 14–20；安全设置 id 23 为隐藏路由；按钮 id 100–129；前端与测试按 ID 引用 |

## 1. 列表

接口 `GET /api/menus` 返回**全量树**（含按钮、含禁用），同级按 `sort`、`id` 升序；**不分页、无筛选**。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 菜单名称 | `title` + `icon` | lucide 图标 + 标题 |
| 2 | 类型 | `type` | 目录（蓝）/ 菜单（绿）/ 按钮（橙）`Tag` |
| 3 | 路由路径 | `path` | 空值 `—` |
| 4 | 组件 | `component` | 空值 `—` |
| 5 | 权限码 | `permission` | 空值 `—` |
| 6 | 排序 | `sort` | 原值 |
| 7 | 显示 | `visible` | 按钮行 `—`，否则「是 / 否」 |
| 8 | 状态 | `status` | `StatusTag` |
| 9 | 操作 | — | 有 `create` / `update` / `delete` 任一权限才出现 |

工具栏：右侧「展开树状」开关（全部展开 ↔ 全部收起）、列设置、刷新；默认只展开目录行（按钮行收起）。`keep_alive`、`is_external` 不在列表展示。

## 2. 字段与表单

`MenuFormModal`（宽 640）按「类型」动态显隐字段；提交前 `toRequest` 按类型清洗字段。

| 字段 | 前端控件 | 显示条件 | 前端校验 | 后端校验 | DB 列 / 类型 |
| --- | --- | --- | --- | --- | --- |
| 上级 | `Form.TreeSelect`（「顶级」+ 非按钮节点；编辑时禁选自己与后代） | 恒显示 | 无 | `@NotNull` `@PositiveOrZero`；非 0 时须存在（100001）；不能是自己或后代（100004）；父节点为按钮 100001 | `parent_id bigint` 默认 0 |
| 类型 | `Form.RadioGroup` 按钮式 | 恒显示 | 无 | `@NotBlank`；只能 `directory/menu/button`（100001）；有子节点的菜单改为按钮 100001 | `type varchar(16)` |
| 名称 | `Form.Input` | 恒显示 | 必填；`maxLength=64` | `@NotBlank` `@Size(max=64)` | `title varchar(64)` |
| 图标 | `IconPicker`（`withField`） | 非按钮 | 无 | `@Size(max=64)`；空白存 `null` | `icon varchar(64) null` |
| 路由路径 / 外链地址 | `Form.Input` | 非按钮 | `type=menu` 必填；`maxLength=256` | `@Size(max=256)`；`type=menu` 时必填（100001）；外链不校验 URL 格式 | `path varchar(256) null` |
| 组件 | `Form.Input` | `type=menu` 且非外链 | `maxLength=256` | `@Size(max=256)` | `component varchar(256) null` |
| 权限码 | `Form.Input` | 非目录 | `type=button` 必填；`maxLength=128` | `@Size(max=128)`；`type=button` 时必填（100001） | `permission varchar(128) null` |
| 排序 | `Form.InputNumber` | 恒显示 | `min=0` | 可空；新增 0，编辑保持原值 | `sort int` 默认 0 |
| 显示 | `Form.Switch` | 非按钮 | 无 | 可空；新增 `true`，编辑保持原值 | `visible tinyint(1)` 默认 1 |
| 外链 | `Form.Switch` | `type=menu` | 无 | 可空；新增 `false`，编辑保持原值 | `is_external tinyint(1)` 默认 0 |
| 缓存 | `Form.Switch` | `type=menu` 且非外链 | 无 | 可空；新增 `false`，编辑保持原值 | `keep_alive tinyint(1)` 默认 0 |
| 状态 | `Form.RadioGroup` | 恒显示 | 无 | 新增 `enabled`，编辑保持原值 | `status varchar(16)` 默认 `enabled` |

`toRequest` 的清洗：按钮一律提交 `path/component/icon = null`、`visible=true`、`keepAlive=false`、`isExternal=false`；
目录提交 `component=null`、`keepAlive=false`、`isExternal=false`；外链菜单提交 `component=null`。
新增时的默认值：在菜单下新增默认类型为「按钮」，在目录或根下新增默认「菜单」；在目录下新增时路径预填 `<目录路径>/`。

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增菜单（工具栏最左）/ 新增子项（行，按钮行不显示） | `POST /api/menus` → `{id}` | `system:menu:create` | ✅ 菜单管理 / 新增菜单 | 见 §2；成功后全部授权快照失效 |
| 编辑（行） | `PUT /api/menus/{id}` | `system:menu:update` | ✅ 修改菜单 | 404 菜单不存在；上级合法性、类型组合同 §2；成功后全部授权快照失效 |
| 删除（行「操作」列，确认后执行；窄屏（< 992px）收在「…」菜单里） | `DELETE /api/menus/{id}` | `system:menu:delete` | ✅ 删除菜单 | 有子节点 100004「请先删除子菜单」；同时删 `sys_role_menu` 里该菜单的授权 |
| —（详情） | `GET /api/menus/{id}` | `system:menu:list` | — | 单节点、`children` 为空；前端页面未调用 |

保存 / 删除成功后前端让 `menuKeys.all` 与 `authKeys.menus`（侧边栏）失效，但不让 `authKeys.me` 失效（见 #02）。

**菜单驱动路由**（`App.tsx` + `utils/menu.ts` 的 `menusToRoutes`）：取 `/api/auth/menus`，只为 `type=menu`、启用、非外链、
有 `path` 的节点注册路由；`visible=false` 的也注册，只是侧边栏不显示；同路径重复时保留第一个；`component` 在
`page-registry` 找不到时渲染「页面不存在」占位。外链菜单在侧边栏点击时 `window.open(path, '_blank')`。
`/api/auth/menus` 只返回目录与菜单，且要求**自身及全部祖先都启用**；非超管另需被授予（祖先自动带出）。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`（`leading` 新增、`treeExpand` 展开树状、`onRefresh`、`tools` 列设置）、`TableActions`（`useActionsColumn`）、`Permission`
- `ColumnSettings` 的 `useColumnSettings('system/menus', …)`（偏好 `showTableColumnSettings`，列的显隐与顺序存本机）
- `StatusTag`（列表）与 `STATUS_OPTIONS`（表单）
- `IconPicker`（表单图标，经 Semi `withField` 包装）
- 工具函数（非组件）：`utils/icons.tsx` 的 `renderIcon`；`utils/menu.ts` 的 `flattenTree`、`pruneEmptyChildren`、`collectSubtreeIds`

## 5. 说明与建议

- **禁用的传递性**：一个目录被禁用后，其下全部菜单与按钮的权限码都不再生效、也不出现在导航中（`Authorization.enabledIds`
  逐级检查祖先），即使子节点自身仍是启用状态。
- **权限码与按钮**：权限码挂在 `type=button` 的节点上；`type=menu` 也可以带权限码（种子里 1–11 号菜单即如此）。
- **「缓存」开关**：由 `layouts/KeepAliveOutlet` 消费——用户偏好「页面缓存」（`enablePageCache`）开启且启用多页签时，`keepAlive=true` 的页面切换页签保留状态、关页签即释放（#01）。

## 6. 已知问题汇总

- **#02 🔴 P3 改菜单的权限码或状态后，当前登录人的按钮权限不刷新**
  `useSaveMenu` / `useDeleteMenu` 成功后让 `authKeys.menus`（侧边栏）失效，但不让 `authKeys.me` 失效；
  `me.permissions` 是 `staleTime: Infinity`。症状：改掉或禁用一个按钮节点后，侧边栏已更新，页面上 `Permission`
  控制的按钮仍按旧权限码显示/隐藏，直到刷新页面或重新登录。
- **#03 ❓ P3 契约 §6.1 / §6.4 未记载的后端规则（与代码不符，以代码为准）**
  契约 §6.4 只写了「type=menu 时 path 必填；type=button 时 permission 必填」「parentId 不能是自己或后代（100004）」
  「有子节点 100004」。代码另有：父节点是按钮时 100001「按钮下不能再添加子节点」；有子节点的菜单改为按钮 100001；
  上级不存在 100001。契约 §6.1 写 `/api/auth/menus` 返回「status=enabled」的节点，代码实际要求**自身及全部祖先**都启用。契约需补记。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-10-31**
- 移除资源库“上传文件”按钮 id 124 及其角色关联；登录用户上传文件不再依赖资源库按钮权限。

**2026-10-27**
- 安全设置菜单 id 23 移为顶级隐藏路由，侧边栏不再显示；入口改在顶栏用户菜单，权限按钮 id 129 保留。

**2026-10-24**
- 批处理权限按钮 id 126–128 挂在资源库下；可选演示菜单 id 20 指向 `/demo/batch`。

**2026-10-22**
- 下游追加 `V202610221802__system_remove_app_demo.sql`，清理 local/test 历史演示种子；前端演示页面与注册入口已删除。
- 组件演示菜单从通用基座迁至 `weiran-app` 的 local/test 专用 Flyway 路径；通用系统迁移删除历史演示菜单，生产环境不再展示。

**2026-10-21**
- 组件演示新增「配置表单」子页（id 19，`/demo/config`），用本地数据展示系统配置的八种字段类型。

**2026-10-18**
- 将「组件演示」提升为顶层目录（id 14，`/demo`），分成列表与筛选、导航列表、字段与标签、权限与入口 4 个子页（id 15–18）；不新增业务接口或权限码。通过后续 Flyway 迁移兼容已应用旧菜单的数据库。

**2026-09-27**
- **#05 ✅ P3 菜单列表按 `rules/advisory/list-view.md` 约定改造**
  「新增菜单」移到工具栏最左；原「全部展开」「全部收起」两个文字按钮换成右侧工具的「展开树状」开关；操作列（新增子项 / 编辑 / 删除）改用 `TableActions`，窄屏（< 992px）收成「…」；加刷新按钮。
- **#01 ✅ P3 「缓存」（`keep_alive`）可保存但前端切换页签不保活**
  原症状：表单与 `types/api.ts` 读写 `keepAlive`，后端原样落库并在 `MenuNode` 返回，但前端除表单与类型定义外无任何地方读取它；
  `AdminLayout` 内容区只有一个 `<Outlet />`，开关打开后切走再切回，页面筛选条件、分页、滚动位置全部重置。
  解决：偏好系统第二阶段新增 `layouts/KeepAliveOutlet`（React 19 `<Activity>`，移植自 mono4ts）。`keepAlive=true` 的页面在
  偏好「页面缓存」（`enablePageCache`，默认开）开启且启用多页签时隐藏保活，关闭页签即释放，最多 10 个 LRU，`.admin-content` 滚动位置按页恢复；
  用户关掉该偏好或多页签时不缓存。隐藏期间页面 Effects 卸载（定时器、订阅暂停），state 保留。
  测试：`layouts/__tests__/NavPreferences.test.tsx`（enablePageCache 组）、`layouts/__tests__/KeepAliveOutlet.test.ts`。

**2026-09-26**
- **#04 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_menu` 的列表、表单、菜单驱动路由与已知问题。

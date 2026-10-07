# sys_dict 字典管理

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `weiran4j/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
> 本文件同时覆盖子表 `sys_dict_item`（字典项）。
>
> 事实源：
> [`DictController.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/platform/adapter/web/DictController.java)、
> [`SaveDictRequest.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/platform/adapter/web/request/SaveDictRequest.java) /
> [`SaveDictItemRequest.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/platform/adapter/web/request/SaveDictItemRequest.java)、
> [`DictApplicationService.java`](../../../weiran4j/weiran-system/weiran-system-application/src/main/java/com/weiran/platform/application/dict/DictApplicationService.java)、
> [`Dict.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/platform/domain/dict/Dict.java) /
> [`DictItem.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/platform/domain/dict/DictItem.java)、
> [`MybatisDictRepository.java`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/java/com/weiran/platform/infrastructure/persistence/MybatisDictRepository.java)、
> [`V202609260101__platform_init_schema.sql`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/platform/V202609260101__platform_init_schema.sql) /
> [`V202609260102__platform_seed_data.sql`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/platform/V202609260102__platform_seed_data.sql)、
> [`DictsPage.tsx`](../../../web/src/pages/system/dicts/DictsPage.tsx) /
> [`DictFormModals.tsx`](../../../web/src/pages/system/dicts/DictFormModals.tsx)、
> [`hooks/queries/dicts.ts`](../../../web/src/hooks/queries/dicts.ts)、
> [`DictTag.tsx`](../../../web/src/components/DictTag.tsx) / [`DictSelect.tsx`](../../../web/src/components/DictSelect.tsx)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_dict`（字典）+ `sys_dict_item`（字典项，`dict_id` 关联；唯一键 `(dict_id, value)`） |
| 菜单 | 系统管理 › 字典管理（`sys_menu.id = 7`） |
| 路由 | `/system/dicts` |
| 页面组件 | `system/dicts/DictsPage`（左：`NavListPanel` 字典列表，同 mono4ts；右：`DictItemsPanel` 字典项；弹窗 `DictFormModal`、`DictItemFormModal`） |
| 后端模块 | `weiran-system`（DDD 五层）；`DictController` → `DictApplicationService` → `MybatisDictRepository` |
| 接口前缀 | `/api/dicts` |
| 权限码 | `system:dict:list` · `system:dict:create` · `system:dict:update`（**字典项的增删改也用它**）· `system:dict:delete`；`GET /code/{code}/items` 仅需登录 |
| 种子 | 内置字典 `sys_user_gender`（male 男 / female 女 / unknown 未知）、`sys_common_status`（enabled 启用 / disabled 禁用），均带颜色 |

## 1. 列表

### 1.1 字典列表（左栏）

接口 `GET /api/dicts`，按 `id` 升序。左栏是 `NavListPanel`（固定宽 300px，贴住内容区顶部，超出在栏内滚动；< lg 时堆叠在上方，最高 420px），
不是表格，因此没有列设置。

| # | 条目内容 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 第一行 | `name` · `code` | 名称加粗，编码灰色，超长省略 |
| 2 | 第二行 | `createdAt` | 原值（契约格式 `YYYY-MM-DD HH:mm:ss`）；内置字典追加蓝色「内置」、停用字典追加灰色「停用」小标签，停用条目整体半透明 |
| 3 | 「…」操作菜单 | — | 有 `update` / `delete` 任一权限才出现，悬停或选中时显示：编辑、删除（内置字典显示为禁用的「内置字典不可删除」）；点击菜单不会选中该条目 |

标题栏「字典列表」右侧「…」菜单：刷新、新增字典（需 `create`）。底部为小号分页。`description`、`updatedAt` 接口返回但未展示。
**默认选中当前页第一项**；点击条目切换选中，右栏加载其字典项；选中项按 id 从最新列表推导，被删除 / 翻页 / 搜索后不在当前页时回落到第一项。

**筛选项**：只有搜索框「名称 / 编码」→ `keyword`（`name`、`code` 两列 `LIKE`），回车生效并回到第一页；无「重置」按钮（清空后回车即恢复）。
后端还支持 `status` 过滤，前端未提供。

**分页**：`page` 默认 1、`pageSize` 默认 20（上限 200）；前端有翻页，未开启条数切换与总数显示。

### 1.2 字典项（右栏 `DictItemsPanel`）

接口 `GET /api/dicts/{id}/items` 返回该字典的**全部**字典项（含禁用），按 `sort`、`id` 升序；不分页。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 标签 | `label` + `color` | 按颜色渲染的 `Tag`，无颜色为 grey |
| 2 | 值 | `value` | 原值 |
| 3 | 排序 | `sort` | 原值 |
| 4 | 状态 | `status` | `StatusTag` |
| 5 | 备注 | `remark` | 空值 `—` |
| 6 | 操作 | — | 有 `system:dict:update` 才出现（编辑、删除） |

面板标题 `字典项：<名称>（<编码>）`，右上角「新增字典项」同样只对 `system:dict:update` 显示。

## 2. 字段与表单

### 2.1 字典（`DictFormModal`）

| 字段 | 前端控件 | 前端校验 | 后端校验 | DB 列 / 类型 |
| --- | --- | --- | --- | --- |
| 字典名称 | `Form.Input` | 必填；`maxLength=64` | `@NotBlank` `@Size(max=64)` | `name varchar(64)` |
| 字典编码 | `Form.Input`，内置字典 `disabled`；提交前 `trim` | 必填；`maxLength=64` | `@NotBlank` `@Size(max=64)`；去空白后查重 40900「字典编码已存在」；内置字典改编码 40901；无格式规则 | `code varchar(64)` 唯一 |
| 描述 | `Form.TextArea` | `maxLength=256` | `@Size(max=256)`；空白存 `null` | `description varchar(256) null` |
| 状态 ❌ | `Form.RadioGroup`，**内置字典也可选禁用** | 无 | 新增 `enabled`，编辑保持原值；内置字典禁用 40901「内置字典不可禁用」 | `status varchar(16)` 默认 `enabled` |

### 2.2 字典项（`DictItemFormModal`）

| 字段 | 前端控件 | 前端校验 | 后端校验 | DB 列 / 类型 |
| --- | --- | --- | --- | --- |
| 标签 | `Form.Input` | 必填；`maxLength=64` | `@NotBlank` `@Size(max=64)` | `label varchar(64)` |
| 值 | `Form.Input` | 必填；`maxLength=64` | `@NotBlank` `@Size(max=64)`；去空白后在同一字典内查重 40900「字典项值已存在」 | `value varchar(64)`，唯一 `(dict_id, value)` |
| 颜色 | `Form.Select`（15 个 Semi `Tag` 预置色），可清空 | 无 | `@Size(max=32)`；不限定取值 | `color varchar(32) null` |
| 排序 | `Form.InputNumber` | `min=0` | 可空；新增 0，编辑保持原值 | `sort int` 默认 0 |
| 状态 | `Form.RadioGroup` | 无 | 新增 `enabled`，编辑保持原值 | `status varchar(16)` 默认 `enabled` |
| 备注 | `Form.TextArea` | `maxLength=256` | `@Size(max=256)`；空白存 `null` | `remark varchar(256) null` |

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增（左栏标题栏「…」→ 新增字典） | `POST /api/dicts` → `{id}` | `system:dict:create` | ✅ 字典管理 / 新增字典 | 见 §2.1 |
| 编辑（字典条目「…」） | `PUT /api/dicts/{id}` | `system:dict:update` | ✅ 修改字典 | 404 字典不存在；内置字典改编码 / 禁用 40901 |
| 删除（字典条目「…」，`Modal.confirm`） | `DELETE /api/dicts/{id}` | `system:dict:delete` | ✅ 删除字典 | 内置 40901「内置字典不可删除」（前端菜单项 disabled）；**级联删除全部字典项**；删的是当前选中字典时改选当前页第一项 |
| 新增字典项（右栏） | `POST /api/dicts/{id}/items` → `{id}` | `system:dict:update` | ✅ 新增字典项 | 字典不存在 404；值重复 40900 |
| 编辑（字典项行） | `PUT /api/dicts/{id}/items/{itemId}` | `system:dict:update` | ✅ 修改字典项 | 字典项不存在或不属于该字典 404 |
| 删除（字典项行「操作」列，确认后执行；窄屏（< 992px）收在「…」菜单里） | `DELETE /api/dicts/{id}/items/{itemId}` | `system:dict:update` | ✅ 删除字典项 | 同上 404；无内置保护 |
| —（下拉 / 标签数据源） | `GET /api/dicts/code/{code}/items` | 仅登录 | — | 编码不存在 404；**字典禁用时返回空数组**；只返回启用项 |
| —（详情） | `GET /api/dicts/{id}` | `system:dict:list` | — | 前端页面未调用 |

字典与字典项的任何保存 / 删除都让 `dictKeys.all` 失效，按编码缓存的下拉与标签（`staleTime` 5 分钟）随之刷新。

## 4. 用到的公共组件

- 本页：`NavListPanel` / `NavListItem`（左栏）、`PageContainer`（右栏）、`StatusTag`
- 消费本模块数据的组件：`DictTag`（按字典项渲染带色标签，找不到项时显示原值）、`DictSelect`（筛选栏下拉）；
  二者都走 `GET /api/dicts/code/{code}/items`，请求失败静默退化

## 5. 说明与建议

- **内置字典被前端硬编码引用**：`sys_common_status` 用于用户 / 角色 / 部门的状态筛选（`DictSelect`），`sys_user_gender`
  用于用户表单性别下拉与列表性别列（`DictTag`）。后端对内置字典本身禁止改编码、禁用、删除，但对其字典项没有保护（#03）。
- 字典项删除是物理删除，业务数据里已存的值不会随之变化；`DictTag` 找不到对应项时退化为显示原值。
- 建议：内置字典的状态单选在前端直接禁用（#02）；左栏可补上已有后端支持的状态筛选。

## 6. 已知问题汇总

- **#02 🔴 P3 内置字典编辑弹窗仍可选「禁用」，提交后才被拒**
  `DictFormModal` 只对内置字典禁用了「字典编码」，状态单选可改；后端 `Dict.withDetails` 返回 40901「内置字典不可禁用」。
- **#03 ❓ P3 内置字典的字典项可被任意修改或删除**
  `DictApplicationService.updateItem` / `deleteItem` 不检查所属字典是否内置。拥有 `system:dict:update` 的用户可以删掉
  `sys_common_status` 的 `enabled` 项或改掉其 `value`，此后用户 / 角色 / 部门页的状态筛选下拉缺项，`DictTag`
  显示原始值。是否需要保护待定。
- **#04 ❓ P3 契约 §6.7 未记载的后端规则（与代码不符，以代码为准）**
  契约写「内置字典 code 不可改」「内置不可删；级联删字典项」「`/code/{code}/items` 仅 enabled 项」。代码另有：
  内置字典不可禁用（40901）；字典本身禁用时 `/code/{code}/items` 返回空数组；编码不存在返回 40400。契约需补记。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-09-27**
- **#07 ✅ P3 字典项列表按 `rules/advisory/list-view.md` 约定改造**
  右栏字典项表格：操作列（编辑 / 删除）固定在右侧（补 `scroll.x`）并改用 `TableActions`，右栏窄屏（< 992px）收成「…」。
- **#06 ✅ P3 字典左栏改为 mono4ts 的导航列表**
  左栏由表格改为公共组件 `NavListPanel`：「名称 · 编码」+ 创建时间、停用 / 内置小标签、条目「…」菜单（编辑 / 删除）、
  标题栏「…」菜单（刷新 / 新增字典）、默认选中第一项。未走 openspec change（纯前端展示改版）。
- **#01 ✅ P3 编辑当前选中的字典后，右栏字典项面板标题不更新**
  原因：`selected` 存的是点击时的对象副本。随 #06 改为按 id 从最新列表推导选中项，保存后列表重新拉取、标题随之更新；
  `DictsPage.test.tsx` 有回归用例。

**2026-09-26**
- **#05 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_dict` / `sys_dict_item` 的双栏页面、表单、动作与已知问题。

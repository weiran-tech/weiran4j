# sys_department 部门管理

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `weiran4j/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`DepartmentController.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/DepartmentController.java)、
> [`SaveDepartmentRequest.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/request/SaveDepartmentRequest.java)、
> [`DepartmentApplicationService.java`](../../../weiran4j/weiran-system/weiran-system-application/src/main/java/com/weiran/system/application/department/DepartmentApplicationService.java)、
> [`Department.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/department/Department.java) /
> [`Hierarchy.java`](../../../weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/hierarchy/Hierarchy.java)、
> [`MybatisDepartmentRepository.java`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/java/com/weiran/system/infrastructure/persistence/MybatisDepartmentRepository.java)、
> [`V202609260001__system_init_schema.sql`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609260001__system_init_schema.sql)、
> [`DepartmentsPage.tsx`](../../../web/src/pages/system/departments/DepartmentsPage.tsx)（页面与内嵌的 `DepartmentFormModal`）、
> [`hooks/queries/departments.ts`](../../../web/src/hooks/queries/departments.ts)、
> [`DepartmentTreeSelect.tsx`](../../../web/src/components/DepartmentTreeSelect.tsx)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_department` |
| 菜单 | 系统管理 › 部门管理（`sys_menu.id = 6`） |
| 路由 | `/system/departments` |
| 页面组件 | `system/departments/DepartmentsPage`（同文件内的 `DepartmentFormModal`） |
| 后端模块 | `weiran-system`；`DepartmentController` → `DepartmentApplicationService` → `MybatisDepartmentRepository` |
| 接口前缀 | `/api/departments` |
| 权限码 | `system:department:list`（仅详情）· `system:department:create` · `system:department:update` · `system:department:delete`；**部门树 `GET /` 仅需登录**（管理页与各处下拉共用） |
| 种子 | 根部门「总公司」（id=1，code `HQ`） |

## 1. 列表

接口 `GET /api/departments` 返回整棵树（部门总量小，读全量在内存组树），同级按 `sort`、`id` 升序；**不分页**。
前端表格默认展开全部行。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 部门名称 | `name` | 树形缩进 |
| 2 | 部门编码 | `code` | 原值 |
| 3 | 负责人 | 派生：`leader_id → sys_user.nickname`（`leaderName`） | 空值 `—` |
| 4 | 联系电话 | `phone` | 空值 `—` |
| 5 | 排序 | `sort` | 原值 |
| 6 | 状态 | `status` | `StatusTag` |
| 7 | 创建时间 | `created_at` | 原值 |
| 8 | 操作 | — | 有 `create` / `update` / `delete` 任一权限才出现 |

**筛选项**：只有 `DictSelect`（`sys_common_status`）→ `status`，点「查询」生效。后端口径：只保留**自身及全部祖先**都满足该状态的部门
（`matchingWithAncestors`），被过滤掉的部门不会让其下级提升为根，而是连同整棵子树一起隐藏（见 #01、#02）。

## 2. 字段与表单

新增 / 编辑共用 `DepartmentFormModal`。

| 字段 | 前端控件 | 前端校验 | 后端校验 | DB 列 / 类型 |
| --- | --- | --- | --- | --- |
| 上级部门 | `Form.TreeSelect`（「顶级」+ 当前页面拿到的部门树；编辑时禁选自己与后代） | 无 | `@NotNull` `@PositiveOrZero`；非 0 时须存在（40000「parentId: 上级部门不存在」）；编辑时不能是自己或后代（40901） | `parent_id bigint` 默认 0 |
| 部门名称 | `Form.Input` | 必填；`maxLength=64` | `@NotBlank` `@Size(max=64)` | `name varchar(64)` |
| 部门编码 | `Form.Input` | 必填；`maxLength=64` | `@NotBlank` `@Size(max=64)`；去首尾空白后查重 40900「部门编码已存在」；无格式规则 | `code varchar(64)` 唯一 |
| 负责人 ❓ | `Form.Select`（可搜索、可清空），选项来自 `GET /api/users/options`（仅启用用户；负责人被禁用或删除后回填值无对应选项，见 `sys_user.md#03`） | 无 | 可空；非空时用户须存在（40000「leaderId: 负责人不存在」）；不校验用户是否启用 | `leader_id bigint null` |
| 联系电话 | `Form.Input` | `maxLength=20` | `@Size(max=20)`，无格式校验 | `phone varchar(20) null` |
| 排序 | `Form.InputNumber` | `min=0` | 可空；新增 0，编辑保持原值 | `sort int` 默认 0 |
| 状态 | `Form.RadioGroup` | 无 | 新增 `enabled`，编辑保持原值 | `status varchar(16)` 默认 `enabled` |

`leader_id` / `phone` 的 `SysDepartmentDO` 字段标 `updateStrategy = ALWAYS`，清空后能真正写回 `NULL`。

## 3. 动作

| 按钮 | 接口 | 权限码 | `@OperationLog` | 业务规则 / 错误码 |
| --- | --- | --- | --- | --- |
| 新增部门（工具栏）/ 新增下级（行） | `POST /api/departments` → `{id}` | `system:department:create` | ✅ 部门管理 / 新增部门 | 见 §2 |
| 编辑（行） | `PUT /api/departments/{id}` | `system:department:update` | ✅ 修改部门 | 404 部门不存在；见 §2 |
| 删除（行，`Popconfirm`） | `DELETE /api/departments/{id}` | `system:department:delete` | ✅ 删除部门 | 有下级 40901「请先删除下级部门」；仍有用户 40901「部门下仍有 N 个用户，请先调整用户部门」。前端不预判，确认后由后端拒绝 |
| —（详情） | `GET /api/departments/{id}` | `system:department:list` | — | 单节点、`children` 为空；前端页面未调用 |

部门变更不影响授权，不清授权快照缓存。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`、`Permission`
- `StatusTag`（列表）与 `STATUS_OPTIONS`（表单）
- `DictSelect`（状态筛选，字典 `sys_common_status`）
- `DepartmentTreeSelect.tsx` 导出的 `toDepartmentTreeData`（表单上级部门树）
- 工具函数（非组件）：`utils/menu.ts` 的 `collectSubtreeIds`、`flattenTree`、`pruneEmptyChildren`

## 5. 说明与建议

- **部门树是公共数据源**：`GET /api/departments` 只需登录，任何登录用户都能拿到完整部门树（含负责人昵称、电话）。
  用户管理的部门筛选与用户表单都用它，且不带 `status`，所以禁用部门在那两处仍可选。
- **负责人引用可能悬空**：删除用户不会清理 `leader_id`，悬空后编辑该部门会被拒绝，登记在 `sys_user.md#03`。
- **契约**：§6.5 只写「`status` 可选过滤」，未说明「连同子树隐藏」的语义；以代码为准（#01）。
- 建议：若「禁用」筛选需要能查出所有禁用部门，后端过滤应改为「命中节点 + 其祖先」的保留方式，而不是要求祖先也命中（#02）。

## 6. 已知问题汇总

- **#01 ⚠️ P3 按状态过滤部门树时，被过滤掉的部门连同其全部下级一起隐藏**
  `DepartmentApplicationService.matchingWithAncestors` 沿父链向上检查，任一祖先不满足过滤状态就排除该部门。
  症状：筛选「启用」时，一个禁用部门下面即使全是启用部门，也整棵子树都不出现。已由后端声明为知情接受。
- **#02 ❓ P3 筛选「禁用」时，挂在启用上级下面的禁用部门查不出来**
  与 #01 同一实现的另一面：筛选 `disabled` 要求自身**及全部祖先**都是禁用。种子根部门「总公司」是启用的，
  因此它下面的任何禁用部门在「禁用」筛选下都不会出现，只有自身为顶级（`parent_id=0`）的禁用部门及其全禁用子链可见。
  另外，筛选生效时表单的上级部门树取的也是过滤后的数据（`tree={data}`），新增 / 编辑时看不到被过滤掉的部门。是否需要修待定。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-09-26**
- **#03 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_department` 的树形列表、表单、动作与已知问题。

# cross-biz —— 跨模块业务定义

> 业务名称 ↔ 表 ↔ 页面的对照、表之间的关联,以及不属于任何单一模块的**业务口径**问题。
> 属于 `state/`,只描述事实,以代码为准;盘点基线 `e23c511`(2026-09-26)。

## 1. 名称 ↔ 表 ↔ 页面

| 业务名称 | 表 | 模块 | 菜单路由 | 页面组件 | 现状文档 |
| --- | --- | --- | --- | --- | --- |
| 用户 | `sys_user` | weiran-system | `/system/users` | `system/users/UsersPage` | [`sys_user.md`](sys_user.md) |
| 角色 | `sys_role` | weiran-system | `/system/roles` | `system/roles/RolesPage` | [`sys_role.md`](sys_role.md) |
| 菜单 / 权限点 | `sys_menu` | weiran-system | `/system/menus` | `system/menus/MenusPage` | [`sys_menu.md`](sys_menu.md) |
| 部门 | `sys_department` | weiran-system | `/system/departments` | `system/departments/DepartmentsPage` | [`sys_department.md`](sys_department.md) |
| 登录日志 | `sys_login_log` | weiran-system | `/logs/login` | `logs/LoginLogsPage` | [`sys_login_log.md`](sys_login_log.md) |
| 字典 / 字典项 | `sys_dict` / `sys_dict_item` | weiran-platform | `/system/dicts` | `system/dicts/DictsPage` | [`sys_dict.md`](sys_dict.md) |
| 系统配置 | `sys_config` | weiran-platform | `/system/configs` | `system/configs/ConfigsPage` | [`sys_config.md`](sys_config.md) |
| 操作日志 | `sys_operation_log` | weiran-platform | `/logs/operation` | `logs/OperationLogsPage` | [`sys_operation_log.md`](sys_operation_log.md) |

> **路由不在前端代码里。** 菜单(含 `path` 与 `component`)存在 `sys_menu`,种子在
> `weiran4j/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/`;
> 前端拿到 `/api/auth/menus` 后用 `web/src/utils/page-registry.ts` 的 `import.meta.glob` 把 `component` 解析成懒加载页面。
> **在 `App.tsx` 里 grep 页面名是搜不到路由的。**

## 2. 关联(应用层保证,库里不建外键约束)

| 关联 | 形态 | 说明 |
| --- | --- | --- |
| 用户 ↔ 角色 | `sys_user_role(user_id, role_id)` 多对多 | 用户表单全量覆盖(`roleIds` 必填);内置 admin 必须保留 `super_admin` |
| 角色 ↔ 菜单 | `sys_role_menu(role_id, menu_id)` 多对多 | `PUT /api/roles/{id}/menus` 全量覆盖;前端勾选子节点会连带父目录 |
| 用户 → 部门 | `sys_user.department_id` | 部门下有用户时不能删 |
| 部门 → 负责人 | `sys_department.leader_id → sys_user.id` | 可空 |
| 部门 / 菜单 树 | `parent_id`(0 = 根) | 不能挂到自己或后代下(`40901`) |
| 字典 → 字典项 | `sys_dict_item.dict_id` | 删字典级联删字典项;`(dict_id, value)` 唯一 |
| 日志 → 用户 | `sys_login_log.user_id` / `sys_operation_log.user_id` | 快照 `username`,用户删除后日志仍可读 |

## 3. 跨模块业务口径问题

暂无。

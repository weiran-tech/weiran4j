# E5: 前端（AdminLayout + 三个业务页面）

## 完成的 tasks.md 条目

- 5.1、5.2、5.3、5.4、5.5、5.6

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `web/src/lib/role.ts`、`account.ts`、`ban.ts` | 新增 | 三个业务模块的 API 客户端封装，与 `lib/auth.ts` 同风格，字段与后端 View/Command record 对齐 |
| `web/src/layouts/AdminLayout.tsx` | 新增 | 后台布局壳子（Semi `Layout`+`Nav`+顶部栏），菜单按权限点过滤 |
| `web/src/pages/role/RoleListPage.tsx` | 新增 | 角色管理页面（列表/新增/编辑/删除/权限树分配） |
| `web/src/pages/account/AccountListPage.tsx`、`LoginLogPage.tsx` | 新增 | 账号管理页面（列表/新增/编辑/启禁用/重置密码）+ 登录日志只读页面 |
| `web/src/pages/ban/BanListPage.tsx` | 新增 | 封禁管理页面（列表/新增/编辑/删除） |
| `web/src/App.tsx` | 改造 | 接入 `AdminLayout` 为父路由，新增五条嵌套子路由 |

## 为什么这么做

- 关键决策（必要连带发现）：`AdminLayout` 最初想用 `@douyinfe/semi-icons` 给菜单项加图标，检查后发现该包**未安装**——`@douyinfe/semi-ui` 是独立包，只导出通用 `Icon` 组件，不含具体图标集。为不引入新依赖（design.md「Dependencies」写"无需新增依赖"），改为纯文字菜单，不装 `semi-icons`。
- 关键决策：角色/账号/封禁三个页面各自独立实现列表+表单弹层，不抽通用 `<CrudTable>`/`<CrudFormModal>` 组件——design.md「前端设计」已明确这个决定（先观察出稳定模式，避免过早抽象），本单元严格执行。
- 考虑过但放弃的方案：`RoleListPage` 的分配权限弹层最初想直接复用 `RoleDetailView` 里的 `permissionIds` 作为 `Tree` 的 `checkedKeys`，但涉及选中状态的本地编辑（用户勾选后未提交），因此加了 `selected` 状态做本地暂存，提交后才调用 `assignRolePermissions`。
- `web/src/lib/*.ts` 的分页/请求参数类型（`RoleQuery`/`AccountQuery`/`BanQuery` 等）把可选字段显式标注为 `?: string | undefined` 而非 `?: string`——这是配合项目 `tsconfig.json` 的 `exactOptionalPropertyTypes: true` 严格模式必须做的调整，否则调用方传入字面量 `undefined`（如未填写的表单字段）会在类型检查阶段报错。

## 依赖的契约

- design.md「API Design」表的 18 个端点路径与字段（除 E4 单元修正的两处 DELETE→POST 外，均照抄）。
- `hasPermission()`/`RequireAuth`（既有代码，直接复用，未改动）。

## 越界申报

无越界。菜单不带图标是"减法"（少做了 design.md 未强制要求的视觉细节），不是对既有文件的越界修改。

## 埋的坑 / 遗留

- [ ] 前端未写自动化测试（覆盖 tasks.md 6.3/6.4 是 E6 单元的职责，本单元只做了手工的 `tsc --noEmit` + `eslint` 静态检查，未跑 `pnpm test` 也未做浏览器实测）。
- [ ] `AdminLayout` 的菜单选中态用 `location.pathname` 精确匹配 `itemKey`，`/accounts/:id/login-logs` 这类子路径导航到登录日志页面时，账号管理菜单项不会保持高亮（因为路径不完全匹配 `/accounts`）——这是已知的体验瑕疵，不影响功能正确性，未在本次修复（design.md 未对此提出要求）。
- [ ] 前端目前没有为 Semi `Form`/`Table`/`Modal` 组合使用做过运行时（浏览器）验证，只验证了类型检查和 lint，`exec/verify.md` 阶段需要补充这部分。

## 自测结果

- 命令：`npx tsc --noEmit -p tsconfig.json`
- 结果：无错误
- 命令：`npx eslint src`
- 结果：无错误无警告

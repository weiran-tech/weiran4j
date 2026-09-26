# components.md —— 前端公共组件清单(先查再造)

> **写 `web/` 的页面或组件前先查这里**:查到就复用,查不到才造。
> 漏登记的直接后果是下一个人查不到它、把它重造一遍。
>
> **新增未登记会被拦**:`openspec/guards/components-registry.mjs`(`REPO/components-unregistered`)
> 扫描 `web/src/components/` 与 `web/src/layouts/`,文件名没在本文件正文里出现就报错。
> 它只查「名字在不在」,**不查描述对不对** —— 删除组件或改了对外协议后,回来改对应条目是写的人的事。
>
> 确实不该进清单的文件(纯内部实现),加进 `openspec/project.json` 的 `componentsRegistry.exempt` 并写理由。

## 页面骨架

| 组件 | 位置 | 什么时候用 | 坑 |
| --- | --- | --- | --- |
| **PageContainer** | `components/PageContainer.tsx` | 每个管理页最外层:统一卡片、内边距与标题行(`title` / `extra`) | — |
| **SearchToolbar** | `components/SearchToolbar.tsx` | 列表页顶部:左侧放筛选控件(`children`),自带「查询 / 重置」,右侧放新增等按钮(`actions`) | 筛选值由页面自己持有;`onReset` 要页面自己把筛选状态与分页一起清回初值 |
| **AppLogo** | `components/AppLogo.tsx` | 应用标志:取 `config.appTitle` 首字母的方块徽标,`size` 定尺寸;`variant="solid"`(主色渐变,默认)/ `"glass"`(放在主色底上的磨砂,登录页品牌栏用) | 颜色全部来自 `--semi-color-primary*`,随主题色变;仓库没有图片素材,需要换成真实 logo 时改这一个文件 |

## 权限

| 组件 | 位置 | 什么时候用 | 坑 |
| --- | --- | --- | --- |
| **Permission** | `components/Permission.tsx` | 按钮级权限:`<Permission code="system:user:create">…</Permission>`;`code` 传数组时满足任一即可,`fallback` 默认不渲染 | 只控制**显示**,真正的拦截在后端 `@RequiresPermission`。需要在逻辑里判断时用 `hooks/usePermission` 的 `hasPermission()`;`permissions` 含 `"*"`(超管)视为全部 |

## 字典与状态

| 组件 | 位置 | 什么时候用 | 坑 |
| --- | --- | --- | --- |
| **DictSelect** | `components/DictSelect.tsx` | 按字典编码出下拉(如性别 `sys_user_gender`),数据来自 `GET /api/dicts/code/{code}/items`,带 TanStack Query 缓存 | 只返回 `enabled` 的字典项;被禁用的旧值在下拉里选不到,但 `DictTag` 仍能显示原值 |
| **DictTag** | `components/DictTag.tsx` | 列表里按字典项渲染带颜色的标签 | 字典未加载或没有该值时显示**原始值**而不是空 |
| **StatusTag** | `components/StatusTag.tsx` | 通用状态标签:`enabled/disabled`、`success/fail`,或布尔成功与否;同文件导出 `STATUS_OPTIONS` 供筛选下拉 | 不走字典;新增状态值要改这个文件的映射表 |

## 选择器

| 组件 | 位置 | 什么时候用 | 坑 |
| --- | --- | --- | --- |
| **DepartmentTreeSelect** | `components/DepartmentTreeSelect.tsx` | 筛选栏的部门树下拉;表单里用同文件导出的 `useDepartmentTreeData(disabledIds)` 喂给 `Form.TreeSelect` | 编辑部门时把「自己 + 后代」传进 `disabledIds`,否则前端能选、后端返回 `40901` |
| **IconPicker** | `components/IconPicker.tsx` | 菜单图标选择:弹层网格 + 搜索,可配合 Semi `withField` 当表单项 | 只含 `utils/icons.tsx` 白名单里的 lucide 图标;新图标先加进 `MENU_ICONS` |

## 布局(`web/src/layouts/`)

| 组件 | 位置 | 是什么 | 坑 |
| --- | --- | --- | --- |
| **AdminLayout** | `layouts/AdminLayout.tsx` + `AdminLayout.css` | 后台外壳(只有 vertical 布局,移植自 mono4ts 的「飞书风格」):侧边菜单(由 `/api/auth/menus` 的菜单树经 `toNavItems()` 生成,可折叠,折叠状态存 `localStorage.weiran_sider_collapsed`)、顶栏(面包屑 + 主题按钮 + 用户下拉)、多页签、内容区。**< md(768px)时不渲染侧边栏**,改为移动端顶栏的菜单按钮 + 左侧 `SideSheet` 抽屉导航 | **菜单图标必须用 `renderNavIcon()`,不能用 `renderIcon()`**:Semi 的 `SubNav` 会 `cloneElement(icon, { size: 'large' })`,lucide 会渲染成 `width="large"` 的无尺寸 SVG,目录图标撑满侧边栏(2026-09-26 实测,单测看不出来)。样式大量覆盖 Semi Nav 内部类名(`.semi-navigation-*`),升级 Semi 后要在真浏览器里看一眼侧边栏与折叠态 |
| **TabsBar** | `layouts/TabsBar.tsx` | 多页签栏(下划线风格):点击切换、× 关闭、右键「关闭 / 关闭其它 / 关闭全部」,右侧下拉列出全部页签 | 纯展示组件,状态在 `useTabs`;不支持拖拽排序与卡片/胶囊风格(刻意没搬) |
| **ThemeSwitcher** | `layouts/ThemeSwitcher.tsx` | 顶栏主题入口:`ThemeModeButton`(点击按 浅色 → 深色 → 跟随系统 循环,悬停出下拉)、`ThemeColorButton`(弹层色板:默认 `#0064FA` + 19 个预设 + 原生取色器自定义任意 hex);`ThemeColorPanel` 是弹层内容本身 | 必须在 `ThemeProvider` 内(`useThemeController` 在外面直接抛错);测试用 `renderWithProviders` 已自带 |
| **useTabs** | `layouts/useTabs.ts` | 页签状态:按访问顺序累积,刷新后从 `sessionStorage` 恢复 | 菜单的 `keepAlive` 字段**尚未接入**:切换页签时页面会重新挂载(见 `state/bizs/sys_menu.md`) |

## 不在本清单、但同样该先查的

- `providers/ThemeProvider.tsx` + `providers/theme-context.ts`(`useThemeController()`):主题状态源,明暗模式 `light / dark / system` + 主色;偏好存 `localStorage.weiran_theme`(`{mode, color}`,读写都容错,非法字段逐项回落默认 `light` + `default`)。暗色走 Semi 官方入口 `body[theme-mode='dark']`,不要另起一套 class。首屏由 `main.tsx` 在挂载前调 `lib/theme.ts` 的 `bootstrapTheme()` 同步应用。
- `lib/theme-color.ts`:`applyThemeColor()` 把 `--semi-color-primary*` 与 `--color-primary` / `--color-sidebar-*` **同时写到 html 和 body 的内联样式**——只写 html 会被 Semi 挂在 body 上的默认值盖住。**页面里要用主色就用 `var(--semi-color-primary)`,不要写死 `#0064FA`**,否则切主题色时不跟随。
- `styles/global.css` 的设计变量(`--color-bg` / `--color-surface` / `--color-border` / `--color-text*` / `--header-height` 等)在 `body[theme-mode='dark']` 下有深色值;新样式优先用它们或 Semi 变量,别写死颜色。
- `hooks/useMediaQuery.ts`:`useMediaQuery(query)` / `useIsMobile()`(< 768px)/ `usePrefersDark()`。断点常量在 `lib/breakpoints.ts`,CSS 侧写 `@media (--md-down)`(`styles/breakpoints.css` 经 postcss-custom-media 注入所有 CSS,**不要硬编码 px 断点**,两边改一处必须同步另一处)。jsdom 的 `matchMedia` 恒为 false,测试里默认是桌面布局;测窄屏用 `vi.stubGlobal('matchMedia', …)`。
- `utils/request.ts`:请求封装。**`code === 0`(数字)才算成功**;`40100` 清令牌跳登录,`40101` 不清。不要在页面里再写 `fetch`。
- `utils/page-registry.ts`:菜单 `component` 字符串 → 页面懒加载。**路由不在 `App.tsx` 里登记**。
- `hooks/queries/*`:每个资源一份 TanStack Query hooks,新接口先在这里加,再在页面里用。

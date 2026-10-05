# components.md —— 前端公共组件清单(先查再造)

> **写 `web/` 的页面或组件前先查这里**:查到就复用,查不到才造。
> 漏登记的直接后果是下一个人查不到它、把它重造一遍。
>
> **新增未登记会被拦**:`openspec/guards/components-registry.mjs`(`REPO/components-unregistered`)
> 扫描 `web/src/components/` 与 `web/src/layouts/`,文件名没在本文件正文里出现就报错。
> 它只查「名字在不在」,**不查描述对不对** —— 删除组件或改了对外协议后,回来改对应条目是写的人的事。
>
> 确实不该进清单的文件(纯内部实现),加进 `openspec/project.json` 的 `componentsRegistry.exempt` 并写理由。
>
> **fork 下游不改本文件**(D-012):自己的组件写进同目录的 `components.biz.md`(上游永不创建),
> 守卫把两份清单一并当作登记来源（`components.biz.md` 本身登记在下游 `AGENTS.biz.md` 的规则索引表）。查「有没有现成的」时两份都要看。

## 页面骨架

| 组件 | 位置 | 什么时候用 | 坑 |
| --- | --- | --- | --- |
| **PageContainer** | `components/PageContainer.tsx` | 每个管理页最外层:统一卡片、内边距与标题行(`title` / `extra`) | — |
| **SearchToolbar** | `components/SearchToolbar.tsx` | 列表页顶部(布局与约定见设计稿 `wuli-design/testing.pen` 的「用户列表」):左侧放常用筛选控件(`children`),自带「查询 / 重置」,右侧放新增等按钮(`actions`)与工具按钮(`tools`)。可选:`leading` 放在筛选控件**之前**的主操作(如「新增用户」);`onRefresh` / `refreshing` 在工具区最末加「刷新」;`treeExpand={{ expanded, onToggle }}` 在工具区最前加「展开树状」开关(树形表格用,部门 / 菜单);`advanced` 高级筛选面板的字段(每项用同文件的 `SearchField label=…` 包一层,4 列栅格)——提供后查询按钮只留图标、不显示「重置」,其右侧出现「高级筛选」开关(**默认收起**),面板底部「搜索 / 重置」(操作行在字段区外且吸底,永远可点;窄屏字段区限高两行、可滚动,由「展开 / 收起」箭头切换),且**窄屏(< 992px)隐藏工具栏里的便捷搜索**(`children` 与图标查询按钮一起包在 `display: contents` 的 `.search-toolbar__quick` 里,窄屏只剩主操作与高级筛选开关);`conditions` 已生效的查询条件,在工具栏下方渲染成「已选条件」胶囊标签(`label：value` + ×),有条件就带「清空」(= `onReset`) | 设计稿约定:①「新增」右侧的「…」更多按钮**只在有多个主操作时**出现;② 右侧工具按钮按需出现,顺序固定为 展开树状 / 列设置 / 导出 / 刷新(没有的跳过,如用户页只有列设置、刷新)。筛选值由页面自己持有;`onReset` 要页面自己把筛选状态与分页一起清回初值。高级面板与工具栏的同名条件要绑定**同一份草稿**。**面板只放后端查询接口已支持的条件**——放了不生效的控件是静默错误(后端对未声明的查询参数静默忽略,不报错)。用户页的高级筛选是**单字段查询**(契约 §6.2:用户名 / 用户 ID / 手机号 / 邮箱精确、角色、性别、两个按天的时间范围,由 `user-advanced-filter` 补齐),按天的时间范围用 `utils/date.ts` 的 `toDayRange()` 补成 `00:00:00` / `23:59:59`,不要用 `toTimeRange()`(日期时间选择器用,原样格式化)。`conditions` 从**已生效**的筛选生成,不是草稿;下拉类条件的 `value` 给选项名称;每个 `onRemove` 由页面清掉该字段(草稿一并清)并回到第 1 页。标签的 × 是带 `aria-label="移除条件 <label>：<value>"` 的 button(不用 Semi Tag 的 closable,其关闭图标不可聚焦)。高级开关的样式要压过 Semi `.semi-button-primary.semi-button-light`,改样式时注意优先级。用户管理接入了全部可选能力;其余列表页按 `list-view.md` 接入 `leading` / `conditions` / `onRefresh` / `treeExpand`(没有高级筛选,便捷搜索不隐藏) |
| **ColumnSettings** | `components/ColumnSettings.tsx` + `ColumnSettings.css` | 列表的列设置(偏好 `showTableColumnSettings`):**用同文件的 `useColumnSettings(tableKey, columns)`**,返回 `{ columns, columnSettings }`,前者交给 `<Table>`,后者放进 `SearchToolbar` 的 `tools`。齿轮按钮 → 弹层里勾选显隐、**拖放**排序(每行左侧的把手;把手可聚焦,↑ / ↓ 同样移动,纯函数 `reorderKeys()` 可单测)、恢复默认,至少保留一列;不提供上移 / 下移按钮;按 `tableKey` 存 `localStorage['weiran_table_columns:<tableKey>']`。纯函数 `applyColumnState()` 可单测 | 列靠 `dataIndex`(其次 `key`)识别,**没有的列不参与**;固定列(`fixed`)与 `dataIndex: 'actions'` 的操作列不参与、保持原位。偏好关掉时列恢复代码默认,但保存的设置保留。7 个列表页已接入(用户/角色/菜单/部门/配置/登录日志/操作日志;字典页左侧改成了 `NavListPanel`,不再是表格),新列表页照做 |
| **TableActions** | `components/TableActions.tsx` | 表格操作列内容:`actions` 为 `{key, label, onClick, danger?, disabled?, confirm?, permission?}[]`,平铺成文字按钮;`compact` 时收成一个「…」图标按钮(无文字,aria-label「更多操作」)+ 下拉菜单。`useCompactActions()`:视口 < 992px(`mediaDown('lg')`,与 `SearchToolbar` 隐藏便捷搜索同一断点)即收起;`COMPACT_ACTIONS_WIDTH`(52)为收起后的列宽。**列表页直接用 `useActionsColumn(columns, actionsOf)`**:传入列设置之后的列与「每行 → 操作数组」函数,返回 `{ columns, compact }`,内部替换操作列的宽度与渲染。已接入:用户、角色、部门、菜单、参数配置、字典项(操作日志只有一个「详情」,不收) | 收起时机按**视口断点**而不是表格容器宽度:992px 以上表格放不下时操作列仍平铺(固定在右侧、横向滚动),这是有意的取舍;`confirm` 平铺时是 Popconfirm、收进菜单后改用 Modal.confirm(菜单关闭后 Popconfirm 没有锚点);`permission` 过滤后全空则不渲染。jsdom 的 `matchMedia` 默认不匹配,单测里恒为平铺,收起要在真浏览器或 stub `matchMedia` 验。约定见 `list-view.md` |
| **NavListPanel** | `components/NavListPanel.tsx` + `NavListPanel.css` | 主从页左侧的导航列表面板(移植自 mono4ts,字典页在用):标题栏(`title` + `headerExtra`,一般放「…」下拉)+ 固定的搜索框(`search`)+ 可滚动条目 + 固定的底部分页(`footer`),`dataSource` + `renderItem` 渲染;条目用同文件的 `NavListItem`:`primary` · `secondary` 一行、`meta` 第二行(时间 / 小标签),选中与悬停有底色,`extra` 操作区只在悬停 / 选中 / 聚焦时显示 | **面板占满父容器高度,父容器必须给定高度或 `max-height` 条目区才会在内部滚动**(字典页是 `.dicts-layout__master`:sticky + 按视口算的 max-height)。`extra` 区的点击(含 Dropdown 弹出菜单里的点击——portal 里的 React 事件仍沿组件树冒泡)已在组件内拦下,不会触发条目 `onClick`。Semi `List.Item` 只接受固定几个属性,不能透传 `aria-*`,测试靠 `nav-list-item--active` class 判断选中 |
| **AppLogo** | `components/AppLogo.tsx` | 应用标志:取 `config.appTitle` 首字母的方块徽标,`size` 定尺寸;`variant="solid"`(主色渐变,默认)/ `"glass"`(放在主色底上的磨砂,登录页品牌栏用) | 颜色全部来自 `--semi-color-primary*`,随主题色变;仓库没有图片素材,需要换成真实 logo 时改这一个文件 |

## 反馈与遮罩

| 组件 | 位置 | 什么时候用 | 坑 |
| --- | --- | --- | --- |
| **LockScreen** | `components/LockScreen.tsx` + `LockScreen.css` | 全屏锁屏遮罩(偏好 `enableLockScreen`,由 AdminLayout 在锁定时渲染):时钟 + 头像 + 密码框,调 `POST /api/auth/verify-password` 解锁,「重新登录」退出。锁定状态在 `hooks/useLockScreen.ts`(`lockScreen()` / `unlockScreen()` / `useIsLocked()`,存 `sessionStorage.weiran_locked`,刷新后仍锁定;登录、`clearSession` 时自动解除) | 用**登录密码**解锁,不像 mono4ts 另设本地锁屏密码。错误码 40101 在遮罩内提示「密码错误」,**不会**清令牌——依赖 `utils/request.ts` 对 40101 不走会话失效分支,改那里要回来看这里。回车在 `keydown` 提交,**不用 Semi Input 的 `onEnterPress`**(它挂在已废弃的 `keypress` 上,CDP 注入按键时不一定派发)。遮罩经 portal 挂在 body 下自己的容器里,锁定期间把 **body 其它子节点全部设 `inert`**(布局 + Semi 挂到 body 上的 Modal/SideSheet/Popover 浮层),解锁恢复;遮罩内另有 Tab 焦点陷阱。锁定后才出现的 body 子节点(Toast)不会被 inert |

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
| **AdminLayout** | `layouts/AdminLayout.tsx` + `AdminLayout.css` | 后台外壳(移植自 mono4ts 的「飞书风格」)。导航布局按偏好 `navLayout`:**vertical** 侧边菜单 + 顶栏面包屑;**horizontal** 顶部水平导航(`TopNav`),无侧边栏、无面包屑;**mixed** 顶部一级菜单 + 左侧当前一级下的子菜单(一级是页面时无侧边栏),无面包屑;**double** 左侧图标轨 + 子菜单栏 + 顶栏面包屑。菜单由 `/api/auth/menus` 的菜单树经 `toNavItems()` 生成;折叠状态存 `localStorage.weiran_sider_collapsed`(vertical / mixed);展开项受控,手风琴逻辑在同文件导出的 `nextOpenKeys()`。顶栏 / 顶部导航的操作区:全局搜索(`GlobalSearch`)、收藏入口、锁屏、全屏、主题、用户下拉(个人中心 / 偏好设置 / 退出登录)。内容区走 `KeepAliveOutlet`(页面缓存 + 路由动画)与回到顶部;锁定时渲染 `LockScreen`。外观与行为大多读偏好(见下「偏好」),偏好类样式挂在根节点的 `admin-layout--*` class(含 `admin-layout--nav-<布局>`)与行内 `--sidebar-width` / `--admin-section-dark-*` 变量上。**< md(768px)时任何布局都不渲染侧边栏 / 顶部导航**,改为移动端顶栏的菜单按钮 + 左侧 `SideSheet` 抽屉导航 | **任何交给 Semi 组件图标属性的 lucide 图标都必须用 `renderNavIcon(name, size?)`,不能用 `renderIcon()`**:Semi 的 `SubNav` 会 `cloneElement(icon, { size: 'large' })`、`Breadcrumb.Item` 会 `cloneElement(icon, { size: 'default' / 'small', className })`,lucide 会渲染成 `width="large"` 之类的无尺寸 SVG 撑满容器——侧边栏目录图标(2026-09-26)与顶栏面包屑图标(2026-09-27,默认配置就中招)都实测踩过。已查过:Button / Toast / Modal 只 clone Semi 自家图标,不受影响;放进自己的 `<span>` 里的图标(页签、收藏、搜索结果)也不受影响。四种布局(含 double 的图标轨、mixed 的顶部一级)都复用 `toNavItems()` 的图标。样式大量覆盖 Semi Nav 内部类名(`.semi-navigation-*`,含水平模式),升级 Semi 后要在真浏览器里把四种布局与折叠态都看一眼。mixed / double 点一级目录跳到它的**第一个内链页面**(`firstLeafKey()`),目录下全是外链时只切换不跳转 |
| **TopNav** | `layouts/TopNav.tsx` | horizontal / mixed 布局的顶部水平导航(移植自 mono4ts `TopNavWithOverflow`):Semi `Nav mode="horizontal"`,放不下的项收进末尾「更多」下拉 | 宽度靠一个隐藏的探测 Nav 量(同 class,`aria-hidden` + `inert`,不进 Tab 顺序),所以 DOM 里每个菜单文字出现**两次**——测试用 `getByRole('menuitem')` 而不是 `getByText`。量不到宽度(jsdom)时全部显示 |
| **GlobalSearch** | `layouts/GlobalSearch.tsx` | 全局搜索(偏好 `showMenuSearch`,移植自 zenith-admin):顶栏操作区的触发按钮(< 992px 退化为图标)+ Ctrl/⌘+K 打开的命令面板(Semi `Modal`)。空关键字列最近访问(`useRecentMenus()`,localStorage `weiran_recent_menus`,最多 10 条,可单条移除 / 清除);输入后按标题 / 祖先目录过滤可见菜单页(`filterMenus()`,标题相等 > 前缀 > 包含 > 只命中目录),↑↓ 选择、回车或点击跳转、Esc 关闭 | 只搜菜单:本项目没有业务数据搜索接口,也不支持拼音。快捷键由触发器组件注册,偏好关掉后 Ctrl+K 一并失效。Modal 关了 `motion`,测试里关闭后 DOM 立即移除。侧边栏已没有搜索框 |
| **FavoriteMenus** | `layouts/FavoriteMenus.tsx` | 收藏菜单(偏好 `showFavorites`):`useFavorites(pages, enabled)` + 面包屑旁的星标 `FavoriteToggle` + 顶栏「我的收藏」`FavoritesButton`(弹层列表,点击跳转、× 移除)。horizontal / mixed 没有面包屑,星标放进操作区 | 数据走 `hooks/queries/auth.ts` 的 `useFavoriteMenus` / `useSaveFavoriteMenus`:**乐观更新,失败回滚到修改前**并 Toast;同一 `scope` 串行发出(全量覆盖,乱序会让旧列表盖掉新列表),有后续保存排队时前一次失败不回滚、最后一次结束才重新拉取。**收藏列表加载成功前不显示星标与入口、toggle 直接跳过**——否则全量 PUT 会用单个 id 冲掉服务端已有收藏。上限 50(契约 §6.1),满了 Toast 拒绝而不是挤掉旧的 |
| **BreadcrumbMenuPopover** | `layouts/BreadcrumbMenuPopover.tsx` | 面包屑目录节点悬停弹出子菜单(偏好 `breadcrumbSubMenu`,移植自 mono4ts),多级目录逐级向右展开,点叶子跳转并收起整棵弹层 | 包在 `Breadcrumb.Item` 的**子节点**里,不能包在 Item 外面(Semi Breadcrumb 会 cloneElement 直接子节点并警告非 Item)。子节点过滤用同文件的 `visibleMenuChildren()` |
| **KeepAliveOutlet** | `layouts/KeepAliveOutlet.tsx` | 内容区的 `<Outlet>` 替身:页面缓存(偏好 `enablePageCache` 且启用多页签)+ 路由动画(偏好 `routeAnimation`)。菜单 `keepAlive=true` 的页面用 React 19 `<Activity>` 隐藏保活,关页签即释放,最多 10 个 LRU;页签「刷新」靠版本号重建;共享滚动容器 `.admin-content` 的滚动位置按页保存 / 恢复。纯函数 `nextCache()` 可单测 | 隐藏的缓存页 Effects 会被卸载(定时器、订阅暂停),**state 与 TanStack Query 缓存都还在**。缓存页不播路由动画(否则 remount 丢缓存)。每个页面外包一层 `div.admin-page`(缓存页再加 `--cached`),`contentWidth=fixed` 的 1400px 限宽作用在这层。滚动位置在 `scroll` 事件里按页记录、`useLayoutEffect` 里恢复(离开后再读会读到被钳成 0 的值)。**隐藏的缓存页在路由变化时仍会重渲染,其中 `useLocation` / `useSearchParams` 拿到的是当前可见页的 URL**:Effects 已暂停所以不会写回,但渲染期直接读 search params 的逻辑会算出错值——缓存页的筛选条件放在组件 state 里,别在渲染期依赖 URL |
| **TabsBar** | `layouts/TabsBar.tsx` | 多页签栏:点击切换、双击按偏好刷新/关闭、× 关闭、右键「刷新 / 关闭 / 关闭其它 / 关闭全部」,右侧下拉(偏好 `showTabSwitcher`)列出全部页签;页签图标由偏好 `showTabIcon` 控制。风格(偏好 `tabStyle`:line / pill / card)与动画(偏好 `tabAnimation`)挂在根节点 `data-tab-style` / `data-tab-animation` 上 | 纯展示组件,状态在 `useTabs`;「刷新」由 AdminLayout 给该路径的页面换版本号让它**重新挂载**(不主动失效 Query 缓存,30s 内的数据不会重拉)。`tabAnimation` 是**页签本身**的进出场(同 mono4ts),不是内容区过渡(那是 `routeAnimation`):进场是纯 CSS(节点插入即播),关闭单个页签先挂 `--exiting` 等 250ms 再真正关闭——测试断言关闭结果要 `waitFor`;到点时经 ref 调用**最新**的 `onClose`(期间页签与当前页可能已变),页签栏卸载时丢弃未执行的关闭。「关闭其它 / 全部」不播退场。不支持拖拽排序 |
| **ThemeSwitcher** | `layouts/ThemeSwitcher.tsx` | 顶栏主题快捷入口:`ThemeModeButton`(点击按 浅色 → 深色 → 跟随系统 循环,悬停出下拉)、`ThemeColorButton`(弹层色板:默认 `#0064FA` + 19 个预设 + 原生取色器自定义任意 hex);`ThemeColorPanel` 是色板本身(`embedded` 时去掉标题,偏好抽屉里用) | 必须在 `PreferencesProvider` + `ThemeProvider` 内(`useThemeController` 在外面直接抛错);测试用 `renderWithProviders` 已自带。默认蓝在偏好里存 `#0064FA` 而不是预设 key `default` |
| **useTabs** | `layouts/useTabs.ts` | 页签状态:按偏好 `openTabBehavior` 追加或插在当前页之后;超过 `tabsMaxCount` 按 `tabEvictPolicy`(fifo 最早打开 / lru 最久没激活)自动关闭并 Toast 提示;`keepTabs` 时存 `sessionStorage.weiran_tabs` 刷新后恢复。纯函数 `visitTab()` / `trimTabs()` 可单测 | 渲染期同步当前页,关闭当前页后靠 `closing` 挡住「navigate 还没生效就被加回来」(React Router 的 navigate 走 transition)。打开的页签集合同时是 `KeepAliveOutlet` 的缓存生命周期:页签被关掉(含超限淘汰)对应的缓存页随即释放 |
| **PreferencesDrawer** | `layouts/PreferencesDrawer.tsx` | 偏好设置抽屉(顶栏用户下拉菜单的「偏好设置」打开,同 zenith-admin;`SideSheet`):外观 / 布局与导航 / 页签 / 面包屑 / 表格 / 其它 六组,底部「恢复默认」二次确认。44 个字段里 43 个在这里(`filesViewMode` 没有消费方,不放) | **只放已经接通行为的字段**;新字段实现前不要放进来(不生效的开关)。开关行用 `aria-label` = 文案,测试按 `getByRole('switch', { name })` 找;下拉行(`SelectRow`)Semi Select 会**覆盖 `aria-label`**,改用 `aria-labelledby` 指向行文案,测试按 `getByRole('combobox', { name })` 找 |

## 不在本清单、但同样该先查的

- `providers/ThemeProvider.tsx` + `providers/theme-context.ts`(`useThemeController()`):主题控制器,明暗模式 `light / dark / system` + 主色。**状态存在偏好的 `colorMode` / `themeColor` 里**,必须在 `PreferencesProvider` 内。暗色走 Semi 官方入口 `body[theme-mode='dark']`,不要另起一套 class。首屏由 `main.tsx` 在挂载前调 `lib/preferences-storage.ts` 的 `bootstrapTheme()` 同步应用;旧版 `localStorage.weiran_theme` 在首次读取时迁进偏好并删除。
- `lib/theme-color.ts`:`applyThemeColor()` 把 `--semi-color-primary*` 与 `--color-primary` / `--color-sidebar-*` **同时写到 html 和 body 的内联样式**——只写 html 会被 Semi 挂在 body 上的默认值盖住。**页面里要用主色就用 `var(--semi-color-primary)`,不要写死 `#0064FA`**,否则切主题色时不跟随。
- `styles/global.css` 的设计变量(`--color-bg` / `--color-surface` / `--color-border` / `--color-text*` / `--header-height` 等)在 `body[theme-mode='dark']` 下有深色值;新样式优先用它们或 Semi 变量,别写死颜色。
- `hooks/useTableDefaults.ts` 的 `tableScrollX(columns, flexMin = 120)`:表格 `scroll.x` **用它算,不要手写估值**——数字 width 列按 width、弹性列按 `flexMin` 求和。Semi 在内容区更宽时把表格拉满(多出的宽度主要给弹性列),更窄才横向滚动。手写值写小了弹性列被挤到几十像素(用户页「角色」标签溢出到「手机」列),写大了 double 布局下无谓滚动、固定操作列压住内容(2026-09-27 实测)。传列设置之后的列。8 个列表页的列宽已按「1440 宽下四种导航布局都不滚动」收紧,改列宽后在 double 布局下看一眼。
- `hooks/useTableDefaults.ts`:`useTableDefaults()` 返回 `tableProps`(展开到 Semi `<Table>`:尺寸、边框、斑马纹 class)、`pageSize`(分页表格 `useState` 的**初值**)、`pageSizeOpts`。**新列表页的 `<Table>` 都要 `{...tableProps}`**,否则偏好里的表格设置对它不生效。
- `hooks/useMediaQuery.ts`:`useMediaQuery(query)` / `useIsMobile()`(< 768px)/ `usePrefersDark()`。断点常量在 `lib/breakpoints.ts`,CSS 侧写 `@media (--md-down)`(`styles/breakpoints.css` 经 postcss-custom-media 注入所有 CSS,**不要硬编码 px 断点**,两边改一处必须同步另一处)。jsdom 的 `matchMedia` 恒为 false,测试里默认是桌面布局;测窄屏用 `vi.stubGlobal('matchMedia', …)`。
- `utils/request.ts`:请求封装。**`code === 0`(数字)才算成功**;`40100` 清令牌跳登录,`40101` 不清。不要在页面里再写 `fetch`。
- `utils/page-registry.ts`:菜单 `component` 字符串 → 页面懒加载。**路由不在 `App.tsx` 里登记**。
- `hooks/queries/*`:每个资源一份 TanStack Query hooks,新接口先在这里加,再在页面里用。收藏菜单与锁屏校验在 `hooks/queries/auth.ts`(`useFavoriteMenus` / `useSaveFavoriteMenus` / `useVerifyPassword`)。
- `utils/menu.ts` 的 `flattenMenuPages()`:菜单树 → 可跳转的菜单页平铺列表(带祖先标题、可见性、keepAlive),全局搜索、收藏、页面缓存白名单共用。

## 偏好(`hooks/usePreferences.tsx` + `hooks/PreferencesProvider.tsx`)

- **字段定义与默认值的唯一事实源**是 `hooks/usePreferences.tsx`(44 个,43 个来自 mono4ts、`doubleRailStyle` 来自 zenith-admin;后端 `/api/auth/preferences` 只存不校验)。读用 `usePreferences().preferences`,写用 `setPreferences(partial)`;Provider 外调用直接抛错。
- `PreferencesProvider`:本地缓存 `localStorage.weiran_preferences`(读写容错,非法字段逐项回落默认),归属用户记在 `weiran_preferences_owner`(用户 id,取自 `weiran_csrf` Cookie 的前缀,`utils/session.ts` 的 `sessionUserId()`;该 Cookie 不是凭据,令牌本身在 HttpOnly Cookie 里,页面读不到);登录后 GET 服务端偏好合并覆盖本地,服务端为 `null` 时**只有本地缓存归属 = 当前用户才迁上去**;修改 500ms 防抖 PUT;「恢复默认」清本地并立即 PUT;**未登录(登录页)只写本地、不发请求**。
- 除 `filesViewMode` 外 42 个字段都已接通行为并在抽屉里(2026-09-27 第二阶段补齐 C 组:导航布局、页签风格 / 动画、路由动画、页面缓存、菜单搜索(现为全局搜索)、收藏、锁屏、列设置、面包屑子菜单、分组标题吸顶)。各字段的消费处见上面布局表与 `ColumnSettings` / `LockScreen` 条目。
- 坑:**`filesViewMode` 预留给文件模块,当前无消费方**——本项目没有文件模块,它只有类型与默认值,不在抽屉里。将来加文件模块时再接通并放进抽屉。
- 坑:`tabAnimation` 与 `routeAnimation` 是两件事(同 mono4ts):前者是页签条目的进出场,后者是内容区进场;开启页面缓存的页面不播路由动画。
- **换账号不继承**(2026-09-27 用户决定,**与 mono4ts 不同**):退出登录——主动退出、`clearSession`、401 清令牌、其它标签页退出,统一按「令牌从有到无」判断——时清掉本地偏好缓存与归属并回到默认值;新账号服务端为 `null` 时从默认值开始、**不 PUT**,绝不把上一个账号的偏好写进去。没有归属的缓存(旧版格式、登录页上改的、旧版 `weiran_theme` 迁入的)视为归属未知,不迁给任何账号。
- 坑:因此**退出后登录页回到默认浅色主题**(用户已知情的取舍);旧版 `weiran_theme` 只保证登录前首屏不闪,不会随登录带上服务端。
- 坑:测试里的令牌要用 `test/helpers` 的 `fakeJwt(userId)`,并用 `savePreferences(prefs, userId)` 预置本地偏好——用 `'t'` 这种非 JWT 令牌时拿不到用户 id,服务端返回 `null` 就会回落默认值。

### 新增偏好字段的步骤

1. `hooks/usePreferences.tsx`:`UserPreferences` 加字段(带中文注释)、`defaultPreferences` 给默认值;枚举型加进 `ENUM_OPTIONS`,数值型加进 `NUMBER_RANGES`——否则服务端 / 本地缓存里的脏值不会被拦下。字段数断言在 `hooks/__tests__/usePreferences.test.ts`,要同步改。
2. 在消费处读 `usePreferences().preferences.<field>` 接通行为(布局类放 `AdminLayout`,表格类放 `useTableDefaults`)。
3. **行为接通后**才在 `layouts/PreferencesDrawer.tsx` 对应分组加控件(布尔用 `<SwitchRow field=… />`)。
4. 至少一条测试证明它真的生效(布局类见 `layouts/__tests__/AdminLayout.test.tsx` 的 `renderAuthed(route, prefs)`)。
5. 契约 `weiran4j/docs/01-架构与接口契约.md` §6.1 的字段数若有写死,一并改。后端不需要改。

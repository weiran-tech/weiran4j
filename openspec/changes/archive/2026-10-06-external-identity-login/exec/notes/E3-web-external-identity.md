# E3: 前端外部身份登录(登录页 / 个人中心 / 用户管理 / 锁屏 / 登出)

## 完成的 tasks.md 条目

- 5.1 类型与 hooks
- 5.2 登录页
- 5.3 个人中心
- 5.4 用户管理
- 5.5 锁屏与登出
- 5.6 组件登记
- 7.3 前端 vitest

(按要求未勾 `tasks.md`)

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `web/src/types/api.ts` | 改造 | `CurrentUserView.hasPassword`;新增 `LogoutResult`、`ProviderType`、`ProviderView`、`ProvidersView`、`UserIdentityView`、`BindIdentityRequest` |
| `web/src/hooks/queries/identities.ts` | 新增 | `useProviders`(公开、静默、staleTime 10 分钟)、`useMyIdentities`、`useUnbindMyIdentity`、`useUserIdentities`、`useBindUserIdentity`、`useUnbindUserIdentity`(增删后 invalidate 对应 key);工具 `ssoAuthorizeUrl(id, {redirect, mode})`、`ssoErrorMessage(code)` |
| `web/src/hooks/useAuth.ts` | 改造 | `logout` 读 `ssoLogoutUrl`:先 `clearSession()`,非空再 `window.location.assign()`;接口失败照旧只清本地 |
| `web/src/pages/login/LoginPage.tsx` + `.css` | 改造 | 提供方按钮「使用 {name} 登录」→ `location.assign(ssoAuthorizeUrl(id, {redirect: safeRedirect(?redirect), mode: 'login'}))`;`passwordLoginEnabled=false` 时密码表单收起,「管理员应急登录」文字按钮展开;`ssoError` 提示进 Banner 后从 URL 清掉(保留 `redirect`);有提供方时副标题改「选择登录方式进入管理后台」并加「或使用账号密码」分隔线 |
| `web/src/components/ExternalAccountsCard.tsx` | 新增 | 个人中心「外部账号」卡片(见 components.md 条目) |
| `web/src/pages/profile/ProfilePage.tsx` | 改造 | 插入 `ExternalAccountsCard`;`hasPassword=false` 时修改密码区换成 Banner「未设置本地密码,可请管理员重置后再使用密码登录」 |
| `web/src/pages/system/users/UserIdentitiesModal.tsx` | 新增 | 管理员弹窗:列表 + 解绑(Popconfirm;只剩一个时提示「这是该用户唯一的外部身份,解绑后该用户可能无法登录」)+ 手工绑定表单(提供方下拉、外部用户标识必填、显示名可选) |
| `web/src/pages/system/users/UsersPage.tsx` | 改造 | 行操作「外部身份」(`permission: 'system:user:identity'`,走 `TableActions`,窄屏自动收进「…」);操作列显隐的权限集合加上该码;`ACTIONS_WIDTH` 176 → 248 |
| `web/src/components/LockScreen.tsx` + `.css` | 改造 | `user.hasPassword === false` 时不渲染密码框与「解锁」,只剩说明 + 「重新登录」(复用 `onReLogin`) |
| `web/src/test/helpers.tsx` | 改造 | 新增 `stubLocationAssign()` |
| `web/src/__tests__/App.test.tsx`、`layouts/__tests__/AdminLayout.test.tsx`、`layouts/__tests__/NavPreferences.test.tsx` | 改造 | 测试夹具 `me` 补 `hasPassword: true`(类型必填) |
| `web/src/pages/login/__tests__/LoginPage.test.tsx` | 改造 | 新增 10 个用例;两个旧用例的断言从「第一个 / 唯一一个请求」改成按路径找登录请求(登录页挂载时多了 `/providers` 请求,行为变化所致,不是放水) |
| `web/src/pages/profile/__tests__/ProfilePage.test.tsx`、`pages/system/users/__tests__/UserIdentitiesModal.test.tsx`、`components/__tests__/LockScreen.test.tsx`、`hooks/__tests__/useAuth.test.tsx`、`hooks/queries/__tests__/identities.test.ts` | 新增 | 见「自测结果」 |
| `openspec/rules/advisory/components.md` | 改造 | 新增「账号与外部身份」节登记 `ExternalAccountsCard`(顺带写 `UserIdentitiesModal`);`LockScreen` 条目补 `hasPassword` 分支;「不在本清单」的 hooks 一条补 `identities.ts` |

## 为什么这么做

- 关键决策:
  - **清 URL 参数用 react-router 的 `setSearchParams(next, { replace: true })`,没有直接调 `history.replaceState`**。BrowserRouter 下前者内部就是 `history.replaceState`,效果相同;直接调原生 API 会让路由器的 location 仍带着旧参数(replaceState 不触发 popstate),后续 `useSearchParams` 读到脏值,且 MemoryRouter 下无法测试。
  - 提示文案在挂载时用 `useState` 初始化读一次,再由 effect 清参数,所以清掉后提示仍在。外部登录 / 绑定回跳都是整页加载,挂载时读足够。
  - `useProviders` 静默且失败降级为 `{passwordLoginEnabled: true, providers: []}`:后端未升级或接口异常时登录页与接入前完全一致,不会把唯一的登录入口藏掉。代价:加载完成前若 `passwordLoginEnabled=false`,密码表单会先闪一下再收起。
  - `ssoErrorMessage` 额外收了 `40901`(「该外部账号已绑定其他用户」):契约里 bind 模式回调可能带 40901,个人中心要用;登录页不会遇到。
  - `ssoAuthorizeUrl` 对 provider id 也做了 `encodeURIComponent`(契约规定 id 只含小写字母、数字、横线,正常情况下不变)。
  - 管理员行操作用现有 `TableAction.permission`,与 `<Permission code="system:user:identity">` 等价(`TableActions` 内部同样按 `hasPermission` 过滤),这样窄屏自动收进「…」,不用另写一套。
- 考虑过但放弃的方案 + 放弃理由:
  - 为个人中心卡片和管理员弹窗抽一个共用的身份表格组件:两处列和确认文案不同,各十几行,抽出来反而多一层 props。
  - 「外部身份」放进一个额外的「更多」下拉以保住 1115 的列宽预算:与现有行操作写法不一致,且 list-view.md 约定 ≥ 992px 平铺。

## 依赖的契约

- `GET /api/auth/providers` → `{passwordLoginEnabled, providers: [{id, type, name}]}`(读全部键)
- `GET /api/auth/sso/{id}/authorize?redirect=&mode=login|bind`(只拼 URL,整页跳转)
- 回调结果:`/login?ssoError=<code>`、`/profile?bound=<id>`、`/profile?ssoError=<code>`
- `GET /api/auth/identities`、`DELETE /api/auth/identities/{id}`
- `GET/POST/DELETE /api/users/{id}/identities[/{identityId}]`,POST 体 `{provider, externalId, displayName?}`
- `/me.hasPassword`;`POST /api/auth/logout` 的 `data = {ssoLogoutUrl: string | null}`(也兼容 `data = null`,旧后端)
- 错误码 40102 / 40303 / 40301 / 40100 / 40901 的提示文案

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | 全部改动在 `web/src/**` 与 `openspec/rules/advisory/components.md`(所有权内) | — | — |

## 埋的坑 / 遗留

- [ ] **用户管理列宽预算被突破**:操作列 176 → 248 后列宽合计 1114 → 1186,1440 宽下双列(1115)与侧边 / 混合(1135)布局会出横向滚动(操作列固定在右侧),顶部菜单布局不受影响。宽度 248 是按「四字按钮约 68 + 间距 4」估算,**没在真浏览器量过**——L7/L8 真浏览器验证时请按 list-view.md 二.4 量一下操作列是否折行,并决定是否接受横向滚动(或压其它列)。
- [ ] 登录页在 `/providers` 返回前按「密码登录开启」渲染;`passwordLoginEnabled=false` 的部署首屏会闪一下密码表单。
- [ ] 个人中心的 `bound` / `ssoError` 在挂载时读;若 `/profile` 已被 KeepAlive 缓存且通过站内路由(非整页)跳到带参数的地址,不会提示(正常流程是整页回跳,不受影响)。
- [ ] 锁屏无密码分支没有自动聚焦「重新登录」按钮(原来聚焦密码框);Tab 焦点陷阱仍生效。
- [ ] 真实浏览器验证(Keycloak 全流程、登出跳 IdP)未做,属 design Test Plan 的「真实浏览器」一行。

## 自测结果

- 命令(仓库根):`pnpm --filter @weiran/web lint`、`pnpm --filter @weiran/web test`、`pnpm --filter @weiran/web build`、`node openspec/check.mjs`
- 结果:lint 无输出(通过);test 32 个文件 273 个用例全部通过;build 成功(只有既有的 rolldown「module level directive」警告);openspec check「全部通过」(components 登记检查含新组件)。
- 新增用例覆盖:登录页(无提供方与现状一致、按钮 → authorize URL 含 redirect 编码与 mode=login、非法 redirect 回落 `/`、`passwordLoginEnabled=false` 应急入口、5 种 ssoError 文案与清参数且保留 redirect、`/providers` 失败降级);个人中心(列表、只给未绑定提供方显示「绑定」、绑定 URL mode=bind、解绑 DELETE、`bound` / `ssoError` 提示与清参数、无提供方不显示卡片、`hasPassword` 两个分支);`UserIdentitiesModal`(只剩一个时的解绑提示与 DELETE、必填校验与 POST 体 trim);用户管理行操作的权限显隐;`LockScreen` 两个分支;`useAuth.logout` 三种情况;`ssoAuthorizeUrl` 编码与 `ssoErrorMessage`。

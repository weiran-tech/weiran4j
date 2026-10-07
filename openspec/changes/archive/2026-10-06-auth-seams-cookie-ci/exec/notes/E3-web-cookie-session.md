# E3: web-cookie-session

## 完成的 tasks.md 条目

- `5.1` `utils/token.ts` → `utils/session.ts`
- `5.2` `utils/request.ts`:Cookie 认证 + 双提交 CSRF
- `5.3` `useAuth` / `hooks/queries/auth.ts` / `PreferencesProvider` 改由会话驱动
- `5.4` `types/api.ts` 的 `LoginResult`
- `5.5` `vite.config.ts` 拒绝绝对地址的 `VITE_API_BASE_URL`,`config.ts` 注释同步
- `7.4` 前端测试(helper、`session.test.ts`、`request.test.ts`、`LoginPage`、`PreferencesProvider` 及其余受影响的测试)

(未勾选 tasks.md,由 orchestrator 勾。)

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `web/src/utils/session.ts` | 新增 | `CSRF_COOKIE` / `getSession` / `useSession` / `sessionUserId` / `clearSession` / `refreshSession`;订阅时监听 window `focus` 与 document `visibilitychange`(仅 visible 时)做跨标签同步 |
| `web/src/utils/token.ts` | 删除 | 被 session.ts 取代 |
| `web/src/utils/request.ts` | 改造 | 去掉 Bearer;`credentials: 'same-origin'`;非 GET 且有会话时加 `X-CSRF-Token`;失效分支 `if (session) clearSession()`;新增导出常量 `CODE_CSRF_REJECTED = 40302`、`CSRF_HEADER`(仅作文档与测试引用,逻辑上 40302 走普通业务错误分支);文件头注释更新 |
| `web/src/hooks/useAuth.ts` | 改造 | `login` 去掉 `setToken`,改 `refreshSession()`;返回值 `token` → `session`(全仓无调用方读 `.token`,无需连带改);内部 `clearSession` 调用 session 模块的 `clearSession`(import 别名 `clearSessionCookie` 避免与同名回调冲突) |
| `web/src/hooks/queries/auth.ts` | 改造 | query key 与 `enabled` 里的 token 换成 session |
| `web/src/hooks/PreferencesProvider.tsx` | 改造 | 归属用 `sessionUserId(session)`;`tokenRef`→`sessionRef`;注释措辞 |
| `web/src/types/api.ts` | 改造 | `LoginResult { accessToken?: string \| null; tokenType: string; expiresIn: number; userId: number }`;verify-password 注释措辞 |
| `web/vite.config.ts` | 改造 | `VITE_API_BASE_URL` 匹配 `/^https?:\/\//i` 时 throw(dev 与 build 都生效) |
| `web/src/config.ts` | 改造 | `apiBaseUrl` 注释写明只能是路径前缀 |
| `web/src/components/LockScreen.tsx`、`web/src/hooks/useLockScreen.ts` | 改注释 | 「令牌在 localStorage」「不清令牌」已过时,改成会话措辞 |
| `web/src/test/session.ts` | 新增 | `signIn(userId = 1, nonce = 'test')` 写 `weiran_csrf` Cookie 并 `refreshSession()`,返回会话值;`signOut()` |
| `web/src/test-setup.ts` | 改造 | afterEach 在 `cleanup()` 后 `signOut()`(jsdom 的 Cookie 在同一文件内跨用例保留) |
| `web/src/test/helpers.tsx` | 改造 | 删除 `fakeJwt` |
| `web/src/utils/__tests__/token.test.ts` → `session.test.ts` | 删除/新增 | 覆盖解析(无 Cookie、多 Cookie 含同前缀名、URL 编码、非法编码)、`sessionUserId`(合法、无点、非数字、`1e3`、0、负数)、`clearSession` 通知订阅者、`refreshSession`、focus / visibilitychange 重新读取 |
| `web/src/utils/__tests__/request.test.ts` | 改造 | PUT/POST/DELETE 带 `X-CSRF-Token` 且等于 Cookie;GET 不带;未登录写请求不带;任何请求不带 `Authorization`;`credentials: 'same-origin'`;40100 / 非 JSON 401 清会话;40101、40302 不清会话且 40302 Toast |
| `web/src/pages/login/__tests__/LoginPage.test.tsx` | 改造 | mock 登录响应 `{tokenType,expiresIn,userId}` 并在 handler 内模拟浏览器写 `weiran_csrf=1.x`;成功后 `getSession()==='1.x'`,失败为 null |
| `web/src/hooks/__tests__/PreferencesProvider.test.tsx` | 改造 | `setToken(fakeJwt(n))`→`signIn(n)`;「换账号」用例原来按 `Authorization` 头区分 A/B,改为按请求发出时的 `getSession()` 区分(等价于浏览器带哪个 Cookie) |
| `web/src/__tests__/App.test.tsx`、`hooks/queries/__tests__/favorites.test.tsx`、`layouts/__tests__/{AdminLayout,NavPreferences}.test.tsx` | 改造 | 机械替换为 `signIn` / `getSession`;favorites 的 query key 由 `'t'` 改为 `signIn()` 返回的会话值 |

## 为什么这么做

- 关键决策:
  - 「是否登录」以 `weiran_csrf` 的有无判定:它与 HttpOnly 令牌同时签发、同时清除,是 JS 唯一能看到的会话信号。
  - `getSnapshot` 直接返回字符串(按值比较),无需缓存对象即满足 `useSyncExternalStore` 的稳定性要求。
  - `visibilitychange` 只在变为 `visible` 时回调,避免切走时无意义的重读。
  - `sessionUserId` 用 `/^\d+$/` 校验点前部分,拒绝 `1e3`、`+1`、空串等 `Number()` 会接受的形式。
  - `getSession` 解析时精确比较 Cookie 名(`trim()` 后 `===`),避免 `weiran_csrf_x` 之类前缀误命中。
  - 测试里的 `act(() => signIn(2))` 会让 act 回调返回字符串,触发 `no-floating-promises`,改成块语句。
- 考虑过但放弃的方案 + 放弃理由:
  - 继续用 `storage` 事件跨标签同步:Cookie 变化不触发任何事件;轮询 `document.cookie` 成本与复杂度不值得,focus/visible 已覆盖「回到本页」的场景。
  - 在 `clearSession()` 里顺带调登出接口清 HttpOnly Cookie:会把纯本地 store 变成有副作用的网络调用,且 401 分支里再发请求会循环;登出接口仍由 `useAuth.logout` 调用。

## 依赖的契约

- plan §4:错误码 `CSRF_REJECTED(40302)`(不清会话、普通 Toast)
- plan §4:Cookie / 请求头名称 `weiran_csrf`、`X-CSRF-Token`(不使用 `X-Auth-Mode`)
- plan §4:Cookie 属性 —— 只读 `weiran_csrf` 的值 `<userId>.<随机串>`,清除写 `weiran_csrf=; Max-Age=0; Path=/`
- plan §4:`LoginResult` JSON(`accessToken` 为 null 或缺省都按「没有」处理,前端不读)
- plan §4:CSRF 校验口径 —— 所有非 GET 请求在有会话时带头

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | 只改了 `web/**`(本笔记除外) | — | — |

> 过程说明:中途误执行了一次 `git rm --cached web/src/utils/__tests__/token.test.ts`(把删除写进了暂存区),已立即 `git restore --staged` 撤销;`git diff --cached -- web` 为空(暂存区里另有一条后端 `SystemTokenAuthenticator.java` 的删除,不是 E3 所为)。

## 埋的坑 / 遗留

- [ ] `clearSession()` 只能删 `weiran_csrf`,HttpOnly 令牌 Cookie 只能靠服务端登出接口(或到期)清掉。登出接口调用失败时令牌 Cookie 会残留到过期,但前端已视为未登录,下一次登录会覆盖;**需要后端(E2)保证登出接口无论成功与否都下发清除两个 Cookie 的 Set-Cookie**。
- [ ] 改密 / 被管理员重置密码后前端走 `clearSession()`,残留的令牌 Cookie 已因 `token_version` 递增而失效,无害。
- [ ] 跨标签同步只在「回到本页」时生效:A 标签登出后,B 标签在后台不会立即跳登录页,回到 B(focus / visible)或 B 发出请求拿到 40100 时才跳。
- [ ] 前端测试在本机高负载时有两条既有用例偶发超时(`page-registry.test.ts > loader 导出默认组件` 20s 超时、`UsersPage.test.tsx` 一条筛选断言),单独跑与重跑全量均通过;当时 load average ≈ 54(同时有 Gradle 在跑),与本次改动无关。
- [ ] 登录页 `FEATURES` 里的展示文案「JWT 认证」未改(令牌仍是 JWT,只是改走 Cookie),是否改由产品决定。

## 自测结果

- 命令:`pnpm --filter @weiran/web lint`
  - 结果:通过(0 problems)
- 命令:`pnpm --filter @weiran/web test`
  - 结果:`Test Files 27 passed (27)` / `Tests 238 passed (238)`(高负载下曾有一次 1 条既有用例超时,见上「埋的坑」;重跑全绿)
- 命令:`pnpm --filter @weiran/web build`(含 `tsc -b`)
  - 结果:通过,`✓ built in 1.32s`
- 命令:`VITE_API_BASE_URL=https://example.com pnpm --filter @weiran/web build`
  - 结果:失败(符合预期),输出:
    ```
    error during build:
    Error: VITE_API_BASE_URL 不能是绝对地址（当前为 https://example.com）：前后端必须同源部署（认证 Cookie SameSite=Strict、无 CORS），VITE_API_BASE_URL 只能是路径前缀（如 /admin-api）或留空；跨域访问请在网关 / 反向代理层把接口挂到同一域名下。
    Exit status 1
    ```
- 命令:`grep -rnE "Authorization|weiran_token|TOKEN_KEY|localStorage.*token" web/src --include='*.ts' --include='*.tsx' | grep -v __tests__`
  - 结果:无匹配(exit 1)。测试文件里保留了 `Authorization` 的**否定断言**(断言请求不带该头),这是有意的。
- 命令:`grep -rnE "setToken|getToken|clearToken|fakeJwt|TOKEN_KEY|tokenUserId|useToken|utils/token" web/src`
  - 结果:无匹配

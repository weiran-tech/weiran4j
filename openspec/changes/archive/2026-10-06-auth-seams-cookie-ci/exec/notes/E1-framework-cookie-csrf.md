# E1: framework-cookie-csrf

## 完成的 tasks.md 条目

- `1.1` `CommonErrors.CSRF_REJECTED(40302)`
- `1.2` `AuthCookies` / `AuthCookieProperties`
- `1.3` `AuthInterceptor`:Bearer 优先、Cookie 次之;CSRF 双提交;自动配置
- `1.4` 契约 §3 / §4 / §6.1
- `7.1` framework 单测
- `8.1`(契约部分):配置键改名、同源、旧令牌失效写进契约 §6.1 / §4

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-common/.../error/CommonErrors.java` | 改造 | 新增 `CSRF_REJECTED(40302, 403)` |
| `weiran-framework/.../auth/AuthCookies.java` | 新增 | 名称常量;`issue` / `clear` 生成 `ResponseCookie`;`csrfUserId` |
| `weiran-framework/.../auth/AuthCookieProperties.java` | 新增 | `weiran.auth.cookie.secure`,默认 true |
| `weiran-framework/.../auth/AuthInterceptor.java` | 改造 | `Credential(token, source)`;非公开 + COOKIE + 写方法 → `checkCsrf`(常量时间比较 + userId 归属);WARN 日志只记原因 |
| `weiran-framework/.../auth/TokenAuthenticator.java` | 改造 | 只改参数名 `bearerToken` → `token` 与 Javadoc |
| `weiran-framework/.../autoconfigure/WeiranFrameworkAutoConfiguration.java` | 改造 | `@EnableConfigurationProperties(AuthCookieProperties)` + `AuthCookies` Bean |
| `weiran-framework/src/test/.../web/WebLayerTest.java` | 改造 | 新增 4 个用例(Cookie 取令牌与 Bearer 优先、CSRF 拒绝的 4 种情形且业务未执行、正确放行、不查 CSRF 的 3 种情形) |
| `weiran-framework/src/test/.../auth/AuthCookiesTest.java` | 新增 | 属性、随机性、Secure 开关、清除、`csrfUserId` 解析 |
| `weiran4j/docs/01-架构与接口契约.md` | 改造 | §3 SPI / `AuthCookies` 行、认证流程与吊销口径;§4 40302、同源、Cookie 表、CSRF 口径;§6.1 登录 / 登出行、JWT `iss`/`aud`、配置键、`authenticate` |

## 为什么这么做

- 关键决策:
  - 拦截器构造签名不变(只读 `AuthCookies` 的静态常量),现有 `WebLayerTest` 与下游覆盖 `AuthInterceptor` Bean 的写法都不受影响;`AuthCookies` 实例只给需要 `Secure` 配置的签发方用。
  - CSRF 值的 userId 前缀与认证用户比对:防止攻击者把自己的 `weiran_csrf` 种进受害者浏览器后搭配受害者的令牌 Cookie。
  - 比较用 `MessageDigest.isEqual`(常量时间)。
- 考虑过但放弃的方案 + 放弃理由:
  - 公开接口也查 CSRF:登录时还没有 CSRF 值,且跨站 JSON POST 本就过不了 CORS 预检。
  - 把 CSRF 写成单独的拦截器:要和认证共享「令牌来源」,拆开就得在请求属性里传状态,不如放在同一处。

## 依赖的契约

- 本单元即 plan §4 的定义方。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- [ ] 登出接口本身需要认证:令牌已失效时调用登出得到 40100,不会下发清除 Cookie。残留的 `weiran_token` 已无效且会按 Max-Age 过期,前端也已清掉 `weiran_csrf`,无害(E3 笔记同样记录)。

## 自测结果

- 命令:`./gradlew spotlessApply :weiran-common:check :weiran-framework:check --no-daemon -q`
  - 结果:通过(中途两次红:一次是脚本替换时误删 `bearerToken` 方法、一次 `spotlessApply` 删掉了当时未用的 `HttpHeaders` import;再一次是 SpotBugs `ST_WRITE_TO_STATIC_FROM_INSTANCE_METHOD`,测试计数器改为 `AtomicInteger` 后全绿)

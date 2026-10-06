# E1: contract-layer0

## 完成的 tasks.md 条目

- `1.1` 错误码 `40102` / `40303` / `40304`
- `1.2` `LoginUser.idp`(保留 5 参构造器);`AuthCookies` 的 `SSO_COOKIE` / `ssoState()` / `clearSsoState()`
- `1.3` `V202610060001__system_user_identity.sql`(建表 + 按钮行 120)
- `1.4` 契约 §2.1(菜单用量改为 120)、§3、§4、§5、§6.1、§6.2

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-common/.../CommonErrors.java` | 改造 | 三个错误码 |
| `weiran-framework/.../auth/LoginUser.java` | 改造 | 新增 `@Nullable String idp`;保留原 5 参构造器,现有调用方不用改 |
| `weiran-framework/.../auth/AuthCookies.java`(+ 测试) | 改造 | 流程 Cookie:Lax、HttpOnly、`Path=/api/auth/sso`、600s |
| `db/migration/system/V202610060001__system_user_identity.sql` | 新增 | 表、唯一键、索引、按钮行 |
| `weiran4j/docs/01-架构与接口契约.md` | 改造 | 见上 |

## 为什么这么做

- 流程 Cookie 必须用 Lax:IdP 回调是跨站发起的顶级导航,Strict Cookie 不会被带上。
- `LoginUser` 保留 5 参构造器:框架现有用法(测试、下游可能的实现)不需要跟着改。

## 依赖的契约

- 本单元是 plan §4 的定义方。

## 越界申报

无。

## 埋的坑 / 遗留

无。

## 自测结果

- `./gradlew :weiran-common:check :weiran-framework:check`:通过

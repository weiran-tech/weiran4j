# E2: backend

## 完成的 tasks.md 条目

`2.1-2.3`、`3.1-3.6`、`4.1-4.3`、`7.1`、`7.2`

## 改了什么

| 层 | 文件 | 说明 |
|---|---|---|
| domain | `identity/{SsoMode,SsoState,SsoStateSigner,ExternalIdentity,ExternalIdentityProvider,ExternalIdentityProviders,UserIdentity,UserIdentityRepository,RedirectPaths,ProvisionedUsername}` | 端口与纯函数规则 |
| domain | `User.hasPassword()`、`TokenClaims.idp`、`VerifiedToken.idp` | 都保留了旧构造器 |
| api | `ExternalLoginService`、`ProvidersView` / `ProviderView` / `UserIdentityView` / `BindIdentityCommand` / `SsoRedirect` / `LogoutResult`;`CurrentUserView.hasPassword`;`AuthService.logout` 签名改为带 `idp` 并返回 `LogoutResult` | — |
| application | `ExternalLoginApplicationService`、`IdentityProvisioner`(事务) | 编排、开通 |
| application | `AuthApplicationService` | 抽出 `completeLogin` / `recordExternalFailure`;密码登录开关(在校验密码之前判定);无密码用户的处理;登出地址 |
| application | `DispatchingTokenAuthenticator` | 把 `idp` 带进 `LoginUser` |
| application | `UserApplicationService.delete` | 连带删除绑定 |
| infrastructure | `identity/{AuthProvidersProperties,ConfiguredExternalIdentityProviders,OidcIdentityProvider,CasIdentityProvider,HmacSsoStateSigner,HttpJson}` | 协议实现、配置校验 |
| infrastructure | `MybatisUserIdentityRepository`、`SysUserIdentityDO`、Mapper;`JwtTokenCodec` 的 `idp` claim;自动配置 | — |
| adapter | `SsoController`(新)、`AuthController`(providers / identities / logout)、`UserController`(管理员接口)、`BindIdentityRequest` | — |
| app | `application.yml`:`public-base-url`、`password-login.enabled`、`providers: {}` | — |
| 测试 | `IdentityRulesTest`(domain);`IdentityInfrastructureTest`(签名、CAS、OIDC,用 JDK HttpServer + 本地生成的 RSA JWKS);`AuthApplicationServiceTest`(+5);`ExternalLoginApplicationServiceTest`(9);`ExternalLoginIT`(7,Keycloak 容器 + 模拟 CAS)+ realm JSON | — |

## 为什么这么做

- **`SsoController` 直接写 302,用相对 Location**:一开始用 `sendRedirect`,Tomcat 会按请求 Host 把它拼成绝对地址,经反向代理时可能拼出内网地址。集成测试第一次运行时发现,已修。
- **开通放在单独的事务 Bean**(`IdentityProvisioner`):建用户、赋角色、绑定三步要么都成功要么都不做;同类自调用不会经过事务代理,所以要单独成 Bean。并发首次登录撞唯一键时,按「已经绑定」重试一次。
- **密码登录开关在校验密码之前判定**:否则关闭时 40101 / 40304 的差别会泄露密码对不对。
- **放弃的方案**:
  - Nimbus / Spring OAuth2 Client:依赖重,而且会引入 Spring Security;
  - 按 Host 头拼回调地址:有 Host 头注入风险。

## 依赖的契约

plan §4 全部。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 是否可能影响其他单元 |
|---|---|---|---|
| `web/src/pages/system/users/UsersPage.tsx`(orchestrator 在 E3 之后改) | E3 笔记提出列宽超出预算;改为只有配置了提供方时才显示「外部身份」,默认部署列宽不变 | 必要连带(验证阶段处置,已登记 `sys_user.md#10`) | 否 |

## 埋的坑 / 遗留

- [ ] 测试时发现,Keycloak 在 http 下也给 Cookie 打 Secure,JDK 的 `CookieManager` 会丢掉它们,所以集成测试手工维护提供方的 Cookie。这只是测试代码的问题,与产品无关。
- [ ] 没有做后端通道单点登出,已登记 `sys_user_identity.md#01`。

## 自测结果

- base 各模块 `check`:通过
- `ExternalLoginIT`:7 / 7 通过。第一次运行有 5 条失败:Location 被拼成绝对地址(产品代码,已修);Keycloak Cookie 被丢弃(测试代码,已修)

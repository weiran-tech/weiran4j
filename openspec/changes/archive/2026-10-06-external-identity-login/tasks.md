---
title: "外部身份登录 · 任务"
status: "draft"
updated_at: "2026-10-06"
---

# Tasks

> 本次只有一个能力 `external-identity`,FR 编号不撞号,直接写 `FR-00N`。

## 1. 共享契约层与数据层(TG-1)

- [x] 1.1 `CommonErrors` 新增 `40102`、`40303`、`40304`(FR-002、FR-004、FR-008)
- [x] 1.2 `LoginUser` 增加 `idp`;`AuthCookies` 增加 `weiran_sso` 流程 Cookie 的生成与清除(FR-006、FR-009)
- [x] 1.3 Flyway `V202610060001__system_user_identity.sql`:建表并插入按钮行 120(FR-005)
- [x] 1.4 契约:§2.1 / §3 / §4 / §5 / §6.1 / §6.2(FR-001 至 FR-009)

## 2. 领域层 `*-domain` / `*-api`(TG-2)

- [x] 2.1 `domain.identity`:`UserIdentity`、`UserIdentityRepository`、`ExternalIdentity`、`ExternalIdentityProvider`、`ExternalIdentityProviders`、`SsoState`、`SsoStateSigner`、`SsoMode`、`RedirectPaths`、`ProvisionedUsername`(FR-004、FR-006)
- [x] 2.2 `User.hasPassword()`;`TokenClaims.idp`;`UserRepository` 删除用户时连带删除绑定(FR-005、FR-007、FR-009)
- [x] 2.3 api:`ExternalLoginService` 与视图 / 命令类型;`CurrentUserView.hasPassword`;`LogoutResult`(FR-001、FR-005、FR-007、FR-009)

## 3. 应用与基础设施层(TG-3)

- [x] 3.1 `ExternalLoginApplicationService`:authorize / callback 编排、映射、自动建号、绑定 / 解绑、管理员操作、登录日志、操作日志(FR-002 至 FR-005、FR-010)
- [x] 3.2 `AuthApplicationService`:抽出登录收尾、密码登录开关、无密码用户的 `authenticate` / `verifyPassword` / `changePassword`、登出地址(FR-007、FR-008、FR-009)
- [x] 3.3 `OidcIdentityProvider`(discovery、JWKS、PKCE、id_token 校验)(FR-002)
- [x] 3.4 `CasIdentityProvider`(FR-003)
- [x] 3.5 `AuthProvidersProperties`、`ConfiguredExternalIdentityProviders`、`HmacSsoStateSigner`、`MybatisUserIdentityRepository`、`JwtTokenCodec` 的 `idp` claim、认证器把 `idp` 带进 `LoginUser`(FR-001、FR-006、FR-009)
- [x] 3.6 `application.yml` 新增 `public-base-url`、`password-login.enabled`、`providers: {}`(FR-001、FR-008)

## 4. 适配层(TG-4)

- [x] 4.1 `SsoController`:authorize / callback(FR-002、FR-003、FR-006)
- [x] 4.2 `AuthController`:providers、本人身份列表与解绑、`/me.hasPassword`、登出返回 `ssoLogoutUrl`(FR-001、FR-005、FR-007、FR-009)
- [x] 4.3 `UserController`:管理员身份接口,带权限与 `@OperationLog`(FR-005)

## 5. 前端 `web`(TG-5)

- [x] 5.1 类型与 hooks(providers、identities、`hasPassword`、登出结果)(FR-001、FR-005、FR-009)
- [x] 5.2 登录页:外部登录按钮、`ssoError` 提示、密码登录关闭时的应急入口(FR-001、FR-008)
- [x] 5.3 个人中心:外部账号卡片(绑定 / 解绑);无本地密码时的修改密码提示(FR-005、FR-007)
- [x] 5.4 用户管理:外部身份弹窗(查看 / 绑定 / 解绑,受权限控制)(FR-005)
- [x] 5.5 锁屏对无本地密码用户只显示「重新登录」;登出按 `ssoLogoutUrl` 跳转(FR-007、FR-009)
- [x] 5.6 新组件登记进 `components.md`(FR-005)

## 6. 文档与状态

- [x] 6.1 D-015(FR-004、FR-006)
- [x] 6.2 部署文档「外部身份提供方」一节;整份重写 `.env.example`(新增两个变量 + 提供方示例)(FR-001、FR-008)
- [x] 6.3 state:`sys_user.md` 补充;新增 `sys_user_identity.md` 并登记到 `bizs/README.md`(FR-005、FR-007)
- [x] 6.4 `AGENTS.md`:认证要点补外部登录;门禁 ③ 改为 ✅,并写明分支保护(#12)需要在 GitHub 开启(FR-002)

## 7. 测试

- [x] 7.1 domain / infrastructure / application 单测(`RedirectPaths`、`ProvisionedUsername`、签名器、CAS 解析、OIDC id_token 校验、映射与绑定规则、密码登录开关)(FR-002 至 FR-008)
- [x] 7.2 集成测试:`OidcKeycloakIT`、`CasLoginIT`、`IdentityAdminIT`(FR-001 至 FR-010)
- [x] 7.3 前端 vitest(FR-001、FR-005、FR-007、FR-008、FR-009)
- [x] 7.4 真实浏览器对 Keycloak 走一遍(FR-002、FR-005、FR-009)

## 8. 发布

- [x] 8.1 部署文档写明 IdP 侧需要登记的回调地址与登出回跳地址;不配置提供方时行为不变

## 9. 上线后

- [x] 9.1 验收记录写入 `artifacts.md`

# sys_user_identity 外部身份绑定

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `weiran4j/docs/01-架构与接口契约.md` 只作索引；决策见 `00-决策记录.md` D-015。
>
> 事实源：
> [`ExternalLoginApplicationService.java`](../../../weiran4j/weiran-system/weiran-system-application/src/main/java/com/weiran/system/application/auth/ExternalLoginApplicationService.java)、
> [`IdentityProvisioner.java`](../../../weiran4j/weiran-system/weiran-system-application/src/main/java/com/weiran/system/application/auth/IdentityProvisioner.java)、
> [`SsoController.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/SsoController.java)、
> [`AuthController.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/AuthController.java)（本人身份）、
> [`UserController.java`](../../../weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/UserController.java)（管理员身份接口）、
> `weiran-system-infrastructure/.../identity/`（`OidcIdentityProvider`、`CasIdentityProvider`、`ConfiguredExternalIdentityProviders`、`HmacSsoStateSigner`）、
> [`MybatisUserIdentityRepository.java`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/java/com/weiran/system/infrastructure/persistence/MybatisUserIdentityRepository.java)、
> [`V202610060001__system_user_identity.sql`](../../../weiran4j/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202610060001__system_user_identity.sql)、
> 前端 [`ExternalAccountsCard.tsx`](../../../web/src/components/ExternalAccountsCard.tsx)、[`UserIdentitiesModal.tsx`](../../../web/src/pages/system/users/UserIdentitiesModal.tsx)、[`hooks/queries/identities.ts`](../../../web/src/hooks/queries/identities.ts)。
>
> 盘点基线：change `external-identity-login`（2026-10-06，建表）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_user_identity`：`(provider, external_id)` 唯一，`user_id` 有索引，不建外键 |
| 菜单 | 没有独立页面；入口在「用户管理」行操作（按钮 `sys_menu.id = 120`）与「个人中心 → 外部账号」 |
| 后端模块 | `weiran-system`（包 `com.weiran.system`，domain 子包 `identity`） |
| 接口 | `GET /api/auth/providers`（公开）、`GET /api/auth/sso/{id}/authorize`、`GET /api/auth/sso/{id}/callback`、`GET/DELETE /api/auth/identities[/{id}]`、`GET/POST/DELETE /api/users/{id}/identities[/{identityId}]` |
| 权限码 | `system:user:identity`（管理员查看、绑定、解绑他人）；本人操作只需登录 |

## 1. 列表

- **个人中心「外部账号」卡片**:列出本人的绑定(提供方名称、外部标识、显示名、绑定时间),可以解绑;对还没绑定的提供方显示「绑定」按钮。
- **用户管理「外部身份」弹窗**:只有配置了提供方时,行操作里才出现「外部身份」。弹窗里是该用户的绑定列表、解绑按钮和手工绑定表单。

## 2. 字段与表单

| 字段 | 说明 |
| --- | --- |
| `provider` | 提供方 id（`weiran.auth.providers` 的键）；提供方从配置里删掉后，已有绑定仍保留，`providerName` 显示为 id |
| `external_id` | OIDC `sub` / CAS user，最长 191 |
| `display_name` | 绑定时的外部显示名快照，只用于展示 |
| `created_by` | 管理员绑定时是管理员；自助绑定和自动开通时是用户本人 |

手工绑定表单:提供方(下拉,来自 `/providers`)、外部用户标识(必填)、显示名(可选)。

## 3. 动作

| 动作 | 接口 | 规则 |
| --- | --- | --- |
| 外部登录 | authorize → callback | 只认 `(provider, external_id)`;未绑定时,提供方开了 `auto-provision` 就自动开通,否则返回 40303;**本地同名用户不会被自动关联**(40303) |
| 自助绑定 | authorize `mode=bind` → callback | 必须已登录;已绑给自己时视为成功;绑给了别人返回 40901;写一条操作日志 |
| 自助解绑 | `DELETE /api/auth/identities/{id}` | 没有本地密码且只剩这一个外部身份时 40901(防锁死) |
| 管理员绑定 | `POST /api/users/{id}/identities` | 提供方未配置 40000;外部身份已被绑定 40901 |
| 管理员解绑 | `DELETE /api/users/{id}/identities/{identityId}` | 可以解绑最后一个(前端会提示「解绑后该用户可能无法登录」) |
| 删除用户 | `DELETE /api/users/{id}` | 连带删除该用户的全部绑定 |

## 4. 用到的公共组件

`ExternalAccountsCard`、`UserIdentitiesModal`、`TableActions`、`Permission`(见 `rules/advisory/components.md`「账号与外部身份」)。

## 5. 说明与建议

- **流程状态**放在签名 Cookie `weiran_sso` 里(Lax、10 分钟、`Path=/api/auth/sso`)。回调结束后,无论成功与否都会清除它。
- **对外地址** `WEIRAN_PUBLIC_BASE_URL` 必须与浏览器地址完全一致,否则提供方会拒绝回调地址,或者回调后带不上 Cookie。
- **OIDC 缓存**:discovery 与 JWKS 都缓存在进程内,按 `kid` 找不到公钥时刷新一次;提供方的地址变了需要重启。

## 6. 已知问题汇总

- **#01 ⚠️ P3 没有后端通道单点登出**
  症状:用户在提供方那边登出(或被提供方禁用)后,本系统的会话仍然有效,直到令牌过期(默认 12h)。
  本系统只在用户从这里登出时跳转提供方登出(前端通道);CAS 的 logoutRequest 和 OIDC 的 back-channel logout 都不处理。
  需要立即失效时,由管理员在本系统禁用该用户(`token_version+1`)。

## 7. changelog

新条目插在本节最上方(按日期倒序,新在上)。

**2026-10-06**(`external-identity-login`)

- **#02 ✅ P? 建立本文件**:新表 `sys_user_identity`、外部登录流程、自助绑定和管理员绑定(D-015)。

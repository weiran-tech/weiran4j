---
title: "外部身份登录 · 集成与校验"
status: "done"
updated_at: "2026-10-06"
---

# Verify

> **L6 集成 + L8 规格一致性**。执行者:orchestrator(E1 / E2 / E4 的实现者;E3 由 subagent 实现,已读完其收尾笔记)。

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成。E3 由 subagent 与 E2 交替推进,文件集不相交,没有冲突。
**执行单元数**:4 个

## 输入检查

- [x] `notes/*.md` 齐全(E1-contract-layer0、E2-backend、E3-web-external-identity、E4-docs-browser)
- [x] Layer 0 完成,契约没有再变动
- [x] 自测通过

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| 登录收尾(记录登录、签发、写成功日志) | 原 `login()` 内联 | `AuthApplicationService.completeLogin`(密码登录与外部登录共用) | `login()` 内的副本 | ☑ |
| `ssoError` 错误码 → 文案 | 登录页、个人中心 | `hooks/queries/identities.ts` 的 `ssoErrorMessage` | — | ☑(E3) |

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 前端回调页 POST code / ticket | design | 令牌要经过页面脚本 |
| 服务端存流程状态 | design | 多实例需要共享存储;改为签名 Cookie |
| 按用户名自动关联 | interview | 冒名接管风险 |
| Spring Security OAuth2 Client / Nimbus | design | 依赖重,而且会引入 Spring Security |
| `response.sendRedirect` | E2 | Tomcat 按请求 Host 把它拼成绝对地址,经反向代理时可能拼出内网地址;改为直接写相对的 Location 头 |
| 「外部身份」行操作始终显示 | E3 → orchestrator | 默认部署的列宽也会超出预算;改为只有配置了提供方时才显示 |
| 前端直接调 `history.replaceState` 清 URL 参数 | E3 | 路由器会继续读到旧参数;改用 `setSearchParams(…, {replace:true})` |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `web/src/pages/system/users/UsersPage.tsx`(orchestrator 改,原属 E3) | E2 笔记 | 必要连带:处置 E3 提出的列宽问题 | 保留;剩余影响登记 `sys_user.md#10` |
| `web/src/test/helpers.tsx`(`stubLocationAssign`) | E3 | 在 E3 拥有的范围内 | 保留 |
| 本机库里自动开通的 carol(验证时产生) | E4 | 验证产生的临时数据 | 已删除 |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| `build` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿(exit=0) | `evidence/build.log` |
| `test` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿(exit=0;集成测试 9 个类 51 条,其中 `ExternalLoginIT` 7 条;前端 32 文件 / 273 条) | `evidence/test.log` |
| `lint` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿(exit=0) | `evidence/lint.log` |

证据在全部代码改完之后产生。之后只改了本文件,`node openspec/check.mjs` 复核通过。没有红灯。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 1.1–1.4 | E1 | `CommonErrors`;`LoginUser.idp`;`AuthCookies.ssoState/clearSsoState`;`V202610060001`;契约 | ☑ |
| 2.1 | E2 | `domain/identity/*` | ☑ |
| 2.2 | E2 | `User.hasPassword`;`TokenClaims.idp`;`UserApplicationService.delete` 连带删除绑定 | ☑ |
| 2.3 | E2 | api 层新类型;`CurrentUserView.hasPassword`;`AuthService.logout` 新签名 | ☑ |
| 3.1 | E2 | `ExternalLoginApplicationService`、`IdentityProvisioner` | ☑ |
| 3.2 | E2 | `AuthApplicationService`(`completeLogin`、开关、无密码、登出地址) | ☑ |
| 3.3 / 3.4 | E2 | `OidcIdentityProvider` / `CasIdentityProvider` | ☑ |
| 3.5 | E2 | `AuthProvidersProperties`、`ConfiguredExternalIdentityProviders`、`HmacSsoStateSigner`、`MybatisUserIdentityRepository`、`JwtTokenCodec` 的 `idp` claim、认证器 | ☑ |
| 3.6 | E2 | `application.yml` | ☑ |
| 4.1–4.3 | E2 | `SsoController`、`AuthController`、`UserController`、`BindIdentityRequest` | ☑ |
| 5.1–5.6 | E3 | 见 E3 笔记;5.4 的显示条件由 orchestrator 调整 | ☑ |
| 6.1–6.4 | E4 | D-015;`02-部署.md` §5a;`.env.example`;state;`AGENTS.md` | ☑ |
| 7.1 / 7.2 | E2 | `IdentityRulesTest`、`IdentityInfrastructureTest`、`AuthApplicationServiceTest`(+5)、`ExternalLoginApplicationServiceTest`(9)、`ExternalLoginIT`(7) | ☑ |
| 7.3 | E3 | 5 个新增测试文件,加上补充的用例 | ☑ |
| 7.4 | E4 | 见下方「真实浏览器」 | ☑ |
| 8.1 | E4 | `02-部署.md` §5a 与检查清单 | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 9.1 写 `artifacts.md` | 上线后动作,在 L9 签字后、归档前写 | ☑ |

### 真实浏览器(7.4)

本机 Keycloak 容器 + `pnpm dev`(开启自动开通的 OIDC 提供方),在 cmux 浏览器的新分屏里操作:

1. 登录页出现「使用 Keycloak 登录」;
2. 跳到 Keycloak,用 carol 登录;
3. 回到 `/dashboard`,顶栏显示「Carol Auto」(自动开通);
4. 刷新后仍在登录态;
5. 个人中心:邮箱已验证,「外部账号」卡片显示绑定,有「未设置本地密码」提示;
6. 登出:跳到 Keycloak 登出确认页,确认后回到 `/login`,`/api/auth/me` 返回 401。

验证结束后已清理(删除 carol、停止 dev、删除容器)。

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法 CP-1/2/3/12/13 | 端口在 domain,实现在 infrastructure,对外接口在 api | 一致 | ☑ |
| 宪法 CP-4 | 不新增依赖 | 一致(JDK HttpClient + jjwt JWK;测试用 JDK `HttpServer`、Testcontainers `GenericContainer`) | ☑ |
| 宪法 CP-7 / CP-15 | 只追加迁移;菜单 id 120 | 一致 | ☑ |
| 宪法 CP-8 | 外部登录签发的仍是本地 JWT,吊销走 `token_version` | 一致 | ☑ |
| 宪法 CP-9 | 不记 ticket、code、令牌、密钥 | 日志与登录日志只记提供方和原因;`ExternalLoginIT` 断言失败日志里没有 `ST-` | ☑ |
| 宪法 CP-10 ⚠ | 40303 是有意偏离 | 按设计实现,并写进 D-015 | ☑ |
| DS-1 契约 | 冻结表各项 | 一致,没有契约变更 | ☑ |
| DS-2 API 与配置 | 端点、配置键、id 规则 | 一致 | ☑ |
| DS-3 数据库 | 表与按钮行 | 一致 | ☑ |
| DS-5 分层 | 见 design | 一致;另加了一个 `IdentityProvisioner`(事务 Bean,design 没有单列),属于实现细化 | ☑ |
| DS-6 前端 | 见 design | 一致;「外部身份」行操作改为只有配置了提供方时才显示(见不一致项 2) | ☑ |
| Data Flow | 回调失败时跳 `ssoError`;bind 模式跳 `/profile` | 一致 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| FR-001 列出已配置的提供方 | 三项;不含 secret 与 URL | `ExternalLoginIT.listsProviders` | ☑ |
| FR-002 用 Keycloak 完成登录 | 下发 Cookie,302 到 redirect,`/me` 返回对应用户 | `ExternalLoginIT.oidcLoginForBoundUser` + 真实浏览器 | ☑ |
| FR-002 state 不符时拒绝 | 40102,没有认证 Cookie | `ExternalLoginIT.oidcRejectsUnboundAndTampered` | ☑ |
| FR-003 模拟 CAS 验票成功 | 登录;`service` 一致 | `ExternalLoginIT.casLogin` + `IdentityInfrastructureTest` | ☑ |
| FR-003 模拟 CAS 验票失败 | 40102 | 同上 | ☑ |
| FR-004 未绑定且未开启自动建号 | 40303 | `ExternalLoginIT`(bob)+ 单测 | ☑ |
| FR-004 自动建号后第二次登录命中同一用户 | `hasPassword=false`,默认角色,id 相同 | `ExternalLoginIT.oidcAutoProvisions` | ☑ |
| FR-004 同名本地用户不被自动关联 | 40303 | `ExternalLoginApplicationServiceTest.refusesUnprovisioned` | ☑(单测;集成测试的 realm 里没有构造同名本地用户) |
| FR-005 本人绑定 | 出现绑定;当前会话不变 | `ExternalLoginIT.bindsOwnIdentity` | ☑ |
| FR-005 禁止解绑导致锁死 | 40901 | `ExternalLoginIT.oidcAutoProvisions` + 单测 | ☑ |
| FR-005 管理员手工绑定与权限 | 成功;无权限 40300;删除用户连带删除 | `ExternalLoginIT.adminIdentityEndpoints` | ☑ |
| FR-006 开放重定向被阻止 | 改为 `/` | `IdentityRulesTest.normalizesRedirect` + `ExternalLoginApplicationServiceTest.authorizeBuildsState` | ☑ |
| FR-006 篡改流程 Cookie | 40102 | `IdentityInfrastructureTest.signsAndVerifiesState` + 集成测试的 state 伪造 | ☑ |
| FR-007 自动建出的用户不能用密码登录 | 40101 | `AuthApplicationServiceTest.passwordlessUserCannotUsePassword`;集成测试上下文关闭了密码登录,普通用户在这里先得到 40304 | ☑ |
| FR-008 关闭后普通用户被拒、内置超管可登录 | 40304 / 成功 | `ExternalLoginIT.oidcLoginForBoundUser` + 单测 | ☑ |
| FR-009 外部登录的会话登出时返回登出地址 | Keycloak end_session;密码登录的会话为 null | `ExternalLoginIT.oidcLoginForBoundUser` + 真实浏览器 | ☑ |
| FR-010 失败也留痕 | `status=fail`,含提供方,不含 ticket | `ExternalLoginIT.casLogin` | ☑ |

**interview 验收标准**:AC-1 至 AC-16 均已覆盖。AC-16 中的「GitHub CI」在 PR 上确认。

## 越界检查

改动文件集对照 plan §5 的所有权:只有 `UsersPage.tsx` 由 orchestrator 改动(已申报,必要连带)。**没有未申报的越界**。

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | design 没有写重定向怎么输出;实现最初用 `sendRedirect`,集成测试发现 Location 被拼成绝对地址 | **验证中发现的代码缺陷**:经反向代理时可能拼出内网地址 | 已修(相对 Location),集成测试复测通过 |
| 2 | design DS-6:用户管理行操作「外部身份」受权限控制;实现另外加了「只有配置了提供方时才显示」 | **表述可细化,实现合理**:没有提供方时这个操作没有意义;同时减轻了列宽问题 | 已实现;剩余影响登记 `sys_user.md#10` |
| 3 | Keycloak 登出会多一个确认页 | 符合设计(只做前端通道登出,不保存 id_token);不是缺陷 | 记入遗留问题 |

---

## 遗留问题

- [x] 启用外部身份后,用户列表在双列、侧边、混合布局下横向滚动 → 已登记 `sys_user.md#10`。
- [x] 没有后端通道单点登出 → 已登记 `sys_user_identity.md#01`。
- [x] Keycloak 登出多一个确认页(没有 `id_token_hint`)。要免确认得在会话里保存 id_token,属于体验优化,本次不登记;如有需要另开 change。
- [x] `/providers` 请求失败时,前端按「没有提供方、密码登录开启」降级(E3 笔记)。设置了 `passwordLoginEnabled=false` 的部署首屏会闪一下密码表单。影响很小,不登记。

## 流程反馈

- jsdom 里不能 `vi.spyOn(location, 'assign')`,E3 加了 `stubLocationAssign()` 测试 helper。以后有跳转类断言时直接复用,不必再踩一次。

## 结论

- [x] 集成完成
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design / specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff

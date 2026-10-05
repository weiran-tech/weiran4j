---
title: "认证三段式拆分 + HttpOnly Cookie + CI · 集成与校验"
status: "done"
updated_at: "2026-10-06"
---

# Verify

> **L6 集成 + L8 规格一致性**。执行者:orchestrator(E1 / E2 / E4 的实现者本人;E3 由 subagent 实现,已读完其收尾笔记)。

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成(E3 由 subagent 在同一工作区与 orchestrator 交替推进,文件集按 plan §5 不相交,未发生冲突)
**执行单元数**:4 个(E1 / E2 / E3 / E4)

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全(`E1-framework-cookie-csrf`、`E2-base-three-stage-auth`、`E3-web-cookie-session`、`E4-ci-docs`)
- [x] Layer 0 已完成且契约未再变动(唯一一次调整见 plan §4「契约变更记录」,HTTP JSON 契约不变)
- [x] 自测通过

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| CSRF 请求头名 `X-CSRF-Token` | 后端 `AuthCookies.CSRF_HEADER`、前端 `request.ts` 的 `CSRF_HEADER` | 两份都保留 | — | ☑(跨语言无法共享常量;契约 §4 是唯一定义,两侧都有测试锁定) |
| `login` 内部的凭据校验 | 原 `login()` 内联 → 新 `authenticate()` | `authenticate()` | `login()` 内的副本 | ☑ `login` 已改为调用 `authenticate` |

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 逐个 `TokenVerifier` 尝试 | design / D-014 | 不合法令牌会被每个校验器各验一遍;两个签发方都认同一张令牌时有歧义 |
| Redis 广播失效 | interview #2 | 为 30s 权限延迟引入新基础设施不划算;吊销已改为查库 |
| `LoginResult.accessToken` 在 api 层可空 | E2 | 改由 adapter `LoginResponse` + `@JsonInclude(NON_NULL)` 控制 JSON 形状,api 层不依赖 Jackson,Cookie 模式下字段真正不存在 |
| 依赖全局 Jackson 省略 null | E2 | 会影响全站响应形状 |
| 公开接口也查 CSRF | E1 | 登录前还没有 CSRF 值;跨站 JSON POST 本就过不了 CORS 预检 |
| CSRF 单独做一个拦截器 | E1 | 需要和认证共享「令牌来源」,拆开要靠请求属性传状态 |
| 继续用 `storage` 事件跨标签同步 | E3 | Cookie 变化不触发事件;改为 focus / visibilitychange 时重读 |
| `clearSession()` 内顺带调登出接口 | E3 | 纯本地 store 会变成有副作用的网络调用,401 分支里还会循环 |
| `TokenCodec` 与 `TokenVerifier` 各注册一个别名 Bean | E2 | Spring 按实际类型匹配,分发器会收集到同一实例的多份 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `weiran4j/config/application-local.yml`(gitignore,不在 diff 里) | `E2` | 必要连带:配置键改名后本机 `bootRun` 读不到密钥,AC-20 需要它;只改键路径,未读、未改密钥 | 保留 |
| `openspec/state/bizs/sys_user.md` | `E2` | 必要连带:AGENTS.md「state ④ 改了字段 / 动作要同步现状文档」 | 保留 |
| `AGENTS.md` | `E2` | 必要连带:「认证与权限要点」写的「前端对 40100 清令牌」与新机制不符 | 保留 |
| `openspec/rules/advisory/components.md` | `E2`(代 E3) | 必要连带:`PreferencesProvider` 的描述引用了已删除的 `tokenUserId()` | 保留 |
| `web/src/components/LockScreen.tsx`、`web/src/hooks/useLockScreen.ts`(只改注释) | `E3` | 在 E3 拥有的 `web/**` 内,注释描述的 localStorage 令牌已过时 | 保留 |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| `build` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿(exit=0) | `evidence/build.log` |
| `test` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿(exit=0;前端 27 文件 / 238 用例) | `evidence/test.log` |
| `lint` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿(exit=0) | `evidence/lint.log` |

- 证据在代码全部改完后产生。之后只改了 `sourcePaths` 之外的文件(`weiran4j/.env.example`、`tasks.md`、本文件),`node openspec/check.mjs` 复核通过(`L7/evidence-fresh` 未报)。
- Gradle 的 `test` / `check` 任务在证据运行中大多是 UP-TO-DATE:同样的输入此前在 `:weiran-app:test` 等迭代运行中已跑过,并且全绿(集成测试 6 个类 39 条)。之后没有改过任何 Java 源码与测试,Gradle 的增量判定可信。
- 没有红灯,不需要基线对比。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 1.1 | `E1` | `weiran-common/.../error/CommonErrors.java`(`CSRF_REJECTED`) | ☑ |
| 1.2 | `E1` | `weiran-framework/.../auth/{AuthCookies,AuthCookieProperties}.java` | ☑ |
| 1.3 | `E1` | `weiran-framework/.../auth/AuthInterceptor.java`(`credential` / `checkCsrf`)、`WeiranFrameworkAutoConfiguration.java` | ☑ |
| 1.4 | `E1` | `weiran4j/docs/01-架构与接口契约.md` §3 / §4 / §6.1 | ☑ |
| 2.1 | `E2` | `weiran-base-domain/.../auth/{TokenVerifier,TokenIssuerReader,IdentityResolver,PermissionSource,VerifiedToken,PrincipalSnapshot,AuthState}.java`、`TokenCodec.java` | ☑ |
| 2.2 | `E2` | `UserRepository.findAuthState` | ☑ |
| 2.3 | `E2` | `AuthService.authenticate`、`AuthenticatedUser`、`LoginResult.userId` | ☑(`accessToken` 可空改由 adapter 处理,见契约变更记录) |
| 3.1 | `E2` | `JwtTokenCodec`(`issuer` / `requireIssuer` / `requireAudience`)、`JwtIssuerReader`、`AuthJwtProperties` | ☑ |
| 3.2 | `E2` | `MybatisUserRepository.findAuthState` | ☑ |
| 3.3 | `E2` | `DispatchingTokenAuthenticator`、`LocalIdentityResolver`、`LocalRbacPermissionSource`、`AuthSnapshotCache`;`SystemTokenAuthenticator` 已删除 | ☑ |
| 3.4 | `E2` | `AuthApplicationService.authenticate` / `login` | ☑ |
| 3.5 | `E2` | `application.yml`、`application-test.yml`、`config/application-local.yml.example`、`.env.example`(末尾追加) | ☑ |
| 4.1 / 4.2 | `E2` | `AuthController.login` / `logout`、`response/LoginResponse.java` | ☑ |
| 5.1–5.5 | `E3` | `web/src/utils/session.ts`、`request.ts`、`hooks/{useAuth,PreferencesProvider}.tsx`、`hooks/queries/auth.ts`、`types/api.ts`、`vite.config.ts` | ☑ |
| 6.1 | `E4` | `.github/workflows/ci.yml` | ☑ |
| 6.2 | `E4` | `constitution.md` CP-8 | ☑ |
| 6.3 | `E4` | `00-决策记录.md` D-014 | ☑ |
| 6.4 | `E4` | `artifact.md` #02 / #05 | ☑ |
| 7.1 | `E1` | `WebLayerTest`(+4)、`AuthCookiesTest` | ☑ |
| 7.2 | `E2` | `JwtTokenCodecTest`、`DispatchingTokenAuthenticatorTest`、`LocalIdentityResolverTest`、`AuthApplicationServiceTest` | ☑ |
| 7.3 | `E2` | `IntegrationTestSupport`、`AuthIT`、`CookieAuthIT`(7 条) | ☑ |
| 7.4 | `E3` | `session.test.ts`、`request.test.ts` 等(见 E3 笔记) | ☑ |
| 7.5 | orchestrator | 见下方「手动验证」 | ☑ |
| 8.1 | `E1` / `E4` | 契约 §6.1、D-014「发布影响」 | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 9.1 写 `artifacts.md` | 上线后动作,在 L9 签字后、归档前写 | ☑ |

### 手动验证(7.5)

| 项 | 方式 | 结果 |
|---|---|---|
| 绝对地址的 `VITE_API_BASE_URL` 会让构建失败 | E3 执行 `VITE_API_BASE_URL=https://example.com pnpm --filter @weiran/web build` | 失败,报错为「VITE_API_BASE_URL 不能是绝对地址…前后端必须同源部署…」 |
| `ci.yml` 语法 | 本机没有 actionlint,退回 `python3 yaml.safe_load` | 解析成功;jobs = backend / web / openspec;`on.pull_request.branches` = `on.push.branches` = `[main]` |
| 接口级端到端(经 vite 代理 5373) | `curl` 加 cookie jar | 见下表 |
| 真实浏览器(cmux 内置浏览器,surface:27,本机 `pnpm dev`) | `cmux browser` 驱动页面操作,不经过接口直调 | 见下表 |

**接口级端到端(curl)**:

| 步骤 | 结果 |
|---|---|
| 登录 | 响应体 `{tokenType, expiresIn:43200, userId:1}`,没有 `accessToken`;`weiran_token` 带 `Path=/api; HttpOnly; SameSite=Strict`,`weiran_csrf` 带 `Path=/; SameSite=Strict`,不带 HttpOnly |
| 只凭 Cookie 调 `/me` | `code 0` |
| 不带 CSRF 头 `PUT /profile` | `40302` |
| 带 CSRF 头 `verify-password` | `code 0` |
| 登出 | 两个 Cookie 都以 `Max-Age=0` 清除 |
| 登出后调 `/me` | `40100` |

**真实浏览器**:

1. **登出**:回到 `/login`;`document.cookie` 为空,浏览器 Cookie 库里两个 Cookie 都没有了(HttpOnly 的 `weiran_token` 也已由服务端清除)。
2. **表单登录**:
   - `document.cookie` 只看得到 `weiran_csrf=1.<rand>`;
   - Cookie 库:`weiran_token` 为 `httpOnly: true`、`path: /api`;`weiran_csrf` 为 `httpOnly: false`、`path: /`;
   - `localStorage.weiran_token` 为 null。
3. **刷新**:仍在登录态,顶栏显示「超级管理员」。
4. **个人中心改昵称**:提示「资料已保存」,顶栏随之更新。抓到的请求是 `PUT /api/auth/profile`,带 `X-CSRF-Token: 1.<rand>`,没有 `Authorization`,`credentials: same-origin`。验证后已把昵称改回「超级管理员」。
5. **锁屏**:管理员偏好里锁屏原本是关闭的,先在「偏好设置」里临时打开。
   - 输错密码:提示「密码错误」,仍处于锁屏,会话还在;
   - 输对密码:解锁;
   - 两次 `verify-password` 请求都带 CSRF 头。

   验证完已把偏好关回去,服务端 `enableLockScreen` 为 `false`。
6. **再次登出**:回到 `/login`,Cookie 库为空;此时调 `/api/login-logs` 返回 401。

验证结束后已重新登录,浏览器恢复到验证前的登录状态。

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法对照 CP-1/2/3 | 端口只用领域类型;持久化类型不出 infrastructure | `domain/auth/*` 只依赖 JDK 与 JSpecify;`findAuthState` 返回 `AuthState` | ☑ |
| 宪法对照 CP-8 ⚠ | 修订条文;本地令牌吊销不经缓存 | `constitution.md` 已拆两段;`LocalIdentityResolver` 每次查库 | ☑ |
| 宪法对照 CP-9 | 日志不含令牌 / CSRF 值 | `AuthInterceptor` WARN 只记方法、路径和原因;`JwtIssuerReader` / `JwtTokenCodec` 只记异常类名 | ☑ |
| 宪法对照 CP-10 / CP-11 / CP-12 / CP-13 / CP-14 | — | 见上方各任务;40302 位于 00–19 段;Cookie 机制在框架层,不引用基座 | ☑ |
| DS-1 跨模块契约 | 冻结表各项 | 一致;唯一调整(api 层 `accessToken` 非空)已记入契约变更记录,HTTP 契约不变 | ☑ |
| DS-2 API | 登录 / 登出交付方式;Cookie 属性;JWT 载荷;配置键 | 一致(curl、真实浏览器、`CookieAuthIT` 三方印证) | ☑ |
| DS-3 数据库 | 只读两列、无迁移 | 一致;设计里写的 `deleted = 0` 已在 L3 前改为物理删除口径 | ☑ |
| DS-5 分层与装配 | 单个 `JwtTokenCodec` Bean;重复 issuer 启动失败 | 一致(同一实例重复出现不算冲突,有单测) | ☑ |
| DS-6 前端 | `session.ts`、请求层、消费方、同源约束、测试 helper | 一致 | ☑ |
| CI 设计 | 三个并行 job、concurrency、`contents: read`、不开配置缓存 | 一致 | ☑ |
| Observability | CSRF 失败打 WARN;不新增指标 | 一致 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| admin-foundation / FR-002 用户名不存在与密码错误不可区分 | 两次 40101 且 message 相同 | `AuthIT`(既有用例)+ `AuthApplicationServiceTest` | ☑ |
| admin-foundation / FR-002 内置管理员可登录 | 令牌模式下 `accessToken` 非空,`/me` 的 permissions 为 `*` | `AuthIT.seededAdminCanLogin`(新增断言 userId、无 Set-Cookie、token 非空) | ☑ |
| admin-foundation / FR-003 改密后旧令牌失效 | 40100 | `UserRoleIT`(既有用例) | ☑ |
| admin-foundation / FR-003 其他实例的吊销在本实例立即生效 | 直接改库后下一次请求 40100 | `CookieAuthIT.revocationBypassesCache`(`token_version` 与 `status` 两种)+ `LocalIdentityResolverTest` | ☑ |
| FR-009 新签发令牌带签发方与受众 | `iss == weiran4j`,`aud` 含 `weiran4j` | `JwtTokenCodecTest.roundTrip`、`CookieAuthIT.enforcesIssuerAndAudience` | ☑ |
| FR-009 签发方或受众不符的令牌被拒 | 三种情况都是 40100 | `CookieAuthIT.enforcesIssuerAndAudience`、`JwtTokenCodecTest.rejectsWrongIssuerOrAudience` | ☑ |
| FR-010 浏览器默认登录只下发 Cookie | 无 `accessToken`,两个 Cookie 属性正确 | `CookieAuthIT.browserLoginSetsCookies` + curl + 真实浏览器 | ☑ |
| FR-010 只凭 Cookie 即可访问受保护接口 | code 0 | `CookieAuthIT.cookieAloneAuthenticates` + 真实浏览器刷新 | ☑ |
| FR-010 令牌模式登录不下发 Cookie | 有 `accessToken`,无 Set-Cookie | `CookieAuthIT.tokenModeSkipsCookiesAndCsrf` | ☑ |
| FR-010 登出清除 Cookie | 两个都是 `Max-Age=0` | `CookieAuthIT.logoutClearsCookies` + 真实浏览器 | ☑ |
| FR-010 前端不再持有令牌 | grep 无匹配 | `grep -rnE "Authorization\|weiran_token\|TOKEN_KEY" web/src --include='*.ts' --include='*.tsx' --exclude-dir=__tests__` 无匹配(E3 自测,并经 orchestrator 复核) | ☑ |
| FR-011 缺少 CSRF 头 | 40302,资料不变 | `CookieAuthIT.cookieWritesRequireCsrf` + `WebLayerTest` + curl | ☑ |
| FR-011 CSRF 头与 Cookie 不一致 | 40302 | 同上 | ☑ |
| FR-011 Bearer 认证的写请求不查 CSRF | code 0 | `CookieAuthIT.tokenModeSkipsCookiesAndCsrf`、`WebLayerTest.skipsCsrfWhereNotApplicable` | ☑ |
| FR-011 前端写请求自动带 CSRF 头 | 写请求带头,GET 不带 | `request.test.ts` + 真实浏览器抓到的请求 | ☑ |
| FR-012 校验成功不产生令牌与成功日志 | 不调用 issue、不写日志 | `AuthApplicationServiceTest.authenticateSucceedsWithoutSideEffects` | ☑ |
| FR-012 校验失败写失败日志 | 40101 加失败日志 | `AuthApplicationServiceTest`(3 条) | ☑ |
| continuous-integration / FR-001 | `on` 同时含 PR 与 push(main) | YAML 解析 | ☑ |
| continuous-integration / FR-002 三类检查都在工作流中 | 包含各条命令,且没有 configuration-cache | `grep` `ci.yml`:`java-version: 21`、`./gradlew check`、`pnpm lint/test/build`、`node openspec/check.mjs` 都在;`configuration-cache` 无匹配 | ☑ |
| continuous-integration / FR-002 工作流语法有效 | actionlint 或 YAML 解析 | 本机没有 actionlint,YAML 解析通过(按 spec 判据的退路,在此注明) | ☑ |

**interview 验收标准**:AC-1 至 AC-20 都已被上表或 tasks 核对覆盖。其中 AC-17 的实际运行要等第一次 PR,见「遗留问题」。

## 越界检查

`git diff --name-only` 中不在 `web/**`、`weiran4j/weiran-{base,framework,common,app}/**`、`.github/**` 和本 change 目录里的文件:

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| `weiran4j/docs/01-架构与接口契约.md` | `E1`(拥有) | `E1` | — | 拥有 |
| `weiran4j/docs/00-决策记录.md`、`openspec/rules/enforced/constitution.md`、`openspec/state/bizs/artifact.md` | `E4`(拥有) | `E4` | — | 拥有 |
| `weiran4j/.env.example`、`weiran4j/config/application-local.yml.example` | `E2`(拥有) | `E2` | — | 拥有 |
| `AGENTS.md`、`openspec/rules/advisory/components.md`、`openspec/state/bizs/sys_user.md` | — | orchestrator | ☑(E2 笔记) | 必要连带 |

结论:**无未申报越界**。

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | design DS-1 写的 `LoginResult(@Nullable String accessToken, …)`;实现中 api 层保持非空,由 adapter `LoginResponse` 决定 JSON 形状 | **spec 表述可细化,实现合理**:设计意图「Cookie 模式响应体不出现令牌」保持不变,并且更贴近 spec FR-010 的判据「字段不存在」;HTTP 契约(契约文档 §6.1)不变 | 已在 plan §4「契约变更记录」登记。design.md 是已审批的历史文档,不回写(L4 单向) |
| 2 | design DS-3 原写 `deleted = 0` | 已在 L3 审批前修正为物理删除口径 | 无需处理 |

---

## 遗留问题

- [x] 角色 / 权限变更在多实例下有 30s 生效窗口 → 已登记 `artifact.md#02`(🟡 部分解决)。
- [x] CI 是否真能在 GitHub runner 上跑通,要等第一次 PR;分支保护未配置 → `artifact.md#12`(已有条目)。合入后在 `artifacts.md`(9.1)里记录首次运行结果。
- [x] `.env.example` 其余部分仍是重写前的内容 → `artifact.md#09`(已有条目,本次只在末尾追加)。
- [x] 令牌已失效时调用登出得到 40100,不会下发清除 Cookie 的 Set-Cookie。残留的 `weiran_token` 已经无效,会按 Max-Age 过期,前端也已清掉 `weiran_csrf`,无害。判为知情接受,不登记。
- [x] 跨标签页登出要等回到该标签页(focus / visible)或下一次请求 40100 才同步。属于设计已接受的行为(proposal Risks),不登记。

## 流程反馈

- `state-waitlist` 守卫按行首 `- #NN` 识别条目;在 changelog 里写「- #02 改为…」会被判重号。可以在 `bizs/README.md` 的编号约定里补一句「引用已有条目时不要以 `- #NN` 开头」(下个流水线 change 处理)。
- 本仓库的权限设置禁止读取 `.env*`,而 tasks 要求同步 `.env.example`。这次靠用户同意后只追加不读取解决。以后涉及 `.env.example` 的任务要预先说明这一点。

## 结论

- [x] 集成完成(越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明(9.1 为上线后条目,已在 plan「未映射条目」声明)
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff

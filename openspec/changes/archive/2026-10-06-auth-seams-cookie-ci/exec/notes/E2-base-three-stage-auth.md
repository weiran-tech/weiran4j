# E2: base-three-stage-auth

## 完成的 tasks.md 条目

- `2.1` `2.2` `2.3` 领域端口 / `findAuthState` / api 契约
- `3.1` `3.2` `3.3` `3.4` JWT `iss`/`aud`、仓储实现、分发器三段、`authenticate`
- `3.5` 配置键(`application.yml`、`application-test.yml`、`config/application-local.yml.example`、`.env.example` 末尾追加)
- `4.1` `4.2` 登录 / 登出 Controller
- `7.2` `7.3` base 单测与集成测试

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-base-domain/.../auth/{TokenVerifier,TokenIssuerReader,IdentityResolver,PermissionSource,VerifiedToken,PrincipalSnapshot,AuthState}.java` | 新增 | 端口与值对象,只用 JDK 与 JSpecify |
| `weiran-base-domain/.../auth/TokenCodec.java` | 改造 | 去掉 `parse`,只剩签发 |
| `weiran-base-domain/.../user/UserRepository.java` | 改造 | `findAuthState(id)` |
| `weiran-base-api/.../auth/{AuthService,LoginResult}.java`、`AuthenticatedUser.java` | 改造/新增 | `authenticate`;`LoginResult` 加 `userId` |
| `weiran-base-application/.../auth/{DispatchingTokenAuthenticator,LocalIdentityResolver,LocalRbacPermissionSource}.java` | 新增 | 三段式 |
| `weiran-base-application/.../auth/SystemTokenAuthenticator.java` | 删除 | 被三段式取代 |
| `weiran-base-application/.../auth/AuthSnapshotCache.java` | 改造 | 只缓存 `PrincipalSnapshot` |
| `weiran-base-application/.../auth/AuthApplicationService.java` | 改造 | `authenticate`;`login` 复用 |
| `weiran-base-application/.../autoconfigure/SystemApplicationAutoConfiguration.java` | 改造 | `@Import` 列表 |
| `weiran-base-infrastructure/.../security/{JwtTokenCodec,AuthJwtProperties,JwtIssuerReader,SystemSecurityProperties}.java` | 改造/新增 | 同一实例实现 `TokenCodec` + `TokenVerifier`;`requireIssuer` / `requireAudience` |
| `weiran-base-infrastructure/.../persistence/MybatisUserRepository.java` | 改造 | `findAuthState` 只 select 两列 + id |
| `weiran-base-infrastructure/.../autoconfigure/SystemInfrastructureAutoConfiguration.java` | 改造 | 单个 `JwtTokenCodec` Bean;`TokenIssuerReader` Bean |
| `weiran-base-adapter/.../web/AuthController.java`、`response/{LoginResponse,package-info}.java` | 改造/新增 | `X-Auth-Mode` 切换;Cookie 下发与清除 |
| `weiran-app/src/main/resources/application.yml`、`src/test/resources/application-test.yml`、`weiran4j/config/application-local.yml.example` | 改造 | 新配置键 |
| 测试:`JwtTokenCodecTest`(改)、`DispatchingTokenAuthenticatorTest` / `LocalIdentityResolverTest` / `AuthApplicationServiceTest`(新)、`IntegrationTestSupport` / `AuthIT`(改)、`CookieAuthIT`(新) | — | 见 tasks 7.2 / 7.3 |

## 为什么这么做

- 关键决策:
  - `JwtTokenCodec` 只注册一个 Bean:Spring 按实际类型匹配,若再注册 `TokenCodec`、`TokenVerifier` 两个别名 Bean,分发器按类型收集会拿到同一实例的多份。分发器对「同一实例重复出现」也做了容错。
  - 读 `iss` 放在 infrastructure(`JwtIssuerReader`,用 Jackson),domain 只定义端口,保持 CP-1。
  - **契约调整(已记入 plan §4「契约变更记录」)**:design 里 `LoginResult.accessToken` 为可空;实现时改为 api 层保持非空(登录成功总有令牌),由 adapter 新增 `LoginResponse`(`@JsonInclude(NON_NULL)`)控制 JSON 形状,使 Cookie 模式下 `accessToken` **字段不存在**,与 spec FR-010 判据「`$.data.accessToken` 不存在」字面一致,也免得 api 模块依赖 Jackson 注解。HTTP 契约不变。
- 考虑过但放弃的方案 + 放弃理由:
  - 依赖全局 Jackson 配置省略 null:会影响全站所有响应的形状。
  - `login` 不再查一次用户:`authenticate` 只返回 id 与用户名,签发需要 `tokenVersion`;多一次主键查询换 api 契约干净,可接受。

## 依赖的契约

- plan §4:`AuthCookies.issue/clear`、`AUTH_MODE_HEADER`、Cookie 属性、`TokenAuthenticator` SPI、配置键、40302(IT 断言)。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 是否可能影响其他单元 |
|---|---|---|---|
| `weiran4j/config/application-local.yml`(gitignore,本机文件) | 配置键改名后本机 `bootRun` 读不到 JWT 密钥会启动失败,AC-20 真实浏览器验证需要它 | 必要连带(仅改键路径 `weiran.system.jwt` → `weiran.auth.jwt` 并加 `cookie.secure: false`,未读取、未改动密钥值;不进版本库) | 否 |
| `openspec/state/bizs/sys_user.md`、`AGENTS.md`、`openspec/rules/advisory/components.md` | 「改了字段 / 动作就同步现状文档」(AGENTS.md state ④);components.md 里描述的 `tokenUserId` 已删除 | 必要连带(由 orchestrator 在 E2/E3 收尾时改) | 否 |

## 埋的坑 / 遗留

- [x] `weiran4j/.env.example`:会话权限规则禁止读取 `.env*`,经用户同意后以「只追加、不读取」的方式在文件末尾加了 `WEIRAN_JWT_ISSUER` / `WEIRAN_JWT_AUDIENCE` / `WEIRAN_COOKIE_SECURE` 一段(`git diff` 确认只有 7 行新增)。文件其余部分仍是重写前的内容,属于存量问题 artifact.md#09,本次不动。
- [ ] `findAuthState` 让每个已认证请求多一次主键查询;已写进 artifact.md#02 与 sys_user.md。

## 自测结果

- `./gradlew spotlessApply :weiran-base-*:check :weiran-app:test --no-daemon -q`:通过;集成测试 6 个类 39 条全绿(`CookieAuthIT` 7 条)。

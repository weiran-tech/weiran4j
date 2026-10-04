# E01–E28: 实现记录（单执行者串行）

## 完成的 tasks.md 条目

- `2.1`–`2.7`、`3.1`–`3.14`、`4.1`–`4.4`、`5.1`–`5.5`、`6.2`
- 未完成：`6.1`（发布动作）、`7.1`（上线后）

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-cqt-domain/.../portal/{PortalTokenCodec,PortalTokenClaims}.java` | 改造 / 新增 | 令牌带版本；`ttl()`（E01） |
| `weiran-cqt-domain/.../account/**` | 新增 | `Account`（注册校验、改资料规则）、`Registration`、`RegistrationForm`、`ProfileChanges`、`Credentials`、`CredentialType`、`Phones`、`AccountTypes`、`AccountRepository`、`PasswordHasher`（E02/E05–E07） |
| `weiran-cqt-domain/.../region/**`、`.../sms/**` | 新增 | 赛区与验证码规则、端口（E02/E08） |
| `weiran-cqt-api/.../{error,account,sms,region,portal}/**` | 新增 | `CqtErrors` 与服务接口、命令、视图（E03） |
| `weiran-cqt-infrastructure/.../db/migration/cqt/V20261004100{0,1}__*.sql` | 新增 | E04 |
| `weiran-cqt-infrastructure/.../persistence/**` | 新增 | 账号 / 赛区 DO、Mapper、仓储（E09） |
| `weiran-cqt-infrastructure/.../security/{BCryptPasswordHasher,JjwtPortalTokenCodec}.java` | 新增 / 改造 | E10/E11 |
| `weiran-cqt-infrastructure/.../sms/{CaffeineSmsCodeStore,DevSmsSender}.java` | 新增 | E12 |
| `weiran-cqt-infrastructure/.../autoconfigure/{CqtProperties,CqtInfrastructureAutoConfiguration}.java`（删 `CqtJwtProperties`）、`application-biz.yml`、`build.gradle.kts` | 改造 | E13 |
| `weiran-cqt-application/.../{account,sms,region,portal}/**`、`autoconfigure` | 新增 / 改造 | E15–E21 |
| `weiran-cqt-application/src/test/.../SmsApplicationServiceTest.java` | 新增 | spec「短信服务未配置」的判据要求应用服务单测 |
| `weiran-cqt-adapter/.../portal/{AuthController,CompetCategoryController,PortalParams}.java`、`request/**`；`PortalAuthInterceptor`、`CqtAdapterAutoConfiguration` | 新增 / 改造 | E22–E25 |
| `weiran-app/src/test/.../{CqtIntegrationTestSupport,CqtAccountIT}.java`；`CqtWebIT.java`；`application-biz-test.yml` | 新增 / 改造 | E26/E27（下游自有测试文件） |
| `scripts/biz/import/{cqt_regions,cqt_portal_accounts}.sql` | 新增 | E14 |
| `AGENTS.biz.md`、`openspec/state/bizs/{cqt_portal_accounts,cqt_regions,README.biz}.md` | 新增 / 改造 | E28 |

## 为什么这么做

- **格式校验先于消耗验证码**：注册在 `Account.validate` 做完类型 / 名称 / 手机号 / 密码 / 证件校验之后才调用 `SmsService.verify`；重置密码先校验两次密码。
  否则用户填错身份证也会白白用掉一次验证码，再发要等 60 秒冷却。
- **账号不存在时也算一次 BCrypt**（`dummyHash`）：让「不存在」与「密码错」耗时相近，补齐 CP-10 在时间侧信道上的空隙。
- **`updateProfile` 不写 `password_hash` / `token_version`**：两列在 DO 上留 null，`updateById` 跳过；否则改资料与重置密码并发时，改资料会把旧版本写回去，旧令牌复活。
  `resetPasswordByPhone` 用 SQL 原子自增 `token_version = token_version + 1`。
- **领域层不依赖 `weiran-cqt-api`**（CP-1 只许依赖 `weiran-common`）：领域规则抛 `BizException.badRequest(提示语)`；需要 `CqtErrors` 的判定在应用层。
  因此契约冻结表里的 `PHONE_NOT_CHANGEABLE(40021)` 没有建（改手机号由领域规则抛 400，前台 code 同为 400），见变更记录。
- **数字类入参按字符串接收**（`PortalParams.integer`）：uniapp 的 `cities` 常为空串，学校注册的 `type` 是字符串 `"2"`。
- **`commitment-template-url` 用 `@Value` 注入应用服务**：应用层看不到 infrastructure 的 `CqtProperties`，这个值只有一个消费方，不值得为它加端口。
- **开发模式短信用 `@ConditionalOnProperty(mode=dev)` 注册**：`disabled` 时容器里没有 `SmsSender`，应用服务经 `ObjectProvider` 判空返回 503，与 FastAPI 的 `SMS_PROVIDER=disabled` 行为一致。
- 放弃：验证码存数据库表——单实例部署下内存足够，端口化后换实现不影响调用方。
- 放弃：给 `phone_value` 加唯一索引——旧数据 3495 个号码重复（导入实测），加不上。

## 依赖的契约

- `exec/plan.md` 第 4 节全部契约。变更：`SmsCode` 加 `failedAttempts`（用户确认的「输错 5 次作废」，实现前已记入变更记录）；
  `PortalTokenCodec` 增加 `ttl()`（登录结果要返回 `expires_in`，应用层只能从令牌端口取）；`CqtErrors` 不含 `PHONE_NOT_CHANGEABLE`（见上）。

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| `weiran-cqt-application/.../setting/SiteConfigApplicationService.java` | 未改，仅 `CqtApplicationAutoConfiguration` 的 `@Import` 列表追加新服务 | — | 否 |
| `CqtJwtProperties.java` 删除，并入 `CqtProperties` | `weiran.cqt.*` 下新增 sms 等配置，统一一个属性类避免同前缀两个 `@ConfigurationProperties` | 必要连带 | 否（只有 infrastructure 自动配置引用） |

## 埋的坑 / 遗留

- [ ] 旧数据手机号重复 → `cqt_portal_accounts.md#01`
- [ ] 注册并发窗口 → `cqt_portal_accounts.md#02`
- [ ] 无前台登录日志与密码登录失败限制 → `cqt_portal_accounts.md#03`
- [ ] 中文乱码 → `cqt_portal_accounts.md#04` / `cqt_setting.md#01`
- [ ] 短信服务商未接入，账号功能不能上线 → `cqt_portal_accounts.md#05`

## 自测结果

- 命令：各 `weiran-cqt-*` 模块 `check`；`./gradlew :weiran-app:test --tests 'com.weiran.app.Cqt*'`
- 结果：全部通过；`CqtAccountIT` 9/9、`CqtWebIT` 7/7；领域单测 `CredentialTest` 5、`AccountTest` 6、`SmsCodePolicyTest` 3；`SmsApplicationServiceTest` 2；`JjwtPortalTokenCodecTest` 5
- 导入脚本（E14）：一次性 MySQL 8.4 容器，源表取自 `cqtxj2026.sql`；建表后执行两遍：赛区 34/34、账号 76844/76844；
  第一遍后把一个账号的 `token_version` 改为 5，第二遍后仍为 5（不覆盖）；`credential_type` 推断为 ID_CARD 69983、OTHER 6861；
  全部 `password_hash` 均为 BCrypt 前缀；按手机号查询走 `idx_phone`；3495 个手机号对应多个账号。

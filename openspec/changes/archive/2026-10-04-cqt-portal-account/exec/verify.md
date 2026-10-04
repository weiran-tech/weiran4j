---
title: "cqt-portal-account 集成与规格一致性"
status: "done"
updated_at: "2026-10-04"
---

# Verify

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成
**执行单元数**:28 个（E01–E28，单执行者串行；`E19` 等编号见 plan）

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全（合并为 `notes/E-all-实现记录.md`，按 plan 第 8 节约定）
- [x] Layer 0 已完成；契约有 3 处变更，均已记入 plan 第 4 节变更记录（见下「不一致项」#1）
- [x] 自测通过

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| BCrypt 包装 | 基座 `BCryptPasswordHasher` 与本次 `weiran-cqt-infrastructure` 同名类 | 两份都保留 | — | ☐ 宪法 CP-13 禁止业务依赖基座实现，约 20 行，知情接受 |
| 前台响应断言 `assertPortalOk` / `assertPortalError` | 原在 `CqtWebIT` | 上移到 `CqtIntegrationTestSupport` | `CqtWebIT` 内的私有副本 | ☑ |
| `CqtJwtProperties` 与新增 sms 配置 | 同前缀 `weiran.cqt` 两个属性类 | 合并为 `CqtProperties` | `CqtJwtProperties` | ☑ |

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 验证码存数据库表 / Redis | design | 单实例部署，端口化后可替换 |
| `phone_value` 加唯一索引 | notes | 旧数据 3495 个号码重复（导入实测），加不上 |
| 领域层抛 `CqtErrors.PHONE_NOT_CHANGEABLE` | plan 契约 | 领域不得依赖 api（CP-1）；前台 code 同为 400，改用 `BizException.badRequest` |
| 先消耗验证码再校验格式（FastAPI 顺序） | 参考实现 | 格式错误会白白用掉验证码并触发 60 秒冷却 |
| 应用层读 `CqtProperties` 取模板链接 | design | 应用层看不到 infrastructure；单一消费方，用 `@Value` 注入 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `CqtJwtProperties.java`（删除，并入 `CqtProperties`） | `E13` | 必要连带 | 保留 |
| `CqtWebIT.java`（令牌用例改为基于真实账号） | `E27` | 计划内（tasks 5.4） | 保留 |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿 | `evidence/build.log` |
| test | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿 | `evidence/test.log` |
| lint | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿 | `evidence/lint.log` |

代码全部改完后运行，退出码均 0。`weiran-app` 集成测试 48 个（`AuthIT` 9、`UserRoleIT` 10、`CqtAccountIT` 9、`CqtWebIT` 7、`PreferencesIT` 7、`PlatformIT` 4、`TreeIT` 2）0 失败 0 跳过；
`:weiran-app:jacocoTestCoverageVerification`（跨模块聚合行覆盖 70%）与 `:weiran-cqt-domain` 覆盖率门禁通过；前端 225 个测试通过。无红灯。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 2.1 | `E01` | `domain/portal/{PortalTokenCodec,PortalTokenClaims}.java` | ☑ |
| 2.2 | `E05` | `domain/account/{Credentials,CredentialType}.java` | ☑ |
| 2.3 | `E06` | `domain/account/{Account#validate,Registration,RegistrationForm,AccountTypes}.java` | ☑ |
| 2.4 | `E07` | `domain/account/Account#applyProfileChanges` | ☑ |
| 2.5 | `E08` | `domain/sms/SmsCodePolicy.java` | ☑ |
| 2.6 | `E02` | `domain/{account/AccountRepository,account/PasswordHasher,region/RegionRepository,sms/SmsSender,sms/SmsCodeStore}.java` | ☑ |
| 2.7 | `E03` | `api/{error/CqtErrors,account/*,sms/*,region/*,portal/PortalAuthService}.java` | ☑ |
| 3.1 | `E04` | `V202610041000__cqt_portal_accounts.sql`、`V202610041001__cqt_regions.sql` | ☑ |
| 3.2 | `E09` | `infrastructure/persistence/{MybatisAccountRepository,MybatisRegionRepository}.java` 等 | ☑ |
| 3.3 | `E10` | `infrastructure/security/BCryptPasswordHasher.java` | ☑ |
| 3.4 | `E11` | `infrastructure/security/JjwtPortalTokenCodec.java` | ☑ |
| 3.5 | `E12` | `infrastructure/sms/{CaffeineSmsCodeStore,DevSmsSender}.java` | ☑ |
| 3.6 | `E13` | `CqtProperties`、`application-biz.yml` | ☑ |
| 3.7 | `E15` | `application/sms/SmsApplicationService.java` | ☑ |
| 3.8 | `E16` | `AccountApplicationService#login/autologin` | ☑ |
| 3.9 | `E17` | `AccountApplicationService#register` | ☑ |
| 3.10 | `E18` | `AccountApplicationService#profile/updateProfile` | ☑ |
| 3.11 | `E19` | `AccountApplicationService#resetPassword` + `CqtPortalAccountMapper#resetPasswordByPhone` | ☑ |
| 3.12 | `E20` | `application/portal/PortalAuthApplicationService.java` | ☑ |
| 3.13 | `E21` | `RegionApplicationService`、`AccountApplicationService#commitmentTemplateUrl` | ☑ |
| 3.14 | `E14` | `scripts/biz/import/{cqt_regions,cqt_portal_accounts}.sql` | ☑ |
| 4.1 | `E22` | `adapter/portal/PortalAuthInterceptor.java` | ☑ |
| 4.2 | `E23` | `adapter/portal/{AuthController,PortalParams}.java`、`request/**` | ☑ |
| 4.3 | `E24` | `adapter/portal/CompetCategoryController.java` | ☑ |
| 4.4 | `E25` | 三个 `@AutoConfiguration` | ☑ |
| 5.1 | `E05`–`E08` | `CredentialTest`(5)、`AccountTest`(6)、`SmsCodePolicyTest`(3)；另 `SmsApplicationServiceTest`(2) | ☑ |
| 5.2 | `E11` | `JjwtPortalTokenCodecTest`(5) | ☑ |
| 5.3 | `E26` | `CqtAccountIT`(9) | ☑ |
| 5.4 | `E27` | `CqtWebIT`(7) | ☑ |
| 5.5 | `E14` | notes：容器两遍执行 | ☑ |
| 6.2 | `E28` | `AGENTS.biz.md`、`state/bizs/*` | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 6.1 | 发布动作，合并后在部署环境执行 | ☑ |
| 7.1 | 上线后条目 | ☑ |

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法对照 CP-8 | BCrypt（兼容 `$2y$`）；`token_version` + `ver`；重置密码递增 | 同；`updateProfile` 不写版本列，防并发回写 | ☑ |
| 宪法对照 CP-10 | 登录失败同码同提示 | 同；另加不存在账号时的哑 BCrypt（见不一致项 #2） | ☑ |
| 宪法对照 CP-1 | 领域只依赖 `weiran-common` | 同（导致契约变更 #1 之 `PHONE_NOT_CHANGEABLE` 去掉） | ☑ |
| Data Flow 1–7 | 发送 / 校验 / 登录 / 注册 / 认证 / 改资料 / 重置密码的顺序 | 同；注册与重置密码「格式校验 → 验证码 → 查重 / 写库」 | ☑ |
| API Design | 9 个接口、字段名照 uniapp、数字入参宽松解析、未知字段忽略 | 同 | ☑ |
| API Design 错误码表 | 7 个 `CqtErrors` | 6 个（去掉 40021，见不一致项 #1） | ☑ |
| Database Design | 两张表、两个前缀索引、导入加工与不覆盖 `token_version` | 同；`EXPLAIN` 确认走 `idx_phone` | ☑ |
| 分层与装配 | `CqtProperties`；`SmsSender` 按 `mode=dev` 条件注册；`@Transactional` | 同 | ☑ |
| Test Plan | 单元 + 集成 + 导入手工 + 全量门禁 | 同 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| cqt-portal-api FR-003 / 签发后可解析回账号 ID | `(42, 3)` 往返 | `JjwtPortalTokenCodecTest.roundTrip` | ☑ |
| cqt-portal-api FR-003 / 过期与错误类型的令牌无效 | 过期 / 错 typ / 缺 ver 为空 | `JjwtPortalTokenCodecTest.{rejectsExpired,rejectsWrongTypeOrMissingVersion}` | ☑ |
| cqt-portal-api FR-003 / 密钥过短时启动失败 | 含 `WEIRAN_CQT_JWT_SECRET` | `JjwtPortalTokenCodecTest.rejectsShortSecret` | ☑ |
| cqt-portal-api FR-004 / 无令牌访问需登录接口 | 200 + 401 + 「请求参数缺token」 | `CqtWebIT.requiresPortalToken` | ☑ |
| cqt-portal-api FR-004 / 无效令牌访问需登录接口 | 格式错 / 账号不存在 / 版本过时 → 401 | `CqtWebIT.requiresPortalToken`；重置后旧令牌见 `CqtAccountIT.resetPassword` | ☑ |
| cqt-portal-api FR-004 / 有效令牌访问需登录接口 | `data` = 账号 ID | `CqtWebIT.requiresPortalToken` | ☑ |
| cqt-portal-api FR-004 / 前后台令牌互不通用 | 401/40100 与 200/401 | `CqtWebIT.portalAndAdminTokensAreSeparate` | ☑ |
| cqt-sms-verification FR-001 / 手机号格式错误 | 400 | `CqtAccountIT.sendSms` | ☑ |
| cqt-sms-verification FR-001 / 60 秒内重复发送 | 429 | `CqtAccountIT.sendSms` + `SmsCodePolicyTest.cooldown` | ☑ |
| cqt-sms-verification FR-001 / 短信服务未配置 | `50320` | `SmsApplicationServiceTest.notConfigured` | ☑ |
| cqt-sms-verification FR-002 / 验证码一次性 | 第二次 401 | `CqtAccountIT.resetPassword` + `SmsApplicationServiceTest` | ☑ |
| cqt-sms-verification FR-002 / 输错 5 次后作废 | 第 6 次正确码仍 401 | `SmsCodePolicyTest.oneTimeAndAttemptLimit` + `CqtAccountIT.resetPassword` | ☑ |
| cqt-sms-verification FR-002 / 验证码过期 | 10 分钟后失败 | `SmsCodePolicyTest.expires` | ☑ |
| cqt-sms-verification FR-003 / 回显验证码 | `data.code` 为 6 位数字 | `CqtAccountIT.sendSms` | ☑ |
| cqt-region FR-001 / 导入脚本从原库迁入 | 34/34、重复执行不变 | 手工（notes） | ☑ |
| cqt-region FR-002 / 返回赛区列表 | `{id:15,pid:0,name:河北,code}` | `CqtAccountIT.linkInfoAndRegions` | ☑ |
| cqt-account FR-001 / 旧库哈希可以登录 | `$2y$10$` 可 autologin | `CqtAccountIT.legacyHashLogin` | ☑ |
| cqt-account FR-001 / 导入脚本可重复执行 | 76844/76844、`token_version` 不被覆盖 | 手工（notes） | ☑ |
| cqt-account FR-002 / 验证码登录成功 | 令牌可访问 userinfo | `CqtAccountIT.login` | ☑ |
| cqt-account FR-002 / 账号不存在与密码错误不可区分 | 同为 400「手机号或密码错误」 | `CqtAccountIT.login` | ☑ |
| cqt-account FR-002 / 验证码错误 | 401 | `CqtAccountIT.login` | ☑ |
| cqt-account FR-003 / 个人注册后可自动登录 | status 0 | `CqtAccountIT.registerPersonalAndProfile` | ☑ |
| cqt-account FR-003 / 学校注册后审核中 | status 1 | `CqtAccountIT.registerSchoolPending` | ☑ |
| cqt-account FR-003 / 重复手机号与证件号 | 两个 409 | `CqtAccountIT.registerConflicts` | ☑ |
| cqt-account FR-003 / 身份证校验 | 三种提示 | `CredentialTest.rejectsInvalidIdCard` + `CqtAccountIT.registerConflicts`（校验位） | ☑ |
| cqt-account FR-004 / 返回字段集 | 20 个字段、`cityname` | `CqtAccountIT.registerPersonalAndProfile` | ☑ |
| cqt-account FR-005 / 白名单外字段被忽略 | 驳回原因、状态、类型不变 | `CqtAccountIT.updateProfile` + `AccountTest.phoneCannotChange` | ☑ |
| cqt-account FR-005 / 不允许改手机号 | 400 + 库中不变 | `CqtAccountIT.updateProfile` | ☑ |
| cqt-account FR-005 / 驳回的学校改资料后回到审核中 | 2 → 1 | `CqtAccountIT.updateProfile` + `AccountTest.rejectedSchoolBackToPending` | ☑ |
| cqt-account FR-006 / 重置后旧令牌失效 | 旧令牌 401、新密码可登录 | `CqtAccountIT.resetPassword` | ☑ |
| cqt-account FR-007 / 返回配置的链接 | 等于配置值 | `CqtAccountIT.linkInfoAndRegions` | ☑ |

interview 验收标准：AC-1 ☑（503 由应用单测覆盖）、AC-2 ☑、AC-3 ☑、AC-4 ☑、AC-5 ☑（两次密码 / 少于 6 位由 `AccountTest.validatesRegistration` 覆盖）、AC-6 ☑、AC-7 ☑、AC-8 ☑、AC-9 ☑、AC-10 ☑、AC-11 ☑、AC-12 ☑。

## 越界检查

`git status` 的文件集全部落在 plan 第 5 节「拥有」范围内：`weiran4j/weiran-cqt/**`、`weiran-app/src/test/java/com/weiran/app/Cqt*`、`weiran-app/src/test/resources/application-biz-test.yml`、
`scripts/biz/import/**`、`AGENTS.biz.md`、`openspec/state/bizs/{cqt_portal_accounts,cqt_regions,README.biz}.md`、本 change 目录。未改任何上游已有文件（`upstream-boundary.sh` 无拦截）。

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| 无差集 | — | — | — | — |

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | 契约冻结后 3 处变更：`SmsCode` 加 `failedAttempts`（用户确认的新增需求）、`PortalTokenCodec` 加 `ttl()`、`CqtErrors` 去掉 `PHONE_NOT_CHANGEABLE` | **spec 表述模糊,实现合理** | 均为模块内契约，spec 行为不变（改手机号仍是 400 + 同一提示）；已记入 plan 变更记录 |
| 2 | 账号不存在时额外计算一次 BCrypt（哑哈希），design 未写 | **spec 表述模糊,实现合理** | CP-10 的时间侧信道补强，不改变任何可观测响应；记在 notes |
| 3 | `cqt-sms-verification` FR-002「输错 5 次作废」在 L3 审批后加入 | 非实现偏离 | 实现前经用户明确确认（interview 澄清记录 #7），spec / tasks / plan 同步更新 |

## 遗留问题

- [x] 旧数据 3495 个手机号对应多个账号 → 已登记 `cqt_portal_accounts.md#01`
- [x] 注册并发窗口 → 已登记 `cqt_portal_accounts.md#02`
- [x] 无前台登录日志、密码登录无失败次数限制 → 已登记 `cqt_portal_accounts.md#03`
- [x] 导入数据中文乱码 → 已登记 `cqt_portal_accounts.md#04`（同 `cqt_setting.md#01`）
- [x] 短信服务商未接入，账号功能不能上线 → 已登记 `cqt_portal_accounts.md#05`，并写入 `AGENTS.biz.md`
- [x] BCrypt 包装在基座与下游各一份 → 知情接受（CP-13）

## 流程反馈

- L3 审批后、实现前发现安全缺口（验证码无输错上限），处理方式：停下问人 → 更新 interview / spec / tasks / plan 契约变更记录。可以考虑在 explore 模板「风险预警」里加一条「凭验证码 / 令牌做身份证明的流程，检查暴力枚举」。

## 结论

- [x] 集成完成(单执行单元时:越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff ｜ ☐ 打回 L5 ｜ ☐ 打回 L2

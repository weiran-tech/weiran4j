---
title: "cqt-sms-aliyun 集成与规格一致性"
status: "done"
updated_at: "2026-10-05"
---

# Verify

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成
**执行单元数**:13 个（E01–E13，单执行者串行；`E12` 人工真实发送待用户执行，见下）

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全（合并为 `notes/E-all-实现记录.md`）
- [x] Layer 0 已完成且契约未再变动（plan 第 4 节无变更记录）
- [x] 自测通过

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| 无 | — | — | — | — |

（IP 上限判定只在 `SmsCodePolicy.ipLimitReached` 一处；计数只在 `SmsIpCounter` 实现里。）

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 自签名 HTTP（不加依赖，签名算法已用官方样例验证） | interview | 用户选官方 SDK，并借此推动上游开依赖版本扩展点（D-013） |
| 用框架 `ClientIpResolver` 取客户端 IP | explore | 直接信任可伪造的 `X-Forwarded-For`，换个头即可绕过限流 |
| 发送失败保留验证码 | interview | 会占用 60 秒冷却，用户没收到短信也要等 |
| SDK 自动重试 | explore | 阿里云 SendSms 不幂等，重试可能重复发短信 |
| 发送失败也计入 IP 上限 | design | 阿里云只对成功发送计费；失败计数会让用户因服务商故障被锁 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `openspec/specs/README.md`（合并上游的生成索引冲突，重新生成） | `E01` | 必要连带 | 保留（已在合并提交 `c3866c9` 中） |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿 | `evidence/build.log` |
| test | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿 | `evidence/test.log` |
| lint | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿 | `evidence/lint.log` |

代码全部改完后运行，退出码均 0。`weiran-app` 集成测试 49 个（含 `CqtSmsLimitIT` 1、`CqtAccountIT` 9、`CqtWebIT` 7）0 失败 0 跳过；
`:weiran-app:jacocoTestCoverageVerification` 通过；`:weiran-app:verifyFrameworkVersions` 通过（运行时模块 118 个，框架已管理 80 个，本下游清单未写白名单）；前端 225 个测试通过。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 0.1 | `E01` | 合并提交 `c3866c9`；`weiran4j/weiran-dependencies/biz-dependencies.gradle.kts` | ☑ |
| 2.1 | `E02` | `domain/sms/{SmsSendOutcome,SmsSender}.java` | ☑ |
| 2.2 | `E03` | `domain/sms/SmsIpCounter.java`、`SmsCodePolicy#ipLimitReached` | ☑ |
| 2.3 | `E04` | `api/sms/SmsService#send(phone, clientIp)`、`CqtErrors.SMS_SEND_FAILED` | ☑ |
| 3.1 | `E05` | `application/sms/SmsApplicationService#send` | ☑ |
| 3.2 | `E06` | `infrastructure/sms/{AliyunSmsSender,AliyunSmsGateway,SdkAliyunSmsGateway}.java` | ☑ |
| 3.3 | `E07` | `CqtProperties.Aliyun`、`AliyunSmsSender#requireComplete`、`CqtInfrastructureAutoConfiguration#aliyunSmsSender` | ☑ |
| 3.4 | `E08` | `infrastructure/sms/CaffeineSmsIpCounter.java` | ☑ |
| 3.5 | `E09` | `application-biz.yml`（阿里云占位、`ip-hourly-limit`、`forward-headers-strategy: native`）、`DevSmsSender` | ☑ |
| 4.1 | `E10` | `AuthController#sendSms` | ☑ |
| 5.1 | `E03`/`E05` | `SmsCodePolicyTest.ipLimit`、`SmsApplicationServiceTest`（5） | ☑ |
| 5.2 | `E06`–`E08` | `AliyunSmsSenderTest`（4）、`CaffeineSmsIpCounterTest`（1） | ☑ |
| 5.3 | `E11` | `CqtSmsLimitIT`；`application-biz-test.yml` 上限 1000 | ☑ |
| 6.2 | `E13` | `AGENTS.biz.md`、`cqt_portal_accounts.md`（#05 关闭） | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 5.4 人工真实发送 | 需用户在本机用真实凭据执行；用户要求先出 verify，结果在 L9 前补记到本节 | ☑ |
| 6.1 控制台准备与部署环境变量 | 发布动作，由用户完成 | ☑ |
| 7.1 验收记录 | 上线后条目 | ☑ |

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法对照 CP-4 | SDK 版本只在下游清单，业务模块不写版本 | `biz-dependencies.gradle.kts` 登记 `4.6.0`；`implementation("com.aliyun:dysmsapi20170525")` | ☑ |
| 宪法对照 CP-6 | 捕获 `Exception` 只在一处并写理由 | `AliyunSmsSender#send` 一处，`@SuppressWarnings("IllegalCatch")` 带理由注释；`SdkAliyunSmsGateway` 构造器为启动期转换 | ☑ |
| 宪法对照 CP-9 | Secret 不进日志与异常 | 配置缺失信息只列变量名（单测断言不含 Secret 值）；SDK 异常只记类名 | ☑ |
| Data Flow 2 | 号码冷却 → IP 上限 → 生成存储 → 发送 → 按结果回滚 / 映射 / 计数 | 同 | ☑ |
| Data Flow 3/4 | 模板参数 JSON、返回码分类、`autoretry=false`、超时 | 同；另 `maxAttempts=1` | ☑ |
| 分层与装配 | `mode=aliyun` 条件注册；IP 计数总注册；`forward-headers-strategy: native` | 同 | ☑ |
| Test Plan | 单元 + `CqtSmsLimitIT` + 人工 + 全量门禁 | 人工待执行，其余完成 | ☑（人工见未实现条目） |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| FR-001 / 手机号格式错误 | 400 | `CqtAccountIT.sendSms` | ☑ |
| FR-001 / 60 秒内重复发送 | 429 | `CqtAccountIT.sendSms` | ☑ |
| FR-001 / 短信服务未配置 | 50320 | `SmsApplicationServiceTest.notConfigured` | ☑ |
| FR-001 / 发送失败后可立即重发 | 首次 50321、再发成功、旧码不可用 | `SmsApplicationServiceTest.failureRollsBack` | ☑ |
| FR-001 / 服务商频控与号码非法 | 42920 / 400「手机号格式不正确」 | `SmsApplicationServiceTest.mapsProviderOutcomes` | ☑ |
| FR-002 全部场景（未修改） | — | 既有测试全绿 | ☑ |
| FR-003 / 回显验证码（未修改） | — | `CqtAccountIT.sendSms` | ☑ |
| FR-004 / 请求参数与成功判定 | 四个参数、`{"code":"123456"}`、不回显 | `AliyunSmsSenderTest.buildsRequestAndSucceeds` | ☑ |
| FR-004 / 失败分类 | 频控 / 号码非法 / 其它码 / 异常 | `AliyunSmsSenderTest.classifiesFailures` | ☑ |
| FR-004 / 配置不全启动失败 | 含变量名、不含 Secret | `AliyunSmsSenderTest.rejectsIncompleteConfig` | ☑ |
| FR-005 / 超出上限 | 上限 3 时第 4 次 429 且不调发送 | `SmsApplicationServiceTest.ipHourlyLimit` | ☑ |
| FR-005 / 不同 IP 互不影响 | 另一 IP 成功 | `SmsApplicationServiceTest.ipHourlyLimit` + `CqtSmsLimitIT` | ☑ |
| FR-005 / 按可信代理转发的真实 IP 计数 | 上限 2，同 XFF 第 3 次 429、另一 XFF 200 | `CqtSmsLimitIT.limitsPerForwardedClientIp` | ☑ |

interview 验收标准：AC-1 ☑（假网关）、AC-2 ☑、AC-3 ☑、AC-4 ☑、AC-5 ☑（日志语句审查 + 配置缺失单测）、AC-6 ☑、AC-7 ☑、**AC-8 ☐ 待人工**（真实凭据发送）。

## 越界检查

工作区改动全部落在 plan 第 5 节「拥有」范围内：`weiran4j/weiran-cqt/**`、`weiran4j/weiran-dependencies/biz-dependencies.gradle.kts`（上游扩展点指定的下游独占文件）、
`weiran-app/src/test/java/com/weiran/app/CqtSmsLimitIT.java`、`weiran-app/src/test/resources/application-biz-test.yml`、`AGENTS.biz.md`、`openspec/state/bizs/cqt_portal_accounts.md`、本 change 目录。
合并上游的内容在独立的合并提交 `c3866c9` 里，不属本 change 的 diff。`upstream-boundary.sh` 无拦截。

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| 无差集 | — | — | — | — |

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | design 只写 `autoretry=false`，实现另设 `maxAttempts=1` | **spec 表述模糊,实现合理** | 同一意图（不重试）的双保险，记在 notes |
| 2 | `CqtProperties` 首次修改因格式化后文本不匹配未生效，编译阿里云实现时才发现并补上 | 实现过程问题，非不一致 | 已修复，最终代码与 design 一致 |

## 遗留问题

- [x] **AC-8 真实发送未验证** → 用户 L9 决定先归档（2026-10-05），真实发送留到部署时验证；已登记 `cqt_portal_accounts.md#07`
- [x] IP 计数与验证码在进程内，多实例失效 → 已写入 `AGENTS.biz.md`（部署与数据迁移）
- [x] 反向代理不在内网时共用额度 → 已写入 `AGENTS.biz.md`

## 流程反馈

- 下游第一次真实接入第三方 SDK，上游 D-013 的 `verifyFrameworkVersions` 正常工作（未误报）。
- 用 Python 做字符串替换改 Java 源码时，`spotlessApply` 改过的换行会让替换静默落空；之后改已格式化的文件优先用 Edit 工具或先确认匹配。

## 结论

- [x] 集成完成(单执行单元时:越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff（**带条件**：AC-8 真实发送经用户决定延后到部署时验证，登记 `cqt_portal_accounts.md#07`）｜ ☐ 打回 L5 ｜ ☐ 打回 L2

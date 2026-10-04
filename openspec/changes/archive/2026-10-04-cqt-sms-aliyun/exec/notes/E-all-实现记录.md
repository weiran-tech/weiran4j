# E01–E13: 实现记录（单执行者串行）

## 完成的 tasks.md 条目

- `0.1`、`2.1`–`2.3`、`3.1`–`3.5`、`4.1`、`5.1`–`5.3`、`6.2`
- 待人工：`5.4`（真实凭据发送，需用户在本地环境变量提供凭据）
- 未执行：`6.1`（发布动作）、`7.1`（上线后）

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| 合并提交 `c3866c9`（`git merge upstream/main`，上游 `0b6abe1` D-013） | 合并 | 引入下游依赖版本清单扩展点；生成的 `openspec/specs/README.md` 冲突按规则重新生成解决（E01） |
| `weiran4j/weiran-dependencies/biz-dependencies.gradle.kts` | 新增 | 登记 `com.aliyun:dysmsapi20170525:4.6.0`（E01，下游独占文件） |
| `weiran-cqt-domain/.../sms/{SmsSendOutcome,SmsIpCounter}.java`；`SmsSender`、`SmsCodePolicy`（加 `IP_WINDOW`、`ipLimitReached`） | 新增 / 改造 | E02/E03 |
| `weiran-cqt-api`：`SmsService#send(phone, clientIp)`、`CqtErrors.SMS_SEND_FAILED` | 改造 | E04 |
| `weiran-cqt-application/.../sms/SmsApplicationService.java` | 改造 | IP 上限、失败回滚、错误映射、成功才计数（E05） |
| `weiran-cqt-infrastructure/.../sms/{AliyunSmsGateway,SdkAliyunSmsGateway,AliyunSmsSender,CaffeineSmsIpCounter}.java`；`DevSmsSender` | 新增 / 改造 | E06/E08/E09 |
| `CqtProperties`（`Sms` 加 `ipHourlyLimit`、`aliyun`；新 `Aliyun` 记录）、`CqtInfrastructureAutoConfiguration`、`application-biz.yml`、`build.gradle.kts` | 改造 | E07/E09 |
| `weiran-cqt-adapter/.../AuthController#sendSms` | 改造 | 传 `remoteAddr`（E10） |
| 测试：`SmsCodePolicyTest`（+1）、`SmsApplicationServiceTest`（5）、`CaffeineSmsIpCounterTest`（1）、`AliyunSmsSenderTest`（4）、`CqtSmsLimitIT`（1）、`application-biz-test.yml` | 新增 / 改造 | E03/E05/E06/E08/E11 |
| `AGENTS.biz.md`、`openspec/state/bizs/cqt_portal_accounts.md`（#05 关闭） | 改造 | E13 |

## 为什么这么做

- **SDK 隔离在包私有接口 `AliyunSmsGateway` 之后**：`AliyunSmsSender` 的参数组装与返回码分类可以用假网关单测，SDK 只在 `SdkAliyunSmsGateway` 一个类里出现。
- **SDK 初始化异常只带异常类名**：SDK 的异常信息可能回显配置，避免 AccessKey 进日志（CP-9）。发送异常同样只记类名。
- **`autoretry=false`、`maxAttempts=1`**：阿里云文档明确 SendSms 不幂等，重试可能让用户收到两条短信。
- **配置校验在构造 SDK 客户端之前**：`AliyunSmsSender.create` 先 `requireComplete`，信息只列环境变量名。
- **测试配置把 IP 上限放大到 1000**：所有 IT（含上游）都从回环地址请求，默认 10 会让后跑的测试互相影响；上限场景放在单独上下文 `CqtSmsLimitIT`（`@TestPropertySource` 上限 2）。
- **`verifyFrameworkVersions` 通过，无需白名单**：SDK 的传递依赖（okhttp 4.12.0、gson、jackson-databind 2.12 → 被框架拉到 2.21.4）没有把框架依赖拉离框架版本（运行时模块 118 个，框架已管理 80 个）。
- 放弃：自签名 HTTP（用户选官方 SDK）。放弃：用框架 `ClientIpResolver` 取 IP（信任可伪造的头）。

## 依赖的契约

- `exec/plan.md` 第 4 节全部契约，无变更。

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| `openspec/specs/README.md`（合并冲突，重新生成） | 合并上游时生成的能力索引冲突；按规则重新生成，不手工合并 | 必要连带（`upstream-boundary.sh` 已放行该生成文件） | 否 |

## 埋的坑 / 遗留

- [ ] 真实发送未验证（5.4，需用户凭据）
- [ ] IP 计数进程内，多实例失效（已写进 `AGENTS.biz.md`）
- [ ] 反向代理不在内网时所有请求共用代理 IP 的额度（已写进 `AGENTS.biz.md`）

## 自测结果

- 命令：各 `weiran-cqt-*` 模块 `check`；`./gradlew :weiran-app:test --tests 'com.weiran.app.Cqt*'`；`./gradlew :weiran-app:verifyFrameworkVersions --rerun-tasks`
- 结果：全部通过；`CqtAccountIT` 9、`CqtWebIT` 7、`CqtSmsLimitIT` 1；框架版本防护通过

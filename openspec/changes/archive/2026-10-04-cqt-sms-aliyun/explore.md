---
title: "cqt-sms-aliyun 现实校验"
status: "done"
updated_at: "2026-10-04"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-cqt-*` | `domain/sms/{SmsSender,SmsCodeStore,SmsCodePolicy}`、`application/sms/SmsApplicationService`、`infrastructure/sms/**`、`autoconfigure/{CqtProperties,CqtInfrastructureAutoConfiguration}`、`adapter/portal/AuthController#sendSms` | 上一切片的短信端口与开发模式实现，本次在其上加阿里云实现与 IP 限流 |
| `weiran-framework` | `web/ClientIpResolver` | 客户端 IP 的现有解析方式 |
| `weiran-dependencies` | BOM | 新依赖版本登记位置（CP-4） |
| 阿里云文档 | SendSms API、V3 签名机制 | 参数、返回、错误语义 |
| 阿里云 SDK | `com.aliyun:dysmsapi20170525:4.6.0`（Maven Central 最新） | 实际 API 签名 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 短信端口 | `domain/sms/SmsSender.java` | `void send(phone, code)` + `exposesCode()`；无失败语义（开发模式不会失败） |
| 发送用例 | `application/sms/SmsApplicationService.java` | 格式 → 无发送实现 503 → 冷却 429 → 生成并**先存**验证码 → 调发送；发送异常会直接冒泡（已存的验证码不回滚） |
| 发送实现注册 | `CqtInfrastructureAutoConfiguration#devSmsSender` | `@ConditionalOnProperty(mode=dev)` |
| 配置 | `CqtProperties.Sms(mode, exposeCode)` | 无阿里云配置 |
| 发送接口 | `AuthController#sendSms` | 只把 `phone` 传给服务，无 IP |
| 客户端 IP | `weiran-framework/.../ClientIpResolver.java` | 取 `X-Forwarded-For` 第一个 → `X-Real-IP` → `remoteAddr`；类注释：「代理头可以被客户端伪造，这里的结果只用于日志展示，不要拿来做访问控制」 |
| 依赖版本 | `weiran-dependencies/build.gradle.kts` | 唯一出现第三方版本的地方（上游文件）；下游无登记入口 → 已请上游开 `downstream-dependency-versions` |
| SDK | `dysmsapi20170525-4.6.0` | `new Client(com.aliyun.teaopenapi.models.Config)`（`setAccessKeyId/Secret/Endpoint/ConnectTimeout/ReadTimeout`）；`sendSmsWithOptions(SendSmsRequest, RuntimeOptions) throws Exception`；`SendSmsRequest#setPhoneNumbers/SignName/TemplateCode/TemplateParam`；响应 `getBody().getCode()/getMessage()/getRequestId()/getBizId()`；`RuntimeOptions#setAutoretry/MaxAttempts/ConnectTimeout/ReadTimeout`。传递依赖：`tea 1.4.1`、`tea-openapi 0.3.12`、`tea-util 0.2.26`、`openapiutil 0.2.2`、`endpoint-util 0.0.8` |
| 阿里云语义 | SendSms 文档 | 业务错误也是 HTTP 200，`Code != "OK"`；**不支持幂等**（重试可能重复发短信）；建议超时 ≥ 1 秒 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `SmsSender` 端口 + 条件注册 | 上一切片 | 新增 `AliyunSmsSender`，`@ConditionalOnProperty(mode=aliyun)` | 端口需要表达失败分类（见约束） |
| `SmsApplicationService` | 上一切片 | 加 IP 计数、失败回滚与错误映射 | 是 |
| Caffeine | Spring Boot BOM | IP 计数（按小时窗口） | 否 |
| `CqtErrors` | `weiran-cqt-api` | 复用 `SMS_TOO_FREQUENT`(42920)；新增 `SMS_SEND_FAILED`(50321) | 是（新增一个码，号段 20–39） |
| `Phones.mask` | `domain/account` | 日志掩码 | 否 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| `ClientIpResolver` 信任可伪造的转发头 | 其类注释 | 限流不能用它；用 `request.getRemoteAddr()` + `server.forward-headers-strategy: native`（Tomcat `RemoteIpValve` 只信任内网代理，默认 `internalProxies` 为私网段与回环） |
| `forward-headers-strategy` 是全局设置 | Spring Boot | 放在下游 `application-biz.yml`（上游 `application.yml` 未设置此键，不冲突）；会让后台登录日志的 `remoteAddr` 也变成真实 IP，属无害改善 |
| SendSms 不支持幂等 | 阿里云文档 | `RuntimeOptions.autoretry=false`，不做自动重试 |
| 业务错误 HTTP 200 + `Code` | 阿里云文档 | 按 `Code` 分类：`OK` / `isv.BUSINESS_LIMIT_CONTROL` / `isv.MOBILE_NUMBER_ILLEGAL` / 其它 |
| SDK 方法 `throws Exception` | javap | 适配层把所有异常收敛成「发送失败」，不让受检异常穿出 infrastructure |
| CP-4 版本号唯一来源 | 宪法 | **实现阻塞在上游扩展点合入**；本 change 规划可先行 |
| 测试无法真实调用阿里云 | — | 把 SDK 调用包在一个小接口后面，单测用假实现覆盖分类与参数；真实发送为人工验收（AC-8） |
| SDK 的 `Client` 构造即校验配置 | javap（`throws Exception`） | 启动时构造，配置不全提前失败（AC-3） |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran-cqt-domain/sms`：`SmsSender` 返回发送结果（成功 / 频控 / 号码非法 / 失败）；IP 发送计数端口 | 改造 / 新增 |
| `weiran-cqt-api`：`SmsService#send` 增加客户端 IP 参数；`CqtErrors.SMS_SEND_FAILED` | 改造 |
| `weiran-cqt-application/sms/SmsApplicationService`：IP 上限、失败回滚、错误映射 | 改造 |
| `weiran-cqt-infrastructure`：`AliyunSmsSender`（+ SDK 包装接口）、IP 计数实现、`CqtProperties.Sms` 加阿里云与 IP 上限配置、自动配置、`application-biz.yml`、`build.gradle.kts` 加 SDK 依赖（无版本） | 新增 / 改造 |
| `weiran-cqt-adapter/portal/AuthController#sendSms`：传 `remoteAddr` | 改造 |
| 依赖版本登记文件（上游扩展点指定的下游文件） | 新增 |
| 测试：领域 / 应用 / 基础设施单测；`CqtAccountIT` 增 IP 上限用例 | 新增 / 改造 |
| `AGENTS.biz.md`、`state/bizs/cqt_portal_accounts.md`（#05 关闭） | 改造 |

**不会碰的目录**：任何上游已有文件（含 `weiran-dependencies/build.gradle.kts`）、`web/`、`uniapp/`、`weiran-app/src/main/`。

### 共享层命中 ⚠️

<!-- openspec:slot shared-layers -->

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 | 未命中 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 | **间接命中**：新依赖要登记版本，但不改此文件，改由上游扩展点指定的下游文件登记（前置依赖：上游 change `downstream-dependency-versions`） |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 | 未命中 |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 | 未命中 |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) | 未命中 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 | 未命中：新码在 `CqtErrors` |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 | 未命中 |

#### 序号型资源(本仓库暂无)

无 Flyway 脚本。模块内契约变更（`SmsSender` 返回值、`SmsService#send` 参数）被 infrastructure / application / adapter / 测试共同消费，进 Layer 0 冻结。

<!-- /openspec:slot shared-layers -->

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 无 | SendSms 不支持幂等 | 关闭 SDK 自动重试（写入 design） | ☑（属实现约束，interview 结论不变） |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 上游扩展点迟迟不合入 | 上游 change 推进受阻 | 本 change 停在 L3 之后、L5 之前；不在下游临时改上游 BOM |
| 部署时反向代理不在内网 | 代理在公网另一台机器 | `RemoteIpValve` 不信任其转发头，所有请求 IP 都是代理 IP → 全站共用 10 条 / 小时。部署文档写明；必要时配 `server.tomcat.remoteip.internal-proxies` |
| SDK 传递依赖与现有依赖冲突 | `tea` 依赖 okhttp / gson 等 | L7 全量构建 + 依赖树检查；冲突时在下游依赖清单约束 |
| 真实凭据泄露 | 写进测试或日志 | 只在本地环境变量里做人工验收，不入库 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子

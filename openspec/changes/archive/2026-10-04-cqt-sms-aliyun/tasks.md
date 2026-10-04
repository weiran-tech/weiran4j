---
title: "cqt-sms-aliyun 任务"
status: "done"
updated_at: "2026-10-04"
---

# Tasks

## 0. 准备

- [x] 0.1 同步上游：`git merge upstream/main` 引入 `downstream-dependency-versions` 扩展点，并在其指定的下游文件登记 `com.aliyun:dysmsapi20170525:4.6.0`（cqt-sms-verification/FR-004）

## 2. 领域层 `*-domain` / `*-api`(TG-2)

- [x] 2.1 发送结果 `SmsSendOutcome` 与 `SmsSender` 签名变更（cqt-sms-verification/FR-001）
- [x] 2.2 IP 计数端口 `SmsIpCounter` 与上限判定（cqt-sms-verification/FR-005）
- [x] 2.3 `SmsService#send` 增加客户端 IP；`CqtErrors.SMS_SEND_FAILED`（cqt-sms-verification/FR-001、cqt-sms-verification/FR-005）

## 3. 应用与基础设施层 `*-application` / `*-infrastructure`(TG-3)

- [x] 3.1 应用服务：IP 上限、失败回滚、按发送结果映射错误码、成功才计数（cqt-sms-verification/FR-001、cqt-sms-verification/FR-005）
- [x] 3.2 `AliyunSmsSender` 与 SDK 网关：参数组装、`Code` 分类、关闭自动重试、超时、日志不含凭据与验证码（cqt-sms-verification/FR-004）
- [x] 3.3 阿里云配置项与配置不全时启动失败（cqt-sms-verification/FR-004）
- [x] 3.4 Caffeine IP 计数实现（cqt-sms-verification/FR-005）
- [x] 3.5 `application-biz.yml`：阿里云配置占位、`ip-hourly-limit`、`server.forward-headers-strategy: native`；`DevSmsSender` 适配新签名（cqt-sms-verification/FR-004、cqt-sms-verification/FR-005）

## 4. 适配层 `*-adapter`(TG-4)

- [x] 4.1 `sendSms` 传可信客户端 IP（`remoteAddr`）（cqt-sms-verification/FR-005）

## 5. 测试

- [x] 5.1 领域 / 应用单测：失败回滚与映射、IP 上限、失败不计数
- [x] 5.2 基础设施单测：阿里云参数与分类（假网关）、配置不全报错、IP 计数窗口
- [x] 5.3 集成测试 `CqtSmsLimitIT`；现有 IT 全绿（测试配置放大 IP 上限）
- [ ] 5.4 人工：真实凭据本地发送一条验证码

## 6. 发布

- [ ] 6.1 阿里云控制台准备（签名、模板、RAM 子账号、余额告警）与部署环境变量；反向代理在内网
- [x] 6.2 文档：`AGENTS.biz.md` 部署段；`cqt_portal_accounts.md#05` 关闭；`state/bizs` 记 IP 计数单实例前提

## 7. 上线后

- [ ] 7.1 验收记录写入 `artifacts.md`(只写 verify.md 没有的:人读摘要 / 运行时验证 / 已知缺口)

---
title: "cqt-sms-aliyun：短信验证码接入阿里云"
status: "done"
updated_at: "2026-10-04"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。

## 一句话需求

> 用户原话,不要改写。

- 短信服务商接入使用 阿里云

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 接入方式：自签名 HTTP（不加依赖）还是官方 SDK | 「如果每次都需要在上游加版本是不是不太灵活」→ 选「先做扩展点，短信改用官方 SDK」 | 用官方 SDK `com.aliyun:dysmsapi20170525`；版本登记依赖上游新扩展点 `downstream-dependency-versions`（已请 weiran4j 会话推进），**本 change 的实现要等它合入 main 并同步到 mono4j** |
| 2 | 模板里验证码变量名 | `code` | 模板参数 `{"code":"<6 位验证码>"}`；变量名做成配置项，默认 `code`；模板正文的有效期应写 10 分钟（与后端一致） |
| 3 | 防短信轰炸 / 刷短信费 | 加：同一 IP 每小时最多 10 条 | 新增按客户端 IP 的发送上限（默认每小时 10 条，可配置），超出返回 429「发送过于频繁，请稍后再试」 |
| 4 | 发送失败怎么处理 | （实现细节，按既有口径决定） | 阿里云返回非 `OK` 或调用异常：删除刚生成的验证码（不占用 60 秒冷却，可立即重试），返回 503「短信发送失败，请稍后再试」；阿里云频控（`isv.BUSINESS_LIMIT_CONTROL`）返回 429「发送过于频繁，请稍后再试」；号码非法（`isv.MOBILE_NUMBER_ILLEGAL`）返回 400「手机号格式不正确」 |
| 5 | 客户端 IP 从哪来 | （技术决定） | 框架 `ClientIpResolver` 直接信任 `X-Forwarded-For`，注释明确「只用于日志，不要拿来做访问控制」。限流改用 `request.getRemoteAddr()`，并在 `application-biz.yml` 开启 `server.forward-headers-strategy: native`（Tomcat 只信任内网代理转发的头）。部署要求：反向代理在内网 / 本机，并设置 `X-Forwarded-For` |

## 边界

### 要做

- `weiran.cqt.sms.mode=aliyun`：调用阿里云 SendSms（官方 SDK），配置项 AccessKey ID / Secret（环境变量）、签名名称、模板 CODE、模板变量名（默认 `code`）、接入点（默认 `dysmsapi.aliyuncs.com`）、超时
- `mode=aliyun` 而配置不全（AccessKey、签名、模板任一为空）时**应用启动失败**，提示缺哪个环境变量
- 发送失败的映射与验证码回滚（见澄清 #4）
- 同一客户端 IP 每小时发送上限（默认 10，可配置；0 表示不限）
- 日志：成功 / 失败都记阿里云 `Code` 与 `RequestId`、手机号掩码；**不记** AccessKey Secret、验证码
- `server.forward-headers-strategy: native`
- `AGENTS.biz.md` 部署段补环境变量与阿里云控制台准备事项（签名、模板、频控、余额告警）

### 明确不做

- 自签名 HTTP 实现（用户选官方 SDK）
- 国际短信、批量发送、短信回执查询（QuerySendDetails）
- 多实例共享的 IP 计数与验证码存储（仍是进程内）
- 图形验证码 / 人机校验
- 修改上游文件（依赖版本登记靠上游扩展点，由 weiran4j 会话完成）

### 本次不决定(留给后续 change)

- 生产 AccessKey 使用 RAM 子账号还是 STS 临时凭证（本次只支持 AccessKey 环境变量；文档建议用只授 `AliyunDysmsFullAccess` 或更小权限的 RAM 子账号）
- 切换到多实例部署时的共享存储

## 验收标准

- [ ] AC-1 `mode=aliyun` 时 `sendSms` 调用阿里云 SendSms：请求带 `PhoneNumbers`、配置的 `SignName`、`TemplateCode`，`TemplateParam` 为 `{"<变量名>":"<验证码>"}`；阿里云返回 `OK` 时接口 `code` 200 `{sent:true}`，且响应**不含**验证码
- [ ] AC-2 阿里云返回 `isv.BUSINESS_LIMIT_CONTROL` → `code` 429；`isv.MOBILE_NUMBER_ILLEGAL` → `code` 400「手机号格式不正确」；其它非 `OK` 或调用异常 / 超时 → `code` 503「短信发送失败，请稍后再试」；以上失败后同一号码可立即重新发送（不受 60 秒冷却）
- [ ] AC-3 `mode=aliyun` 缺 AccessKey ID / Secret / 签名 / 模板任一项 → 应用启动失败，异常信息含对应环境变量名
- [ ] AC-4 同一客户端 IP 一小时内第 11 次发送 → `code` 429；不同 IP 互不影响；上限可配置
- [ ] AC-5 日志中不出现 AccessKey Secret、验证码；手机号只出现掩码
- [ ] AC-6 `mode=dev` / `disabled` 行为不变（现有测试全绿）
- [ ] AC-7 `./gradlew check` 全绿，`openspec check` 通过，不改上游文件（依赖版本登记在上游扩展点指定的下游文件里）
- [ ] AC-8 用真实 AccessKey、签名、模板在本地发一条验证码到测试手机，收到短信（人工验证，凭据由用户提供，不入库）

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 实现方式 | 官方 SDK | 自签名 HTTP | 用户决定；同时推动上游开依赖版本扩展点，后续 OSS / Excel 等都受益 |
| 失败后验证码 | 回滚（删除） | 保留 | 保留会占用 60 秒冷却，用户没收到短信却要等 |
| IP 来源 | `remoteAddr` + Tomcat 原生转发头处理 | 框架 `ClientIpResolver` | 后者直接信任客户端可伪造的 `X-Forwarded-For`，换个头就绕过限流 |
| 配置不全 | 启动失败 | 运行时 503 | 部署错误应在上线时暴露，而不是等用户注册时才发现 |

## 未决歧义

- 无

## 对下游的硬约束

- 实现必须在上游 `downstream-dependency-versions` 合入并 `git merge upstream/main` 之后进行；SDK 版本只写在上游扩展点指定的下游文件，业务模块不写版本（CP-4）
- 不修改任何上游文件
- AccessKey 只走环境变量（CP-9），不进 `application-biz.yml` 默认值、不进日志、不进测试资源
- `SmsSender` 端口签名尽量不变；失败语义需要扩展时在 domain 端口层表达（如抛特定异常 / 返回结果），不让 adapter 感知阿里云

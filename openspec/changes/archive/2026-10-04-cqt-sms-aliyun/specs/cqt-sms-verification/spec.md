## MODIFIED Requirements

### Requirement: [FR-001] 验证码发送

`GET /api-web/auth/sendSms?phone=<手机号>` **MUST** 免登录。手机号 **MUST** 为 11 位数字，否则返回 `code` 400「手机号格式不正确」。
系统 **MUST** 生成 6 位数字验证码并交给短信发送实现，成功返回 `{"sent":true}`。
同一手机号距上次成功发送不足 60 秒时 **MUST** 返回 `code` 429「发送过于频繁，请稍后再试」且不生成新验证码。
同一客户端 IP 超出每小时发送上限时 **MUST** 返回 `code` 429「发送过于频繁，请稍后再试」（见 FR-005）。
未配置任何短信发送实现（`weiran.cqt.sms.mode=disabled`，默认）时 **MUST** 返回 `code` 503「短信服务未配置」。
发送实现报告失败时 **MUST** 删除本次生成的验证码（同一号码可立即重新发送，不受 60 秒冷却），并按失败类型返回：
服务商频控 → `code` 429「发送过于频繁，请稍后再试」；号码被服务商判为非法 → `code` 400「手机号格式不正确」；其它失败 → `code` 503「短信发送失败，请稍后再试」。HTTP 均为 200。
日志中手机号 **MUST** 只出现掩码，验证码 **MUST NOT** 写入日志（开发模式除外，见 FR-003）。

#### Scenario: 手机号格式错误
- **WHEN** 以 `phone=1234` 请求发送
- **THEN** `code` 400，`message` 为「手机号格式不正确」
- **判据**:集成测试断言 `$.code == 400`

#### Scenario: 60 秒内重复发送
- **WHEN** 同一手机号成功发送后立即再次请求
- **THEN** 第二次 `code` 429，`message` 为「发送过于频繁，请稍后再试」
- **判据**:集成测试断言第二次 `$.code == 429`

#### Scenario: 短信服务未配置
- **WHEN** `weiran.cqt.sms.mode=disabled` 时请求发送
- **THEN** `code` 503，`message` 为「短信服务未配置」
- **判据**:应用服务单测（发送实现缺失）断言抛出对应错误码 `50320`

#### Scenario: 发送失败后可立即重发
- **WHEN** 发送实现报告「其它失败」，随后同一号码立即再次请求且这次发送成功
- **THEN** 第一次 `code` 503「短信发送失败，请稍后再试」，第二次 `code` 200；第一次生成的验证码不可用于校验
- **判据**:应用服务单测（可控的假发送实现）断言两次结果，并断言第一次的验证码校验失败

#### Scenario: 服务商频控与号码非法
- **WHEN** 发送实现分别报告「服务商频控」与「号码非法」
- **THEN** 分别抛出错误码 `42920`（前台 429）与 `CommonErrors.BAD_REQUEST`「手机号格式不正确」（前台 400）
- **判据**:应用服务单测断言

## ADDED Requirements

### Requirement: [FR-004] 阿里云短信发送

`weiran.cqt.sms.mode=aliyun` 时系统 **MUST** 通过阿里云短信 SendSms 发送验证码：`PhoneNumbers` 为手机号，`SignName` 与 `TemplateCode` 取配置，
`TemplateParam` 为 JSON `{"<模板变量名>":"<验证码>"}`（变量名取 `weiran.cqt.sms.aliyun.template-param-name`，默认 `code`）。
阿里云返回 `Code` 为 `OK` 视为成功；`isv.BUSINESS_LIMIT_CONTROL` 视为服务商频控；`isv.MOBILE_NUMBER_ILLEGAL` 视为号码非法；其它 `Code`、调用异常或超时视为其它失败。
调用 **MUST NOT** 自动重试（SendSms 不幂等）。此模式下发送接口 **MUST NOT** 回显验证码。
AccessKey ID、AccessKey Secret、签名名称、模板 CODE 任一为空时应用 **MUST** 启动失败，异常信息指出缺少的环境变量名。
AccessKey Secret **MUST NOT** 出现在日志与异常信息中；每次发送 **MUST** 记录手机号掩码、阿里云 `Code` 与 `RequestId`。

#### Scenario: 请求参数与成功判定
- **WHEN** 配置签名「常青藤」、模板 `SMS_1`、变量名 `code`，向 `15533716215` 发送 `123456`，阿里云返回 `Code=OK`
- **THEN** SDK 收到 `PhoneNumbers=15533716215`、`SignName=常青藤`、`TemplateCode=SMS_1`、`TemplateParam={"code":"123456"}`，发送结果为成功
- **判据**:基础设施单测（假 SDK 客户端记录请求）断言四个参数与结果

#### Scenario: 失败分类
- **WHEN** 阿里云分别返回 `isv.BUSINESS_LIMIT_CONTROL`、`isv.MOBILE_NUMBER_ILLEGAL`、`isv.AMOUNT_NOT_ENOUGH`，以及 SDK 抛出异常
- **THEN** 发送结果分别为服务商频控、号码非法、其它失败、其它失败
- **判据**:基础设施单测逐条断言

#### Scenario: 配置不全启动失败
- **WHEN** `mode=aliyun` 但签名名称为空
- **THEN** 构造发送实现抛出异常，信息含 `WEIRAN_CQT_SMS_ALIYUN_SIGN_NAME`，且不含 AccessKey Secret 的值
- **判据**:基础设施单测断言异常信息

### Requirement: [FR-005] 客户端 IP 发送上限

同一客户端 IP 在任意连续一小时内成功发出的验证码数 **MUST** 不超过 `weiran.cqt.sms.ip-hourly-limit`（默认 10；0 表示不限）。超出时 **MUST** 返回 `code` 429「发送过于频繁，请稍后再试」且不调用发送实现。
客户端 IP **MUST** 取请求的 `remoteAddr`，并由 Tomcat 原生转发头处理（`server.forward-headers-strategy: native`）只信任内网代理设置的 `X-Forwarded-For`；
**MUST NOT** 直接使用客户端可伪造的转发头做限流。

#### Scenario: 超出上限
- **WHEN** 上限为 3，同一 IP 对 4 个不同手机号各请求发送一次
- **THEN** 前 3 次 `code` 200，第 4 次 `code` 429
- **判据**:应用服务单测断言；集成测试以测试配置的上限复现

#### Scenario: 不同 IP 互不影响
- **WHEN** IP A 已达上限后，IP B 请求发送
- **THEN** IP B `code` 200
- **判据**:应用服务单测断言

#### Scenario: 按可信代理转发的真实 IP 计数
- **WHEN** 上限为 2，请求经内网代理（测试中为回环地址）转发、`X-Forwarded-For` 为 `203.0.113.9`，对 3 个不同号码发送；随后 `X-Forwarded-For` 为 `203.0.113.10` 发送一次
- **THEN** `203.0.113.9` 的第 3 次 `code` 429，`203.0.113.10` 那次 `code` 200
- **判据**:集成测试（单独上下文，上限配置为 2）断言；来自外网地址的请求所带转发头不被信任，由 Tomcat `RemoteIpValve` 的 `internalProxies` 保证（design 说明）

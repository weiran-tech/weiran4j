## Purpose
本能力长期负责常青藤前台（uniapp）接口 `/api-web/**` 的公共约定：统一响应包络、错误语义（HTTP 恒 200、由 body 的 code 区分成功、
未登录与其它错误）、C 端用户令牌的签发与校验，以及哪些接口可免登录访问；使前台沿用原有判定逻辑，且与后台 `/api/**` 的约定互不干扰。

## ADDED Requirements

### Requirement: [FR-001] 前台接口成功响应包络

`/api-web/**` 的接口 **MUST** 以 HTTP 200 返回 JSON `{"code":200,"message":"成功","data":<业务数据>}`。
`/api-web/**` 的接口 **MUST NOT** 被框架统一包络改写成 `{code:0}`。

#### Scenario: 公开接口成功返回
- **WHEN** 不带令牌请求 `GET /api-web/product/getconfig`
- **THEN** HTTP 200，body 的 `code` 为 200、`message` 为「成功」、`data` 为对象
- **判据**:集成测试断言状态码 200 且 `$.code == 200`、`$.message == "成功"`、`$.data` 为 JSON 对象

### Requirement: [FR-002] 前台接口错误语义

`/api-web/**` 的接口出错时 **MUST** 返回 HTTP 200，body 为 `{"code":<错误码前三位>,"message":<提示语>,"data":null}`：
业务异常取其五位错误码的前三位（如 `40400` → `404`）与其提示语；参数校验、参数类型不匹配、请求体不可读等请求错误 **MUST** 返回 `code` 400；
未预期异常 **MUST** 返回 `code` 500 与通用提示语，且 **MUST NOT** 在响应中暴露异常细节。
后台 `/api/**` 的错误响应 **MUST** 保持框架原有行为（HTTP 状态 = 错误类别，body 为五位错误码）。

#### Scenario: 业务异常折成三位码
- **WHEN** `/api-web` 接口抛出错误码为 `40400`、提示语为「资源不存在」的业务异常
- **THEN** HTTP 200，`code` 为 404，`message` 为「资源不存在」
- **判据**:集成测试对测试专用接口断言状态码 200、`$.code == 404`、`$.message == "资源不存在"`

#### Scenario: 参数校验失败
- **WHEN** 请求 `/api-web` 接口时必填参数缺失或类型不匹配
- **THEN** HTTP 200，`code` 为 400，`message` 指出出错参数
- **判据**:集成测试断言状态码 200、`$.code == 400`，`$.message` 含参数名

#### Scenario: 未预期异常不泄露细节
- **WHEN** `/api-web` 接口抛出非业务异常（如运行时异常，消息为一段内部信息）
- **THEN** HTTP 200，`code` 为 500，`message` 为「服务器内部错误」
- **判据**:集成测试断言 `$.code == 500` 且 `$.message` 不含该内部信息

#### Scenario: 后台接口错误语义不变
- **WHEN** 不带令牌请求后台需登录接口（如 `GET /api/auth/me`）
- **THEN** HTTP 401，body `code` 为 40100
- **判据**:现有后台集成测试全绿；新增断言状态码 401 且 `$.code == 40100`

### Requirement: [FR-003] 前台用户令牌

系统 **MUST** 为 C 端账号签发 HS256 JWT，载荷包含 `sub`（账号 ID）与 `typ`（固定为 `cqt-web`）以及签发、过期时间；
签名密钥 **MUST** 来自配置项 `weiran.cqt.jwt.secret`（环境变量 `WEIRAN_CQT_JWT_SECRET`），不足 32 字节时应用 **MUST** 启动失败；
有效期来自 `weiran.cqt.jwt.ttl`（环境变量 `WEIRAN_CQT_JWT_TTL`，默认 7 天）。
校验时签名不符、已过期、缺少 `sub` 或 `typ` 不为 `cqt-web` 的令牌 **MUST** 视为无效。
令牌原文 **MUST NOT** 写入日志。

#### Scenario: 签发后可解析回账号 ID
- **WHEN** 为账号 ID 42 签发令牌后立即解析
- **THEN** 解析结果为账号 ID 42
- **判据**:单元测试断言解析结果等于 42

#### Scenario: 过期与错误类型的令牌无效
- **WHEN** 解析一个已过期的令牌，或一个 `typ` 不为 `cqt-web` 但签名正确的令牌
- **THEN** 两者都解析为空（无效）
- **判据**:单元测试用可控时钟与自造载荷断言结果为空

#### Scenario: 密钥过短时启动失败
- **WHEN** 以少于 32 字节的密钥构造令牌服务
- **THEN** 抛出异常，异常信息提示环境变量 `WEIRAN_CQT_JWT_SECRET` 与最小长度
- **判据**:单元测试断言抛出 `IllegalStateException` 且信息含 `WEIRAN_CQT_JWT_SECRET`

### Requirement: [FR-004] 前台接口登录校验

`/api-web/**` 的接口 **MUST** 默认要求请求头 `Authorization: Bearer <前台令牌>`；
缺少令牌时 **MUST** 返回 `{"code":401,"message":"请求参数缺token"}`，令牌无效时 **MUST** 返回 `{"code":401,"message":"登录失效,请重新登录"}`，HTTP 均为 200。
标注为公开的接口 **MUST** 允许无令牌访问；带有效令牌访问公开接口时 **MUST** 仍能取得当前账号 ID。
前台令牌 **MUST NOT** 通过后台 `/api/**` 的认证，后台令牌 **MUST NOT** 通过 `/api-web/**` 的认证。

#### Scenario: 无令牌访问需登录接口
- **WHEN** 不带 `Authorization` 请求需登录的 `/api-web` 接口
- **THEN** HTTP 200，`code` 为 401，`message` 为「请求参数缺token」
- **判据**:集成测试断言状态码 200、`$.code == 401`、`$.message == "请求参数缺token"`

#### Scenario: 无效令牌访问需登录接口
- **WHEN** 以签名错误或已过期的令牌请求需登录的 `/api-web` 接口
- **THEN** HTTP 200，`code` 为 401，`message` 为「登录失效,请重新登录」
- **判据**:集成测试断言 `$.code == 401`、`$.message == "登录失效,请重新登录"`

#### Scenario: 有效令牌访问需登录接口
- **WHEN** 以为账号 ID 42 签发的有效令牌请求需登录的 `/api-web` 接口
- **THEN** HTTP 200，`code` 为 200，接口取得的当前账号 ID 为 42
- **判据**:集成测试对回显当前账号 ID 的测试专用接口断言 `$.data == 42`

#### Scenario: 前后台令牌互不通用
- **WHEN** 以前台令牌请求后台 `GET /api/auth/me`，或以后台管理员令牌请求需登录的 `/api-web` 接口
- **THEN** 前者 HTTP 401（`code` 40100），后者 HTTP 200 且 `code` 为 401
- **判据**:集成测试分别断言两次请求的状态码与 `$.code`

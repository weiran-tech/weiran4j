## MODIFIED Requirements

### Requirement: [FR-003] 前台用户令牌

系统 **MUST** 为 C 端账号签发 HS256 JWT，载荷包含 `sub`（账号 ID）、`typ`（固定为 `cqt-web`）、`ver`（签发时账号的 `token_version`）以及签发、过期时间；
签名密钥 **MUST** 来自配置项 `weiran.cqt.jwt.secret`（环境变量 `WEIRAN_CQT_JWT_SECRET`），不足 32 字节时应用 **MUST** 启动失败；
有效期来自 `weiran.cqt.jwt.ttl`（环境变量 `WEIRAN_CQT_JWT_TTL`，默认 7 天）。
校验时签名不符、已过期、缺少 `sub` 或 `ver`、`typ` 不为 `cqt-web` 的令牌 **MUST** 视为无效。
令牌原文 **MUST NOT** 写入日志。

#### Scenario: 签发后可解析回账号 ID
- **WHEN** 为账号 ID 42、令牌版本 3 签发令牌后立即解析
- **THEN** 解析结果为账号 ID 42、令牌版本 3
- **判据**:单元测试断言解析结果的账号 ID 与版本

#### Scenario: 过期与错误类型的令牌无效
- **WHEN** 解析一个已过期的令牌，或一个 `typ` 不为 `cqt-web` 但签名正确的令牌，或一个缺少 `ver` 的令牌
- **THEN** 三者都解析为空（无效）
- **判据**:单元测试用可控时钟与自造载荷断言结果为空

#### Scenario: 密钥过短时启动失败
- **WHEN** 以少于 32 字节的密钥构造令牌服务
- **THEN** 抛出异常，异常信息提示环境变量 `WEIRAN_CQT_JWT_SECRET` 与最小长度
- **判据**:单元测试断言抛出 `IllegalStateException` 且信息含 `WEIRAN_CQT_JWT_SECRET`

### Requirement: [FR-004] 前台接口登录校验

`/api-web/**` 的接口 **MUST** 默认要求请求头 `Authorization: Bearer <前台令牌>`；
令牌解析成功后 **MUST** 查询对应账号：账号不存在或其 `token_version` 与令牌 `ver` 不一致时，令牌视为无效。
缺少令牌时 **MUST** 返回 `{"code":401,"message":"请求参数缺token"}`，令牌无效时 **MUST** 返回 `{"code":401,"message":"登录失效,请重新登录"}`，HTTP 均为 200。
标注为公开的接口 **MUST** 允许无令牌访问；带有效令牌访问公开接口时 **MUST** 仍能取得当前账号 ID。
前台令牌 **MUST NOT** 通过后台 `/api/**` 的认证，后台令牌 **MUST NOT** 通过 `/api-web/**` 的认证。

#### Scenario: 无令牌访问需登录接口
- **WHEN** 不带 `Authorization` 请求需登录的 `/api-web` 接口
- **THEN** HTTP 200，`code` 为 401，`message` 为「请求参数缺token」
- **判据**:集成测试断言状态码 200、`$.code == 401`、`$.message == "请求参数缺token"`

#### Scenario: 无效令牌访问需登录接口
- **WHEN** 以签名错误、已过期、账号不存在或令牌版本已过时的令牌请求需登录的 `/api-web` 接口
- **THEN** HTTP 200，`code` 为 401，`message` 为「登录失效,请重新登录」
- **判据**:集成测试断言 `$.code == 401`、`$.message == "登录失效,请重新登录"`（含「账号不存在」与「版本过时」两种令牌）

#### Scenario: 有效令牌访问需登录接口
- **WHEN** 以为某个存在的账号按其当前 `token_version` 签发的令牌请求需登录的 `/api-web` 接口
- **THEN** HTTP 200，`code` 为 200，接口取得的当前账号 ID 为该账号 ID
- **判据**:集成测试对回显当前账号 ID 的测试专用接口断言 `$.data` 等于该账号 ID

#### Scenario: 前后台令牌互不通用
- **WHEN** 以前台令牌请求后台 `GET /api/auth/me`，或以后台管理员令牌请求需登录的 `/api-web` 接口
- **THEN** 前者 HTTP 401（`code` 40100），后者 HTTP 200 且 `code` 为 401
- **判据**:集成测试分别断言两次请求的状态码与 `$.code`

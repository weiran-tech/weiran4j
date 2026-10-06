## MODIFIED Requirements

### Requirement: [FR-001] 统一响应包络

所有 `/api/**` 接口 **MUST** 以统一包络返回。成功时 **MUST** 为 `{code, message, data}`,`code` 为数字 `0`,**MUST NOT** 带其它键。失败时 **MUST** 为 `{code, message, data, requestId}`:`code` 为五位数字错误码,前三位等于 HTTP 状态码;`data` 为 `null`;`requestId` 与该响应的 `X-Request-Id` 头相同。

#### Scenario: 成功响应的业务码是数字 0
- **WHEN** 已登录用户调用 `GET /api/auth/me`
- **THEN** 响应体 `code` 为数字 `0`,`data.username` 为当前用户名,且响应体没有 `requestId` 键
- **判据**:集成测试断言 `$.code` 的 JSON 类型为 number 且值为 0,`$.requestId` 不存在

#### Scenario: 参数校验失败
- **WHEN** 调用 `POST /api/auth/login` 且 `username` 为空
- **THEN** 返回 HTTP 400,`code` 为 `40000`,`requestId` 等于响应头 `X-Request-Id`
- **判据**:响应状态 400、`$.code == 40000`,且 `$.requestId` 与响应头相等

#### Scenario: 拦截器拒绝时的失败体也带请求号
- **WHEN** 不带令牌调用 `GET /api/auth/me`,以及无权限用户调用 `GET /api/users`
- **THEN** 分别返回 40100 与 40300,两个响应体都带非空的 `requestId`,且与各自的响应头一致
- **判据**:集成测试断言两次响应的 `$.requestId` 都等于各自的 `X-Request-Id` 头

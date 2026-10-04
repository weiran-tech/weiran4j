## Purpose
本能力长期负责常青藤前台账号（个人参赛者与学校 / 机构）：账号在 `cqt_portal_accounts` 中的存储口径、注册时的身份与手机号规则、
密码登录与验证码登录、本人资料的读取与修改边界、学校账号的审核状态流转，以及重置密码后旧登录态失效。

## ADDED Requirements

### Requirement: [FR-001] 账号存储

前台账号 **MUST** 存放在表 `cqt_portal_accounts`，列与原统一库 `cqtxj2026.portal_accounts` 一致，并增加
`credential_type`（`ID_CARD` / `OTHER`，默认 `ID_CARD`）与 `token_version`（整数，默认 0）。
密码 **MUST** 以 BCrypt 哈希存储，校验 **MUST** 兼容旧库 `$2y$` 前缀的哈希。数据 **MUST** 通过独立导入脚本迁入，
导入时 `token_version` 为 0，`id_card_value` 去空白并转大写，`credential_type` 按其格式推断：形如 17 位数字加 1 位数字或 `X` 的为 `ID_CARD`，否则 `OTHER`。

#### Scenario: 旧库哈希可以登录
- **WHEN** 账号的 `password_hash` 为 `$2y$10$` 前缀的 BCrypt 哈希，用对应明文密码自动登录
- **THEN** 登录成功
- **判据**:集成测试插入 `$2y$` 哈希账号后断言 `autologin` 返回 `code` 200

#### Scenario: 导入脚本可重复执行
- **WHEN** 两库同实例时执行 `scripts/biz/import/cqt_portal_accounts.sql` 两次
- **THEN** 行数与 `cqtxj2026.portal_accounts` 一致，`token_version` 全为 0
- **判据**:执行后比对 `COUNT(*)`，`SELECT COUNT(*) WHERE token_version <> 0` 为 0

### Requirement: [FR-002] 登录

`POST /api-web/auth/login`（手机号、密码、验证码）与 `POST /api-web/auth/autologin`（手机号、密码）**MUST** 免登录。
`login` **MUST** 先校验验证码，失败返回 `code` 401「验证码错误」。
按手机号查账号时 **MUST** 优先 `source_database='zhongxi'`、其次 `id` 最小的一条。
手机号不存在与密码错误 **MUST** 返回同一 `code`（400）与同一提示「手机号或密码错误」。
成功时 **MUST** 返回 `{"access_token":<前台令牌>,"token_type":"bearer","expires_in":<有效期秒数>}`，令牌按账号当前 `token_version` 签发。

#### Scenario: 验证码登录成功
- **WHEN** 发送验证码后，以正确手机号、密码、验证码调用 `login`
- **THEN** `code` 200，`data.access_token` 可访问 `userinfo`
- **判据**:集成测试用返回的令牌请求 `userinfo` 得到 `code` 200

#### Scenario: 账号不存在与密码错误不可区分
- **WHEN** 分别以未注册手机号、已注册手机号 + 错误密码调用 `autologin`
- **THEN** 两次响应的 `code` 与 `message` 完全相同
- **判据**:集成测试断言两次 `$.code`、`$.message` 相等且为 400「手机号或密码错误」

#### Scenario: 验证码错误
- **WHEN** 以错误验证码调用 `login`
- **THEN** `code` 401，`message` 为「验证码错误」
- **判据**:集成测试断言

### Requirement: [FR-003] 注册

`POST /api-web/auth/register` **MUST** 免登录，按 `type` 区分个人（1）与学校（2），其余值返回 `code` 400「类型格式不正确」。
**MUST** 校验：姓名 / 学校名称去空白后至少 2 个字符；手机号 11 位数字；密码至少 6 位且与 `password_confirmation` 一致；验证码正确（否则 401「验证码错误」）；
手机号未被任何账号使用（否则 `code` 409「当前手机号已经注册」）。
个人账号 **MUST** 校验证件：`credential_type` 接受「身份证号」/「身份证」/`ID_CARD`（→ `ID_CARD`）与「其他」/`OTHER`（→ `OTHER`），缺省为身份证号；
证件号去空白转大写后非空；身份证号 **MUST** 为 18 位、出生日期有效且不晚于今天、校验位正确；同证件类型下证件号已被个人账号使用时返回 `code` 409「该证件号已经注册」。
新账号 **MUST** 记 `source_database='zhongxi'`、`legacy_user_id` 为该来源现有最大值 + 1、`token_version=0`；
个人账号 `audit_status=0`（通过），学校账号 `audit_status=1`（审核中）。成功返回 `data` 为 `true`。

#### Scenario: 个人注册后可自动登录
- **WHEN** 以合法身份证号、未注册手机号、正确验证码注册个人账号，随后 `autologin`
- **THEN** 注册 `code` 200，`autologin` 返回令牌，`userinfo.status` 为 0
- **判据**:集成测试断言三次响应

#### Scenario: 学校注册后审核中
- **WHEN** 以 `type=2` 注册学校账号
- **THEN** `userinfo.status` 为 1
- **判据**:集成测试断言 `$.data.status == 1`

#### Scenario: 重复手机号与证件号
- **WHEN** 用已注册的手机号注册；或用另一个手机号、同一个身份证号注册个人账号
- **THEN** 前者 `code` 409「当前手机号已经注册」，后者 `code` 409「该证件号已经注册」
- **判据**:集成测试断言两次 `$.code`、`$.message`

#### Scenario: 身份证校验
- **WHEN** 证件类型为身份证号，证件号校验位错误 / 出生日期无效 / 不足 18 位
- **THEN** `code` 400，提示分别为「身份证号校验位错误」「身份证号出生日期无效」「身份证号必须是18位有效号码」
- **判据**:领域单测逐条断言；集成测试至少覆盖校验位错误一条

### Requirement: [FR-004] 本人资料

`GET` 或 `POST /api-web/auth/userinfo` **MUST** 需要登录，只返回令牌所属账号，字段为：
`id, name, type, uniid, phone, schoolid, idcard, credential_type（「身份证号」/「其他」）, cities, cityname（按 cqt_regions.legacy_id 解析，查不到为空串）, sex, school, contact, address, email, status, zhizhao, chengnuoshu, rejectreason, source_database`。

#### Scenario: 返回字段集
- **WHEN** 已登录账号请求 `userinfo`
- **THEN** `data` 的字段名集合恰为上述 20 个，`cityname` 为对应赛区名称
- **判据**:集成测试断言字段名集合与 `cityname`

### Requirement: [FR-005] 修改资料

`POST /api-web/auth/updateuserinfo` **MUST** 需要登录，只修改令牌所属账号，且只接受以下字段：
`name, schoolid, idcard, credential_type, cities, sex, school, contact, address, email, zhizhao, chengnuoshu`；其它字段（如 `rejectreason`、`status`、`type`）**MUST** 被忽略。
请求带 `phone` 且与当前手机号不同时 **MUST** 拒绝，返回 `code` 400「手机号不支持在此修改」；相同则忽略。
个人账号修改证件类型或证件号时 **MUST** 按 FR-003 的证件规则校验，且同类型下不得与**其他**个人账号重复（409「该证件号已经注册」）。
学校账号在 `audit_status=2`（驳回）时修改资料 **MUST** 把 `audit_status` 置为 1（审核中）。成功返回 `data` 为 `true`。

#### Scenario: 白名单外字段被忽略
- **WHEN** 请求带 `rejectreason="x"`、`status=0` 与 `school="新学校"`
- **THEN** 只有 `school` 被修改
- **判据**:集成测试查库断言 `rejection_reason`、`audit_status` 不变、`school_value` 已变

#### Scenario: 不允许改手机号
- **WHEN** 请求带与当前不同的 `phone`
- **THEN** `code` 400「手机号不支持在此修改」，资料不变
- **判据**:集成测试断言响应与库中手机号不变

#### Scenario: 驳回的学校改资料后回到审核中
- **WHEN** `audit_status=2` 的学校账号修改资料
- **THEN** `audit_status` 变为 1
- **判据**:集成测试查库断言

### Requirement: [FR-006] 重置密码

`POST /api-web/auth/resetPassword` **MUST** 免登录：密码至少 6 位且与 `password_confirmation` 一致（否则 400「两次密码不一致或密码长度不足」），验证码正确（否则 401「验证码错误」）；
**MUST** 修改该手机号对应的全部账号的密码并把其 `token_version` 加 1；
手机号无账号时 **MUST** 返回 `code` 404「用户信息不存在」（此时请求方已通过该手机号的验证码校验，即已证明持有该号码，不构成账号枚举）。

#### Scenario: 重置后旧令牌失效
- **WHEN** 已登录账号重置密码
- **THEN** 旧令牌请求 `userinfo` 得到 `code` 401「登录失效,请重新登录」，新密码可 `autologin`
- **判据**:集成测试断言两次响应

### Requirement: [FR-007] 承诺书模板链接

`GET` 或 `POST /api-web/auth/getlinkinfo` **MUST** 免登录，`data` 为配置项 `weiran.cqt.commitment-template-url` 的值（未配置时为空串）。

#### Scenario: 返回配置的链接
- **WHEN** 配置了模板链接时请求
- **THEN** `data` 等于该链接
- **判据**:集成测试断言

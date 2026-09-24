---
status: "active"
---

# rbac-account-management Specification

## Purpose
本能力长期负责后台管理员对账号（`pam_account`）生命周期的管理：分页检索账号、创建新账号、编辑账号资料、启用/禁用账号访问权，以及查看账号的最近登录记录。它与登录鉴权（已有的 `AuthController`/`AuthApplicationService`）是同一份数据的两个不同使用场景——鉴权关心"这个账号能不能登录"，本能力关心"管理员如何维护这些账号"。

## Requirements

### Requirement: [FR-001] 账号分页列表查询与筛选

管理端 **MUST** 能够分页查询账号列表，支持按用户名/手机号/邮箱模糊匹配，以及按账号类型（`user`/`backend`）精确筛选。

#### Scenario: 按用户名模糊查询账号
- **WHEN** 调用账号列表接口并传入 `keyword=admin`
- **THEN** 返回结果中的每一条账号记录的用户名/手机号/邮箱至少一项包含 `admin`
- **判据**:接口返回 HTTP 200，响应体 `code` 为 `"0"`；`data.items` 非空时逐项断言用户名/手机号/邮箱中至少一个字段包含子串 `admin`

#### Scenario: 按账号类型筛选返回对应空间的账号
- **WHEN** 调用账号列表接口并传入 `accountType=user`
- **THEN** 返回结果中的每一条账号记录的 `accountType` 字段均为 `user`
- **判据**:`data.items` 逐项断言 `accountType == "user"`

### Requirement: [FR-002] 账号新增

管理端 **MUST** 能够新增账号，新密码 **MUST** 通过已有的 `PasswordHasher` 端口产出 BCrypt 哈希写入 `passwordHash`/`passwordKey`，**MUST NOT** 使用 PHP 遗留的 `md5(sha1(...))` 算法生成新账号密码。

#### Scenario: 新增账号后密码以 BCrypt 格式落库
- **WHEN** 提交新增账号请求，包含明文密码
- **THEN** 该账号在数据库中的 `password` 字段以 `$2` 开头（BCrypt 特征前缀），`password_key` 为空字符串
- **判据**:新增接口返回 HTTP 200 且 `data.id` 为正整数；直接查询 `pam_account.password` 字段，断言其以 `$2` 开头

#### Scenario: 新增账号的用户名/手机号/邮箱在同一账号类型空间内唯一
- **WHEN** 已存在 `accountType=user` 且 `username=alice` 的账号，再次提交 `accountType=user`、`username=alice` 的新增请求
- **THEN** 第二次新增请求被拒绝
- **判据**:接口返回非 `"0"` 业务错误码；数据库中 `accountType=user AND username=alice` 的账号记录数量仍为 1

### Requirement: [FR-003] 账号编辑与启禁用

管理端 **MUST** 能够编辑账号的可变资料字段（不含密码），以及切换账号的启用/禁用状态（`enabled` 字段）。禁用后的账号 **MUST NOT** 能够通过现有登录接口成功登录。

#### Scenario: 禁用账号后无法登录
- **WHEN** 管理端对一个当前 `enabled=true` 的账号发起禁用请求，随后该账号尝试用正确的密码调用登录接口
- **THEN** 禁用请求成功；登录请求失败
- **判据**:禁用接口返回 HTTP 200 且 `code` 为 `"0"`；登录接口返回非 `"0"` 业务错误码（对应 `Account.ensureLoginable` 的拒绝分支）

#### Scenario: 重新启用账号后可正常登录
- **WHEN** 对一个已禁用的账号发起启用请求，随后该账号用正确密码调用登录接口
- **THEN** 启用请求成功；登录请求成功并返回访问令牌
- **判据**:登录接口返回 HTTP 200，`code` 为 `"0"`，`data.token` 字段非空

### Requirement: [FR-004] 登录日志只读查询

管理端 **MUST** 能够分页查看指定账号的最近登录信息（复用 `pam_account.logined_at`/`login_ip` 字段），本能力 **MUST NOT** 新建独立的登录流水明细表。

#### Scenario: 查询账号登录日志返回最近登录时间与来源 IP
- **WHEN** 一个账号成功登录后，调用该账号的登录日志查询接口
- **THEN** 返回结果包含该账号最近一次的登录时间与来源 IP，与登录时记录的值一致
- **判据**:接口返回 HTTP 200，`data` 中的 `loginedAt`/`loginIp` 字段与登录成功后 `AccountRepository.recordLogin` 写入的值相等

### Requirement: [FR-005] 密码重置沿用 BCrypt 策略

管理端为账号重置密码时，**MUST** 复用已有的 `PasswordHasher` 端口产出 BCrypt 哈希，语义与 `weiran-app` 已有的交互式密码重置工具（`ResetPasswordRunner`）保持一致，不引入第二套密码处理逻辑。

#### Scenario: 管理端重置密码与交互式工具产生一致的哈希格式
- **WHEN** 管理端对某账号发起重置密码请求
- **THEN** 该账号新密码哈希以 `$2` 开头，`password_key` 为空字符串
- **判据**:重置接口返回 HTTP 200 后，查询该账号 `password` 字段以 `$2` 开头，`password_key` 为空字符串——与 `ResetPasswordRunner` 调用 `PasswordHasher.hash()` 产出的格式相同

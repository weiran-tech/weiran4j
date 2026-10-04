---
title: "cqt-portal-account：前台账号登录注册"
status: "done"
updated_at: "2026-10-04"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。

## 一句话需求

> 用户原话,不要改写。

- 继续下一个切片，做账号登录注册

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 范围：注册页还依赖赛区列表 regions、承诺书模板链接 getlinkinfo、学校注册的文件上传，哪些一起做 | 账号接口 + 赛区 + 模板链接，上传另开 | 本次做 `sendSms`/`login`/`autologin`/`register`/`userinfo`/`updateuserinfo`/`resetPassword` + `competcategory/regions` + `auth/getlinkinfo`；学校注册的附件字段（`zhizhao`/`chengnuoshu`）本次只按字符串 URL 存取，上传接口另开 change |
| 2 | 短信服务商 | 先做接口 + 开发模式，真实服务商另开 | 定义短信发送端口；内置「开发模式」实现（验证码写日志，可配置回显到响应），未配置任何实现时 `sendSms` 返回「短信服务未配置」；真实服务商（如阿里云）另开 change |
| 3 | 学校账号审核状态（uniapp 口径 0=通过 1=审核中 2=驳回；FastAPI 注册即 0） | 学校注册后审核中，驳回后改资料回到审核中 | 个人注册 `audit_status=0`；学校注册 `=1`；学校在 `=2` 时修改资料自动回到 `1`。后台审核页面另开 change |
| 4 | 修改资料里的手机号（FastAPI 不验证直接改） | 不允许在这里改 | `phone` 与原值相同则忽略，不同则拒绝「手机号不支持在此修改」；驳回原因、审核状态等字段一律不允许用户改 |
| 5 | 账号表来源与命名 | 沿用上一切片口径（表加 `cqt_` 前缀、列保持原样、Flyway 只建表、数据走导入脚本） | `portal_accounts` → `cqt_portal_accounts`、`regions` → `cqt_regions`；列与 `cqtxj2026` 一致，另加 FastAPI 后来补的 `credential_type`（`schema_2027/004`） |
| 7 | 实现前发现：验证码无输错次数上限，可在有效期内暴力枚举重置他人密码 | 加：同一验证码输错 5 次即作废 | 补进 spec `cqt-sms-verification` FR-002（L3 后经用户确认的补充） |
| 6 | 令牌吊销（上一切片宪法对照 CP-8 ⚠ 的承诺） | 已在 `AGENTS.biz.md` 约定 | `cqt_portal_accounts` 加 `token_version`，令牌载荷带 `ver`；重置密码时递增，旧令牌立即失效 |

## 边界

### 要做

- `GET /api-web/auth/sendSms?phone=`：11 位数字校验；同一手机号 60 秒内不能重发；验证码 6 位、10 分钟有效、校验成功即作废
- `POST /api-web/auth/login`：手机号 + 密码 + 短信验证码，签发前台令牌，返回 `{access_token, token_type:"bearer", expires_in}`
- `POST /api-web/auth/autologin`：手机号 + 密码（uniapp 注册成功后直接调用），返回同上
- `POST /api-web/auth/register`：个人（`type=1`：姓名、性别、证件类型 + 证件号、赛区、学校、学校编号）与学校（`type=2`：名称、联系人、赛区、邮箱、学校编号、营业执照 / 承诺书 URL）；手机号 + 验证码 + 两次密码；手机号唯一、个人证件号唯一（同证件类型）
- `GET|POST /api-web/auth/userinfo`：返回 FastAPI `account_response` 的字段集（含 `cityname`）
- `POST /api-web/auth/updateuserinfo`：白名单字段；个人改证件号要重新校验与查重；学校驳回态改资料回到审核中；手机号不可改
- `POST /api-web/auth/resetPassword`：手机号 + 验证码 + 两次密码，重置后旧令牌失效
- `GET|POST /api-web/auth/getlinkinfo`：返回承诺书模板 URL（配置项）
- `GET|POST /api-web/competcategory/regions`：赛区列表 `[{id, pid, name, code}]`
- 表 `cqt_portal_accounts`、`cqt_regions`（Flyway）；导入脚本 `scripts/biz/import/cqt_portal_accounts.sql`、`cqt_regions.sql`
- 密码只用 BCrypt，兼容旧库 `$2y$` 前缀哈希（宪法 CP-8）

### 明确不做

- 文件上传接口（`/api-web/local-files/upload`）与附件存储方案——另开 change
- 真实短信服务商对接（阿里云等）——另开 change
- 后台管理：前台账号列表、学校审核通过 / 驳回、`/api/cqt/**` 接口与 `web/` 页面——另开 change
- `getexinfo`（Excel 导入模板）、`getsecondcat`（二级赛项）——属于报名 / 导入切片
- 修改手机号的流程（需新号码验证码，uniapp 也要改）
- 字段加密存储（旧库与 `cqtxj2026` 均为明文，本次保持）
- `X-CQTXJ-Database` 请求头（2026/2027 库切换）
- 修复 `cqtxj2026.sql` 的中文乱码（`cqt_setting.md#01` 已登记，账号表同样受影响，统一处理）
- 修改任何上游（weiran4j）文件

### 本次不决定(留给后续 change)

- 同一手机号在旧数据里存在多条账号（`zhongxi` 与 `qudao` 两库合并）时的去重或合并策略——本次登录沿用 FastAPI 口径：优先 `zhongxi`、其次 `id` 最小
- 短信验证码存储在多实例部署下的共享（本次单实例内存）
- 登录失败次数限制 / 账号锁定

## 验收标准

- [ ] AC-1 `sendSms`：非 11 位数字 → `code` 400；开发模式下返回 `{sent:true}`（配置回显时含 `code`）；60 秒内同号重发 → `code` 429；未配置短信实现 → `code` 503「短信服务未配置」；HTTP 均 200
- [ ] AC-2 `login`：验证码正确 + 密码正确 → `code` 200 且 `data.access_token` 可用于需登录的 `/api-web` 接口；验证码错误 → `code` 401「验证码错误」；手机号不存在与密码错误返回**同一** `code` 与 `message`（宪法 CP-10）
- [ ] AC-3 `autologin`：手机号 + 密码正确 → 签发令牌；错误时与 AC-2 同一提示
- [ ] AC-4 旧库 `$2y$10$` 前缀的 BCrypt 哈希可以登录
- [ ] AC-5 `register` 个人：成功后 `audit_status=0`，可立刻 `autologin`；手机号已注册 / 证件号已注册（同类型）/ 身份证校验位错误 / 两次密码不一致或少于 6 位 / 验证码错误 各有明确提示，`code` 非 200
- [ ] AC-6 `register` 学校：成功后 `audit_status=1`
- [ ] AC-7 `userinfo` 返回字段与 FastAPI `account_response` 一致（`id,name,type,uniid,phone,schoolid,idcard,credential_type,cities,cityname,sex,school,contact,address,email,status,zhizhao,chengnuoshu,rejectreason,source_database`），`credential_type` 为「身份证号」/「其他」
- [ ] AC-8 `updateuserinfo`：白名单外字段（如 `rejectreason`、`status`）被忽略；`phone` 与原值不同 → 拒绝；学校在驳回态修改后 `status` 变为 1；个人改证件号走同样的校验与查重
- [ ] AC-9 `resetPassword`：成功后旧令牌访问需登录接口得到 `code` 401，新密码可登录
- [ ] AC-10 `regions` 返回 `[{id,pid,name,code}]`（`id`/`pid` 为 `legacy_id`/`parent_legacy_id`），`getlinkinfo` 返回配置的模板 URL
- [ ] AC-11 `./gradlew check` 全绿（含覆盖率聚合），`openspec check` 通过，不改上游文件
- [ ] AC-12 导入脚本在两库同实例时可重复执行，行数一致；导入的账号 `token_version` 为 0、证件号去空白转大写、`credential_type` 按格式推断（17 位数字 + 数字或 X 为 `ID_CARD`，否则 `OTHER`）

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 短信 | 端口 + 开发模式 | 本次接阿里云 | 用户决定；服务商凭据未就绪 |
| 验证码存储 | 单实例内存（Caffeine，TTL） | 数据库表 / Redis | 当前单实例部署；端口化后换实现不影响调用方 |
| 登录失败提示 | 统一「手机号或密码错误」 | 沿用 FastAPI 的「用户信息不存在」/「密码错误」 | 宪法 CP-10，后者可枚举账号 |
| login 同时要密码与验证码 | 保留（uniapp 登录页就这么传） | 改成二选一 | 不改前端；`autologin` 只要密码是 uniapp 注册后自动登录的既有行为，保留 |
| 学校审核 | 注册即审核中、驳回后改资料回审核中 | FastAPI 注册即通过 | 用户决定；与功能说明「学校注册并等待审核」一致 |
| 改手机号 | 拒绝 | 直接改 | 用户决定；手机号是登录名，直接改可被盗号 |

## 未决歧义

- 无

## 对下游的硬约束

- 不修改任何上游文件；沿用 `cqt-web-foundation` 的 `/api-web` 约定（`@PortalController`、`@PortalPublic`、`PortalResult`、`PortalTokenCodec`）
- 令牌载荷新增 `ver` 并在每次请求比对库中 `token_version`（宪法 CP-8），这会改动上一切片的 `PortalTokenCodec` 契约与 `cqt-portal-api` 能力（MODIFIED）
- 密码哈希只用 BCrypt（`spring-security-crypto`），不引入其它算法（宪法 CP-8）
- uniapp 的请求字段名、响应字段名一律沿用（`phone`、`password_confirmation`、`idcard`、`cities`、`zhizhao`、`access_token` 等）
- 手机号、证件号、密码、验证码不得写入日志（宪法 CP-9）；日志里手机号只出现掩码

# cqt_portal_accounts 前台账号（常青藤）

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 下游（weiran-cqt）业务表，索引见 [`README.biz.md`](README.biz.md)。
>
> 事实源：
> [`AuthController.java`](../../../weiran4j/weiran-cqt/weiran-cqt-adapter/src/main/java/com/weiran/cqt/adapter/portal/AuthController.java)、
> [`AccountApplicationService.java`](../../../weiran4j/weiran-cqt/weiran-cqt-application/src/main/java/com/weiran/cqt/application/account/AccountApplicationService.java)、
> [`SmsApplicationService.java`](../../../weiran4j/weiran-cqt/weiran-cqt-application/src/main/java/com/weiran/cqt/application/sms/SmsApplicationService.java)、
> [`Account.java`](../../../weiran4j/weiran-cqt/weiran-cqt-domain/src/main/java/com/weiran/cqt/domain/account/Account.java) /
> [`Credentials.java`](../../../weiran4j/weiran-cqt/weiran-cqt-domain/src/main/java/com/weiran/cqt/domain/account/Credentials.java) /
> [`SmsCodePolicy.java`](../../../weiran4j/weiran-cqt/weiran-cqt-domain/src/main/java/com/weiran/cqt/domain/sms/SmsCodePolicy.java)、
> [`MybatisAccountRepository.java`](../../../weiran4j/weiran-cqt/weiran-cqt-infrastructure/src/main/java/com/weiran/cqt/infrastructure/persistence/MybatisAccountRepository.java)、
> [`V202610041000__cqt_portal_accounts.sql`](../../../weiran4j/weiran-cqt/weiran-cqt-infrastructure/src/main/resources/db/migration/cqt/V202610041000__cqt_portal_accounts.sql)、
> [`scripts/biz/import/cqt_portal_accounts.sql`](../../../scripts/biz/import/cqt_portal_accounts.sql)。
>
> 盘点基线：change `cqt-portal-account`（2026-10-04）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `cqt_portal_accounts`（原 `cqtxj2026.portal_accounts`，列不变，加 `credential_type`、`token_version` 与两个前缀索引） |
| 菜单 / 页面 | 无后台页面；前台 uniapp `pages/login/{login,register}.vue`、`pages/my/my.vue` |
| 后端模块 | `weiran-cqt`；`AuthController` → `AccountApplicationService` / `SmsApplicationService` → `MybatisAccountRepository` |
| 接口 | `/api-web/auth/{sendSms,login,autologin,register,userinfo,updateuserinfo,resetPassword,getlinkinfo}` |
| 权限码 | 无（前台令牌，`/api-web` 约定见 `AGENTS.biz.md`） |
| 数据来源 | Flyway 只建表；`scripts/biz/import/cqt_portal_accounts.sql`（先导 `cqt_regions.sql`） |

## 1. 列表

无后台列表（后台账号管理 / 学校审核另开 change）。

## 2. 字段与表单

| 字段（uniapp 键） | 列 | 规则 |
| --- | --- | --- |
| `phone` | `phone_value` TEXT | 11 位数字；注册时不得与任何账号重复；**不可在改资料里修改** |
| `password` / `password_confirmation` | `password_hash` | 至少 6 位且两次一致；BCrypt，兼容旧库 `$2y$` |
| `name` | `name_value` | 注册时去空白后至少 2 个字符 |
| `type` | `user_type` | 1 个人、2 学校；注册后不可改 |
| `idcard` + `credential_type` | `id_card_value` + `credential_type` | 个人：「身份证号」按 18 位 / 出生日期 / 校验位校验，「其他」≤ 200 字符；去空白转大写；同类型不得与其他个人账号重复。学校：`id_card_value` 存学校编号 |
| `cities` | `city_legacy_id` | 赛区编号（`cqt_regions.legacy_id`）；`userinfo.cityname` 由此解析 |
| `status` | `audit_status` | 0 通过、1 审核中、2 驳回；个人注册即 0，学校注册为 1；驳回的学校改资料自动回 1；**本人不可改** |
| `rejectreason` | `rejection_reason` | 本人不可改 |
| `zhizhao` / `chengnuoshu` | `license_file` / `commitment_file` | 只存 URL 字符串；文件经 `POST /api-web/local-files/upload`（需登录，OSS 公共读）上传后由「学校认证」页通过 `updateuserinfo` 写入；学校注册时不再上传 |
| — | `token_version` | 令牌版本；重置密码时 +1，旧令牌立即失效 |

## 3. 动作

| 动作 | 接口 | 规则 / 错误 |
| --- | --- | --- |
| 发送验证码 | `GET sendSms?phone=` | 格式 400；同号 60 秒冷却 429；同一客户端 IP 每小时 10 条 429；`sms.mode=disabled`（默认）503「短信服务未配置」；阿里云失败 503「短信发送失败，请稍后再试」（频控 429、号码非法 400），失败回滚验证码；6 位、10 分钟有效、一次性、输错 5 次作废 |
| 登录 | `POST login`（手机号 + 密码 + 验证码） | 验证码错 401；账号不存在与密码错统一 400「手机号或密码错误」；手机号重复时取 `zhongxi` 优先、`id` 最小 |
| 自动登录 | `POST autologin`（手机号 + 密码） | 同上，不要验证码（uniapp 注册后调用） |
| 注册 | `POST register` | 先校验格式再消耗验证码；手机号已注册 / 证件号已注册 409 |
| 本人资料 | `GET|POST userinfo` | 20 个字段 |
| 改资料 | `POST updateuserinfo` | 白名单字段；`phone` 不同 400「手机号不支持在此修改」 |
| 重置密码 | `POST resetPassword` | 改该手机号下全部账号的密码并 `token_version+1`；无账号 404「用户信息不存在」 |
| 承诺书模板 | `GET|POST getlinkinfo` | 配置项 `weiran.cqt.commitment-template-url` |

## 4. 用到的公共组件

无（无后台页面）。

## 5. 说明与建议

- 每个需登录的前台请求都会按主键查一次 `token_version`。
- 验证码与短信 IP 计数存在进程内（Caffeine），只适用于单实例部署。

## 6. 已知问题汇总

- **#01 ⚠️ P2 旧数据同一手机号对应多个账号（导出文件实测 3495 个号码）**
  `zhongxi` 与 `qudao` 两库合并后手机号没有唯一约束。症状：这些号码登录时只能进到 `zhongxi` 优先、`id` 最小的那个账号，
  另一个账号的参赛记录在前台看不到；重置密码会把这些账号的密码一起改掉。去重 / 合并策略待定。
- **#02 ⚠️ P3 注册「查重后插入」有并发窗口**
  手机号无唯一约束（见 #01），同一号码几乎同时提交两次注册可能插入两行；`(source_database, legacy_user_id)` 唯一键会让其中一次因编号冲突失败，但不保证。
- **#03 🚧 P2 没有前台登录日志与登录失败次数限制**
  `sys_login_log` / `@OperationLog` 绑定后台用户，前台账号的登录、改资料、重置密码都没有审计记录；密码登录（`autologin`）没有失败次数限制。
- **#04 ❓ P1 导入数据的中文乱码**
  `cqtxj2026.sql` 导出文件里姓名、学校等中文同样是双重编码，见 [`cqt_setting.md#01`](cqt_setting.md)。

- **#07 ❓ P0 阿里云短信尚未用真实凭据验证过**
  change `cqt-sms-aliyun` 的发送实现只经过假网关单测与开发模式集成测试，SDK 对真实阿里云的调用（鉴权、签名、模板）没有跑过（用户决定延后）。
  症状：若签名 / 模板未审核或 AccessKey 权限不对，上线后所有 `sendSms` 返回 503「短信发送失败」，注册与找回密码全部不可用。
  上线前按 `AGENTS.biz.md` 配好环境变量，用测试手机调一次 `GET /api-web/auth/sendSms`，看启动日志里的阿里云 `code=`。

- **#08 ⚠️ P2 学校注册时不再上传认证材料，审核时可能缺材料**
  change `cqt-file-upload` 起上传需登录，uniapp 注册页去掉了事业单位法人证书与承诺书上传，学校需在注册后到「我的 → 学校认证」补交。
  症状：只注册不补材料的学校停在审核中（`audit_status=1`），`license_file` / `commitment_file` 为空；后台审核需识别并处理（「后台学校审核」change 决定规则）。
- **#09 🚧 P2 旧系统上传的文件未迁移**
  库里已有的 `license_file` / `commitment_file` 等可能是 `admin.cqtxj.org.cn/storage/...` 等旧地址，本系统不托管这些文件。
  症状：旧服务器下线后这些地址失效，学校认证页与后台看不到旧材料。迁移另开 change。
- **#10 ⚠️ P3 上传后未被引用的文件不会清理**
  每次上传生成新的 OSS 对象，用户换文件或放弃提交后，旧对象留在 Bucket 里持续计费。

- **#11 ❓ P0 阿里云 OSS 上传尚未用真实凭据验证过**
  change `cqt-file-upload` 的 OSS 实现只经过假客户端单测与本地存储集成测试（用户决定延后）。
  症状：Bucket、Endpoint、公网前缀或 RAM 权限有误时，上线后所有上传返回 503「文件上传失败」，或返回的地址打不开（Bucket 非公共读）。
  上线前按 `AGENTS.biz.md` 配好环境变量，用测试账号上传一个文件并在浏览器打开返回的 `url`。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-10-04**
- **#05 ✅ P0 短信服务商未接入**
  change `cqt-sms-aliyun` 接入阿里云短信（`WEIRAN_CQT_SMS_MODE=aliyun`）；部署时按 `AGENTS.biz.md`「部署与数据迁移」配置环境变量与控制台。
  同时加了同一客户端 IP 每小时 10 条的发送上限，发送失败回滚验证码。
- **#06 ✅ P? change `cqt-portal-account` 建立本表与本文件**
  Flyway 建表、导入脚本、`/api-web/auth/*` 账号接口、短信验证码（开发模式）、`token_version` 令牌吊销。

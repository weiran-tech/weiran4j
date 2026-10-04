---
title: "cqt-portal-account 现实校验"
status: "done"
updated_at: "2026-10-04"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-cqt-*` | 上一切片的 `adapter/portal/**`、`domain/portal/PortalTokenCodec`、`infrastructure/security/JjwtPortalTokenCodec`、`CqtWebIT` | 本次要扩展令牌契约（加 `ver`）并复用 `/api-web` 底座 |
| `weiran-base-infrastructure` | `system/infrastructure/security/BCryptPasswordHasher.java` | BCrypt 的现成写法（CP-13 不能直接依赖，只照搬） |
| `weiran-dependencies` | BOM | jjwt 已钉版本；`spring-security-crypto`、`caffeine` 由 Spring Boot BOM 管 |
| 参考实现 | `fastapi_backend/app/routes/{auth.py,categories.py,drama.py}`、`app/security.py`、`app/config.py`、`schema_2027/004_portal_credentials_and_awards.sql` | 接口口径、字段、校验规则 |
| 原表 | `cqtxj2026.sql` 的 `portal_accounts`、`regions` | 表结构与数据形态 |
| `uniapp` | `pages/login/{login,register}.vue`、`pages/my/my.vue` | 前台真实请求字段与对响应的读取 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 前台令牌 | `weiran-cqt-infrastructure/.../security/JjwtPortalTokenCodec.java` | 载荷只有 `sub` + `typ`，**无 `ver`**（上一切片 CP-8 ⚠ 的承诺正是本次要补） |
| 前台认证 | `weiran-cqt-adapter/.../portal/PortalAuthInterceptor.java` | 只做令牌解析，不查库；解析成功即认为登录 |
| 令牌契约 | `weiran-cqt-domain/.../portal/PortalTokenCodec.java` | `issue(long)` / `parse(String) → Optional<Long>` |
| FastAPI 登录 | `auth.py:do_login` | `login` 要求验证码 + 密码；`autologin` 只要密码；账号不存在返回「用户信息不存在」、密码错返回「密码错误」（**违反 CP-10**），code 201 |
| FastAPI 注册 | `auth.py:register` | 个人校验证件（`drama.py:normalize_credential` → 身份证 18 位、出生日期、校验位）；手机号唯一；个人证件号同类型唯一；`audit_status` 一律 0；`legacy_user_id` 取 `zhongxi` 最大值 + 1 |
| FastAPI 改资料 | `auth.py:update_userinfo` | 白名单含 `phone`、`rejectreason`（**用户可改驳回原因、可不验证改手机号**） |
| FastAPI 短信 | `auth.py:send_sms` | 进程内字典存验证码；`SMS_PROVIDER=disabled` 时 503；`SMS_EXPOSE_CODE` 回显；TTL 600 秒；每 IP 每分钟 5 次 |
| FastAPI userinfo | `auth.py:account_response` | 20 个字段，`cityname` 由 `regions.legacy_id = city_legacy_id` 查得，`credential_type` 输出「其他」/「身份证号」 |
| FastAPI regions | `categories.py:regions` | `SELECT legacy_id id,parent_legacy_id pid,name,code FROM regions ORDER BY parent_legacy_id,id` |
| 原表 `portal_accounts` | `cqtxj2026.sql` | 明文存储姓名 / 手机号 / 证件号（「敏感字段加密」只在旧 Laravel 存在过）；`password_hash` 为 Laravel `$2y$10$`；`UNIQUE(source_database, legacy_user_id)`；手机号**无**唯一约束；dump 里没有 `credential_type`（由 `schema_2027/004` 后加） |
| 原表 `regions` | `cqtxj2026.sql` | `legacy_id` 唯一、`parent_legacy_id` 索引，约 63 行 |
| uniapp 登录 | `login.vue:312-345` | POST `{type:1, phone, password, code}`，存 `res.data.data` 为 `loginInfo`（读 `access_token`），随后调 `userinfo` |
| uniapp 注册 | `register.vue:586-700` | 个人 `{type:1,name,phone,code,sex,idcard,credential_type,cities,school,schoolid,password,password_confirmation}`；学校 `{type:2,name,contact,phone,code,sex,idcard,cities,school,schoolid,email,zhizhao,chengnuoshu,…}`；成功后调 `autologin {phone,name,password}` 再调 `userinfo` |
| uniapp 改资料 | `my.vue:2711-2770` | 个人带 `phone`；学校带 `phone`、`zhizhao`、`chengnuoshu`、`chengnuoshuname`、`tupiantype` |
| uniapp 状态显示 | `my.vue:144-146` | `status` 0=审核通过、1=审核中、2=审核驳回 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `/api-web` 底座 | `weiran-cqt-adapter/.../portal/**` | `@PortalController`、`@PortalPublic`、`PortalResult`、`PortalExceptionAdvice` 直接用 | 拦截器要改：解析后查库比对 `token_version` |
| `JjwtPortalTokenCodec` | `weiran-cqt-infrastructure` | 扩展载荷加 `ver` | 是（契约变更） |
| `BCryptPasswordHasher` 写法 | `weiran-base-infrastructure` | 照搬到 `weiran-cqt-infrastructure`（CP-13 不能依赖基座实现） | — |
| `spring-security-crypto` 的 `BCryptPasswordEncoder` | Spring Boot BOM | `matches` 原生支持 `$2a/$2b/$2y` 前缀 | 否 |
| Caffeine | Spring Boot BOM | 验证码存储与发送冷却 | 否 |
| `CommonErrors` | `weiran-common` | 400 / 401 / 409 / 503? —— 见约束 | 部分不够，见下 |
| `IntegrationTestSupport` + `CqtWebIT` | `weiran-app/src/test` | 新增 `CqtAccountIT`；`CqtWebIT` 的令牌用例要改为基于真实账号 | 是 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| `CommonErrors` 只有 400/401/403/404/409/500，没有 429（发送过频）与 503（短信未配置） | `weiran-common/.../CommonErrors.java` | 需要在 `weiran-cqt-api` 新增业务错误码（号段 `20`–`39`，CP-14）：`42920` 发送过频、`50320` 短信服务未配置，以及验证码错误、手机号已注册等需要前端区分的码。前台 body `code` 取前三位即 429 / 503，与 FastAPI 一致 |
| 前台 401 的语义在 uniapp 里是「未登录」：`code==401` 会把登录态置为 false | `uniapp/main.js:170-176` | 「验证码错误」在 FastAPI 是 401，uniapp 收到后会把用户置为未登录并弹窗——注册 / 登录页本来就未登录，行为无害；沿用 401 |
| `PortalTokenCodec.parse` 目前只返回账号 ID | 上一切片契约 | 改为返回 `(accountId, version)`；比对 `token_version` 需要查库，放在应用层的认证服务里，拦截器调它 |
| 手机号在旧数据中可能重复（`zhongxi` 与 `qudao` 合并） | `portal_accounts` 无手机号唯一约束；FastAPI 登录 `ORDER BY FIELD(source_database,'zhongxi','qudao'), id` | 不能加唯一索引；登录按同样顺序取第一条；注册查重按「存在任一行即已注册」 |
| 注册的「查重后插入」有并发窗口 | 无唯一约束 | 同一手机号并发注册可能产生两行；登录口径能容忍（取第一条），登记为已知问题 |
| `legacy_user_id` 是 `(source_database, legacy_user_id)` 唯一键的一部分且 NOT NULL | 原表 | 新注册沿用 FastAPI：`source_database='zhongxi'`、`legacy_user_id = MAX+1`（同样有并发窗口，唯一键会让并发冲突的那次失败） |
| 原表明文存储姓名、手机号、证件号 | 原表 | 本次保持明文（interview 明确不做加密）；日志只出现手机号掩码 |
| `CqtWebIT` 用 `portalTokenCodec.issue(42L)` 给不存在的账号签令牌 | 上一切片测试 | 加了 `token_version` 校验后这些用例会变成 401，需要改为先插入账号行 |
| `IntegrationTestSupport` 所有 IT 共享数据库 | 同上 | 账号测试用唯一手机号（`unique()` 派生），不删全表 |
| `audit_status` 语义：0 通过 / 1 审核中 / 2 驳回 | `my.vue:144-146` | 与 interview #3 一致 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran-cqt-domain`：`account/`（账号模型、证件校验、改资料规则、仓储端口）、`region/`（仓储端口）、`sms/`（验证码规则、发送端口、存储端口）；`portal/PortalTokenCodec` 改签名 | 新增 / 改造 |
| `weiran-cqt-api`：`CqtErrors`（错误码枚举）、账号 / 赛区 / 短信服务接口与命令 / 视图 | 新增 |
| `weiran-cqt-application`：账号、认证、短信、赛区应用服务 | 新增 |
| `weiran-cqt-infrastructure`：`cqt_portal_accounts` / `cqt_regions` 的 DO / Mapper / 仓储；BCrypt；Caffeine 验证码存储；开发模式短信发送；JJWT 加 `ver`；配置属性；Flyway 两个脚本；`build.gradle.kts` 加 `spring-security-crypto`、`caffeine` | 新增 / 改造 |
| `weiran-cqt-adapter`：`AuthController`（`/api-web/auth/**`）、`CompetCategoryController`（`/api-web/competcategory/regions`）；`PortalAuthInterceptor` 改为调认证服务 | 新增 / 改造 |
| `weiran-app/src/test`：新增 `CqtAccountIT.java`；改 `CqtWebIT.java`（令牌用例基于真实账号） | 新增 / 改造（下游自有文件） |
| `scripts/biz/import/{cqt_portal_accounts,cqt_regions}.sql` | 新增 |
| `weiran4j/docs/business-modules.md` 不变（号段已领）；`AGENTS.biz.md` 补短信 / 账号配置项；`state/bizs/{cqt_portal_accounts,cqt_regions}.md` + 索引 | 新增 / 改造 |

**不会碰的目录**：`weiran-common/`、`weiran-framework/`、`weiran-base/`、`weiran-dependencies/`、`build-logic/`、`web/`、`uniapp/`、`weiran-app/src/main/`、`weiran-app/build.gradle.kts`、`openspec/rules/`、`openspec/schemas/`、`openspec/guards/`，以及任何上游已有文件。

### 共享层命中 ⚠️

<!-- openspec:slot shared-layers -->

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 | 未命中：不新增模块 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 | 未命中：`spring-security-crypto`、`caffeine` 由 Spring Boot BOM 管版本 |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 | 未命中 |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 | 未命中 |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) | 未命中 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 | 未命中：业务错误码放 `weiran-cqt-api` 的 `CqtErrors`（号段 20–39） |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 | 未命中 |

#### 序号型资源(本仓库暂无)

模板此段已过时（本仓库用 Flyway）。本次新增 `db/migration/cqt/V202610041000__cqt_portal_accounts.sql`、`V202610041001__cqt_regions.sql`，下游独占目录、单 change 串行，归 Layer 0。
另：`weiran-cqt-domain` 的 `PortalTokenCodec` 签名变更被 infrastructure（实现）、application（认证服务）、adapter（拦截器）、测试共同消费，按「被 2 个以上执行单元读取」进 Layer 0 冻结。

<!-- /openspec:slot shared-layers -->

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| AC-1 用 `code` 429 / 503 | `CommonErrors` 无对应码 | 在 `weiran-cqt-api` 新增业务错误码（号段 20–39），前三位即 429 / 503，AC 不变 | ☑（AC 表述不变，无需改） |
| 无 | 加 `token_version` 后上一切片 `CqtWebIT` 的令牌用例会失效 | 本次一并改 `CqtWebIT`，并 MODIFIED `cqt-portal-api` 的令牌与登录校验需求 | ☑（已在「对下游的硬约束」写明 MODIFIED） |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 每个前台请求多一次查库（比对 `token_version`） | 需登录接口 | 按主键查单列，开销可忽略；需要时再加短 TTL 缓存（本次不做） |
| 导入数据的中文乱码 | `cqtxj2026` 若与导出文件一样乱码 | 已登记 `cqt_setting.md#01`，本次不处理，账号文档里引用它 |
| 开发模式短信误用于生产 | 生产配了 `dev` 实现 | 开发模式发送时记 warn；回显开关默认关闭；`AGENTS.biz.md` 写明生产禁止 |
| `CqtWebIT` 改动影响上一能力的回归 | 改测试数据准备方式 | 断言不变，只改令牌来源 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子

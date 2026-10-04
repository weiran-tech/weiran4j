---
title: "cqt-portal-account 任务"
status: "done"
updated_at: "2026-10-04"
---

# Tasks

## 2. 领域层 `*-domain` / `*-api`(TG-2)

- [x] 2.1 前台令牌契约改为带版本：签发（账号 ID + 版本）与解析（→ 账号 ID + 版本）（cqt-portal-api/FR-003）
- [x] 2.2 证件规则：证件类型别名、证件号规范化、身份证 18 位 / 出生日期 / 校验位校验（cqt-account/FR-003）
- [x] 2.3 账号模型与注册规则：类型、名称、手机号、密码与确认、个人 / 学校初始审核状态（cqt-account/FR-003）
- [x] 2.4 改资料规则：白名单合并、手机号不可改、个人证件重新校验、驳回学校回审核中（cqt-account/FR-005）
- [x] 2.5 验证码规则：6 位、10 分钟有效、60 秒冷却、一次性、重发使旧码失效、输错 5 次作废（cqt-sms-verification/FR-001、cqt-sms-verification/FR-002）
- [x] 2.6 端口：账号仓储、赛区仓储、密码哈希、短信发送、验证码存储（cqt-account/FR-001、cqt-region/FR-001、cqt-sms-verification/FR-001）
- [x] 2.7 对外契约：业务错误码 `CqtErrors`（序号段 20–39）；账号、短信、赛区、前台认证服务接口与视图（cqt-account/FR-002、cqt-portal-api/FR-004）

## 3. 应用与基础设施层 `*-application` / `*-infrastructure`(TG-3)

- [x] 3.1 Flyway：`cqt_portal_accounts`（原列 + `credential_type` + `token_version` + 手机号 / 证件号前缀索引）、`cqt_regions`（cqt-account/FR-001、cqt-region/FR-001）
- [x] 3.2 账号与赛区的持久化映射与仓储实现；按手机号取账号的顺序（`zhongxi` 优先、`id` 升序）（cqt-account/FR-001、cqt-account/FR-002、cqt-region/FR-002）
- [x] 3.3 BCrypt 密码哈希，兼容 `$2y$`（cqt-account/FR-001）
- [x] 3.4 JJWT 令牌载荷加 `ver`，缺 `ver` 视为无效（cqt-portal-api/FR-003）
- [x] 3.5 验证码内存存储（Caffeine）与开发模式短信发送（按配置注册）（cqt-sms-verification/FR-001、cqt-sms-verification/FR-003）
- [x] 3.6 统一配置 `weiran.cqt.*`（jwt / sms / 模板链接 / BCrypt 强度）与 `application-biz.yml`（cqt-sms-verification/FR-003、cqt-account/FR-007）
- [x] 3.7 应用服务：短信发送与校验（cqt-sms-verification/FR-001、cqt-sms-verification/FR-002）
- [x] 3.8 应用服务：登录 / 自动登录（cqt-account/FR-002）
- [x] 3.9 应用服务：注册（cqt-account/FR-003）
- [x] 3.10 应用服务：本人资料读取（含赛区名称）与修改（cqt-account/FR-004、cqt-account/FR-005）
- [x] 3.11 应用服务：重置密码并递增 `token_version`（cqt-account/FR-006）
- [x] 3.12 应用服务：前台认证（解析令牌 + 比对 `token_version`）（cqt-portal-api/FR-004）
- [x] 3.13 应用服务：赛区列表、承诺书模板链接（cqt-region/FR-002、cqt-account/FR-007）
- [x] 3.14 导入脚本 `cqt_regions.sql`、`cqt_portal_accounts.sql`（证件号规范化、类型推断、不覆盖已有 `token_version`）（cqt-region/FR-001、cqt-account/FR-001）

## 4. 适配层 `*-adapter`(TG-4)

- [x] 4.1 `PortalAuthInterceptor` 改为调用前台认证服务（cqt-portal-api/FR-004）
- [x] 4.2 `AuthController`：`/api-web/auth/{sendSms,login,autologin,register,userinfo,updateuserinfo,resetPassword,getlinkinfo}`，字段名照 uniapp、数字类入参宽松解析（cqt-account/FR-002、cqt-account/FR-003、cqt-account/FR-004、cqt-account/FR-005、cqt-account/FR-006、cqt-account/FR-007、cqt-sms-verification/FR-001）
- [x] 4.3 `CompetCategoryController`：`/api-web/competcategory/regions`（cqt-region/FR-002）
- [x] 4.4 自动配置登记新增的仓储、服务、Controller（cqt-account/FR-002）

## 5. 测试

- [x] 5.1 领域单测：证件校验、注册规则、改资料规则、验证码规则
- [x] 5.2 令牌单测：带 `ver` 往返、缺 `ver` 无效
- [x] 5.3 集成测试 `CqtAccountIT`：`cqt-account` / `cqt-sms-verification` / `cqt-region` 全部场景
- [x] 5.4 `CqtWebIT` 调整：令牌基于真实账号，新增账号不存在 / 版本过时两种无效令牌
- [x] 5.5 导入脚本在一次性 MySQL 容器中两遍执行

## 6. 发布

- [ ] 6.1 生产保持 `weiran.cqt.sms.mode=disabled` 直到短信服务商接入；切换时按顺序执行两份导入脚本
- [x] 6.2 下游文档：`AGENTS.biz.md` 补配置项与「短信未接前账号功能不上线」；`state/bizs/{cqt_portal_accounts,cqt_regions}.md` 与索引（含已知问题）

## 7. 上线后

- [ ] 7.1 验收记录写入 `artifacts.md`(只写 verify.md 没有的:人读摘要 / 运行时验证 / 已知缺口)

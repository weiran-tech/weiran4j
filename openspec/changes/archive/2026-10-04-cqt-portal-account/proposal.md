---
title: "cqt-portal-account：前台账号登录注册"
owner: "zhaody901@gmail.com"
status: "done"
created_at: "2026-10-04"
updated_at: "2026-10-04"
---

# Proposal

## Why

- 背景：`cqt-web-foundation` 立住了 `/api-web` 底座和前台令牌，但还没有任何账号，uniapp 的登录、注册、个人资料、找回密码都打不通。
- 业务目标：参赛个人与学校能在 uniapp 上注册、登录、维护资料、找回密码，后续报名、成绩、证书切片都以此为前提。
- 当前问题：前台令牌没有吊销机制（上一切片宪法对照 CP-8 ⚠ 的遗留）；FastAPI 版登录会泄露账号是否存在（CP-10）、改资料可以不验证改手机号和驳回原因。
- 需求来源：见 `interview.md`

## What Changes

- 新增：`/api-web/auth/{sendSms,login,autologin,register,userinfo,updateuserinfo,resetPassword,getlinkinfo}`、`/api-web/competcategory/regions`；
  表 `cqt_portal_accounts`、`cqt_regions` 与导入脚本；短信验证码（端口 + 开发模式实现 + 内存存储）；BCrypt 密码；业务错误码 `CqtErrors`。
- 改造：前台令牌载荷加 `ver`，每次请求比对账号的 `token_version`（重置密码即失效）；`PortalAuthInterceptor` 改为调用认证服务；`CqtWebIT` 的令牌用例改为基于真实账号。
- 复用（来自 `explore.md` 的可复用点）：`/api-web` 底座全部注解与异常出口；`BCryptPasswordEncoder`（原生兼容 `$2y$`）；Caffeine；`IntegrationTestSupport`。
- 下线/不做：见 Out of Scope。

## Scope

### In Scope

- 短信验证码发送与校验（开发模式），同号 60 秒冷却、10 分钟有效、一次性
- 登录（密码 + 验证码）、自动登录（密码）、注册（个人 / 学校）、个人资料读取与修改、重置密码
- 承诺书模板链接、赛区列表
- 前台令牌吊销（`token_version`）
- 两张表的 Flyway 与导入脚本；集成测试

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 文件上传接口（`/api-web/local-files/upload`）与附件存储方案——另开 change
- 真实短信服务商对接（阿里云等）——另开 change
- 后台管理：前台账号列表、学校审核通过 / 驳回、`/api/cqt/**` 接口与 `web/` 页面——另开 change
- `getexinfo`（Excel 导入模板）、`getsecondcat`（二级赛项）——属于报名 / 导入切片
- 修改手机号的流程（需新号码验证码，uniapp 也要改）
- 字段加密存储（旧库与 `cqtxj2026` 均为明文，本次保持）
- `X-CQTXJ-Database` 请求头（2026/2027 库切换）
- 修复 `cqtxj2026.sql` 的中文乱码（`cqt_setting.md#01` 已登记，账号表同样受影响，统一处理）
- 修改任何上游（weiran4j）文件

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `cqt-portal-api` | MODIFIED | 前台令牌载荷加 `ver`、登录校验比对账号 `token_version`（FR-003、FR-004） |
| `cqt-account` | ADDED | 前台账号（个人 / 学校）：注册、登录、资料读写、重置密码、审核状态流转、证件与手机号规则 |
| `cqt-sms-verification` | ADDED | 前台短信验证码：发送频率、有效期、一次性校验、服务未配置时的行为、开发模式 |
| `cqt-region` | ADDED | 赛区：`cqt_regions` 存储与前台赛区列表接口 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 新增/改造跨模块错误码、分页契约 | 不动 | — |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 新增/改造账号、RBAC、JWT 登录相关能力 | 不动（上游基座）；业务代码全部在 `weiran-cqt-*` | zhaody901@gmail.com |
| PK-3 | `weiran-app` | 新增模块依赖聚合(通常只在新增整个模块时才动) | 不改已有文件；`src/test` 下新增 `CqtAccountIT.java`，改下游自有的 `CqtWebIT.java` | zhaody901@gmail.com |
| PK-4 | `web` | 新增/改造 page、hook、组件 | 不动 | — |

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☐ | 不新增模块；新依赖版本由 Spring Boot BOM 管 |
| `weiran-common` 的错误码/分页契约 | ☐ | 业务错误码放 `weiran-cqt-api`（号段 20–39） |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 自动 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 无后台页面 |

另：Flyway 两个新脚本与 `PortalTokenCodec` 签名变更归 Layer 0（见 explore）。

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 前台接口不走后台 RBAC，不新增 `cqt:` 权限码 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 无后台页面 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☑ | 前台账号只能读写**自己的**资料：`userinfo` / `updateuserinfo` 只按令牌里的账号 ID 操作，不接受请求里的账号 ID |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☐ | `@OperationLog` 与 `sys_login_log` 绑定后台用户（`CurrentUser`），前台账号不适用；前台登录审计（登录日志表）本次不做，登记为已知缺口 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☑ | 日志不得出现密码、验证码、令牌、证件号、完整手机号（只记掩码 `155****6215`）；`userinfo` 返回本人完整资料（uniapp 回填表单需要） |
| CC-7 幂等 (`idempotency`,尚未引入) | ☑ | 验证码一次性使用；注册查重后插入存在并发窗口（无手机号唯一约束），登记为已知问题；`resetPassword` 重复提交同一密码无副作用 |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 学校审核状态只做字段流转，审核动作在后台 change |

## Dependencies

- 产品/设计：无
- 后端：上一切片 `/api-web` 底座；`spring-security-crypto`、`caffeine`（Spring Boot BOM）
- 前端：uniapp 不改
- 数据库变更：新增 `cqt_portal_accounts`（列同 `cqtxj2026.portal_accounts` + `credential_type` + `token_version`）、`cqt_regions`（列同 `regions`）；数据走导入脚本
- 运维/配置：`weiran.cqt.sms.mode`（`disabled` / `dev`，默认 `disabled`）、`weiran.cqt.sms.expose-code`（默认 false）、`weiran.cqt.commitment-template-url`、`weiran.cqt.bcrypt-strength`
- 测试：`CqtAccountIT` + 领域单测；`CqtWebIT` 调整

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 旧数据手机号重复 | 两库合并 | 登录按 FastAPI 顺序取第一条；登记已知问题，去重留后续 |
| 注册并发重复 | 同号同时注册 | 无唯一约束可兜；登记已知问题 |
| 开发模式短信误上生产 | 配置错误 | 默认 `disabled`；`dev` 模式发送记 warn；文档写明 |
| 每请求查库 | 需登录接口 | 主键单列查询，开销可忽略 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

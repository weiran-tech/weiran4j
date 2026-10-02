---
title: "cqt-web-foundation：uniapp 前台接口 /api-web 底座 + 站点配置接口"
owner: "zhaody901@gmail.com"
status: "done"
created_at: "2026-10-02"
updated_at: "2026-10-02"
---

# Proposal

## Why

- 背景：常青藤赛事系统的后台用 weiran4j 框架重建（mono4j，weiran4j 的 fork 下游），前台沿用原 uniapp。
  uniapp 已改为调用 `/api-web/**`，但后端还没有任何 `/api-web` 接口。
- 业务目标：打通「uniapp → `/api-web` → weiran-cqt → MySQL」第一条链路，并把所有前台接口都要用的公共底座一次立住。
- 当前问题：uniapp 的响应约定（`{code:200}`、HTTP 恒 2xx、未登录 `code:401`）与框架后台约定（`{code:0}`、HTTP 状态即错误类别）不兼容；
  C 端用户不是后台管理员，不能走框架 `TokenAuthenticator`。
- 需求来源：见 `interview.md`

## What Changes

- 新增：`/api-web` 响应包络与专属异常处理；C 端 JWT 签发 / 校验服务与 `/api-web/**` 拦截器（含公开接口注解）；
  `GET /api-web/product/getconfig`；表 `cqt_setting`（Flyway）与导入脚本 `scripts/biz/import/cqt_setting.sql`；`application-biz.yml`。
- 改造：`weiran-cqt-infrastructure/build.gradle.kts` 增加 jjwt 依赖；`AGENTS.biz.md` 补 `/api-web` 约定细节。
- 复用（来自 `explore.md` 的可复用点）：`BizException` / `CommonErrors`（不新增错误码）、`@SkipApiResponse`、
  `JwtTokenCodec` 与字典模块的写法（照搬结构，不依赖其实现）、`IntegrationTestSupport`。
- 下线/不做：见 Out of Scope。

## Scope

### In Scope

- `/api-web` 统一包络 `{code, message, data}`，成功 `code=200`
- `/api-web` 异常处理：HTTP 恒 200，`code` = 五位错误码前三位，覆盖业务异常、参数校验类 Spring MVC 异常与未预期异常
- C 端 JWT（HS256，`typ=cqt-web`，密钥走环境变量）与 `/api-web/**` 拦截器，默认需登录，公开注解免登录
- `GET /api-web/product/getconfig`（公开），口径与 FastAPI 实现一致
- `cqt_setting` 表（列同 `cqtxj2026.sc_setting`）与一次性导入脚本
- 集成测试与领域单测；`state/bizs/cqt_setting.md` 现状文档

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 登录 / 注册 / 短信 / 自动登录等账号接口（`/api/auth/*` 那一组）——放账号 change
- `getconfig` 以外的任何业务接口（新闻列表、赛事、报名、成绩…）
- `cqt_setting` 的后台管理页面（`web/`）与 `/api/cqt/**` 后台接口
- `X-CQTXJ-Database` 请求头（按年份切 2026/2027 库）的处理——服务端忽略它
- 兼容 FastAPI 旧 JWT（旧密钥、`source`/`database`/`actor` claims）
- 限流（FastAPI 的 `rate_limit`）
- uniapp 里 Dcat 时代的旧上传接口 `upload/image`、`Upload/file`
- 修改任何上游（weiran4j）文件

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `cqt-portal-api` | ADDED | 常青藤前台（uniapp）接口 `/api-web/**` 的公共约定：响应包络、错误语义（HTTP 恒 200 + body code）、C 端令牌认证与公开接口 |
| `cqt-site-config` | ADDED | 前台站点配置：`cqt_setting` 的存储口径与 `GET /api-web/product/getconfig` 的键映射、清洗规则 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 新增/改造跨模块错误码、分页契约 | 不动（只复用 `CommonErrors` / `BizException`） | — |
| PK-2 | `weiran-base-*`(api/domain/application/infrastructure/adapter) | 新增/改造账号、RBAC、JWT 登录相关能力 | 不动（上游基座；业务模块 `weiran-cqt-*` 五层全部新增代码） | zhaody901@gmail.com |
| PK-3 | `weiran-app` | 新增模块依赖聚合(通常只在新增整个模块时才动) | 不改已有文件；在 `src/test` 下新增 `CqtWebIT.java` 与 `application-biz-test.yml` | zhaody901@gmail.com |
| PK-4 | `web` | 新增/改造 page、hook、组件 | 不动 | — |

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☐ | 自动发现（D-012），`weiran-cqt` 已识别；jjwt 版本已在 BOM |
| `weiran-common` 的错误码/分页契约 | ☐ | 只复用，不新增 |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 依赖与覆盖率聚合自动生成 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 无后台页面 |

另：Flyway 新脚本 `db/migration/cqt/V202610022200__cqt_setting.sql` 属序号型资源，归 Layer 0（见 explore）。

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 前台接口不走后台 RBAC；本次无 `/api/cqt/**` 接口，不新增 `cqt:` 权限码 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 无后台页面与菜单 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ | 站点配置是全站公共数据 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☐ | 只读接口；`@OperationLog` 依赖后台 `CurrentUser`，前台接口不使用 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☑ | C 端令牌不得写入日志（校验失败只记异常类名，照 `JwtTokenCodec`）；站点配置为公开内容无需脱敏 |
| CC-7 幂等 (`idempotency`,尚未引入) | ☐ | 只读 GET |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 不涉及 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

## Dependencies

- 产品/设计：无
- 后端：jjwt（BOM 已有）、上游 D-012 扩展点（`@SkipApiResponse`、`application-biz.yml` 导入、Flyway out-of-order）
- 前端：uniapp 已在初始化提交里改写到 `/api-web`，本次不改
- 数据库变更：新增 `cqt_setting`（只建表）；数据由 `scripts/biz/import/cqt_setting.sql` 在切换时从 `cqtxj2026.sc_setting` 导入。
  本仓库不对照 PHP `weiran-v1`（D-008 起不兼容），对照对象是 `cqtxj2026` 原表结构
- 运维/配置：新增环境变量 `WEIRAN_CQT_JWT_SECRET`（≥ 32 字节，必填）、`WEIRAN_CQT_JWT_TTL`（可选）
- 测试：Testcontainers 集成测试 + 领域单测

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| C 端密钥为空导致所有 IT 启动失败 | 测试 profile 未提供 C 端密钥 | `application-biz-test.yml` 提供测试密钥；L5 第一步验证其被加载 |
| 覆盖率聚合跌破 70% | 新代码未被 IT 覆盖 | IT 覆盖全部分支：公开 / 三种令牌状态 / 业务异常 / 校验异常 / 未预期异常 |
| 归档时重新生成 `openspec/specs/README.md`（上游文件） | `openspec archive` 后 `--write-index` | 生成物，同步上游冲突时重新生成；`upstream-boundary.sh` 需放行该生成文件（本次一并调整） |
| 部署忘配 `WEIRAN_CQT_JWT_SECRET` | 生产启动 | 启动即失败并给出明确提示（与后台 JWT 同策略） |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

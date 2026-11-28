---
title: "Wuli3 1.1.1 基础设施接入设计"
status: "approved"
approved_by: "用户"
approved_at: "2026-11-27"
updated_at: "2026-11-27"
---
# Design

## Context

来源 interview.md 与 explore.md。正式 BOM 已使用本机 read:packages 身份从 GitHub Packages 下载成功。本阶段接入版本平台、core 和 MySQL starter，保持 Weiran 对外契约。用户已明确改用 Wuli3，现行 D-008 的“移除 wuli3”结论需由新决策说明后续变化，不篡改历史记录。

## 宪法对照

| 原则 | 判定 | 说明 |
|---|---|---|
| CP-1 领域层不依赖框架 | ☑ | 新 starter 仅 implementation，domain/api 仍只读纯 Java 契约 |
| CP-2 依赖方向单向向内 | ☑ | 仅 framework 外层依赖外部基础设施 |
| CP-3 持久化类型不跨层 | ☑ | 不改变 DO/Mapper 位置和端口签名 |
| CP-4 版本号只有一个来源 | ☑ | Wuli3 版本只在统一 BOM 声明，移除其已管理版本复述 |
| CP-5 质量规则只在 build-logic 里配置 | ☑ | 沿用 build-logic 质量约定，不迁移或关闭检查 |
| CP-6 豁免必须最小且带理由 | ☑ | 只保留仍成立且带理由的版本漂移豁免 |
| CP-7 表结构只经 Flyway 迁移变更，已发布的迁移永不修改 | ☑ | 不改表、不改任何历史迁移 |
| CP-8 密码只用 BCrypt，令牌吊销只走 token_version | ☑ | 保留 BCrypt、token_version 与 Cookie/CSRF |
| CP-9 凭据不进版本库、不进日志 | ☑ | 仓库凭据由外部配置与构建 secret 注入 |
| CP-10 认证失败不泄露账号存在性 | ☑ | 保留现有统一登录失败错误 |
| CP-11 错误码归属决定 HTTP 状态，不靠 Controller 判断 | ☑ | 保留 ErrorCode.httpStatus 和现有异常处理器 |
| CP-12 依赖只能业务 → 基座 → 框架，反向与同层横向禁止 | ☑ | 保持业务→基座→框架方向 |
| CP-13 业务只经基座的 `weiran-system-api` 接触基座 | ☑ | 业务仍只经 system-api 接触基座 |
| CP-14 错误码按号段分配，业务不得占用框架与基座的号段 | ☑ | 不新增错误码或改变号段 |
| CP-15 权限码、菜单 id 与 Flyway 模块段按层隔离 | ☑ | 不新增权限、菜单或 Flyway 序号 |

## Architecture

weiran-dependencies → Wuli3 BOM 1.1.1 → Boot/MP 等平台；weiran-framework 以 implementation 消费 core/MySQL starter。Weiran 的错误码、响应、分页、认证与审计构成兼容层；业务仍通过既有接口消费。

不引入 Wuli3 Web、permission、audit、RPC、消息、Redis 等 starter；这避免重复协议和新增中间件要求。完整替换认证、响应与审计属于后续单独兼容迁移，不在本阶段隐藏完成。

## Data Flow

1. 构建从 GitHub Packages 认证解析 Wuli3，其他依赖仍由 Maven Central 解析。
2. 应用启动基础上下文与 MySQL 依赖；保留已有请求号、可信 IP、认证、授权、审计填充、分页与 Jackson 行为。
3. 请求继续按原 Cookie/CSRF/JWT → 权限 → 领域用例 → 持久化 → 原响应/异常处理流转。

## 跨模块契约变更(DS-1)

| 对象 | 动作 | 消费方 |
|---|---|---|
| Wuli3 版本平台 | 1.1.1 集中管理，清理其已管理的版本重复声明 | 后端所有模块 |
| Java/HTTP 公共协议 | 不改类型、字段、数字 code、错误状态 | 全部后端及前端 |
| 解析器 | 保留现有 mybatis-plus-jsqlparser，排除 starter 的 jsqlparser-4.9 | 持久化层 |

## API Design(DS-2)

无新增路由，Controller/DTO 和 OpenAPI 不变。ApiResponseBodyAdvice/GlobalExceptionHandler 保持唯一有效 Weiran 包装与错误转换；不启用 Wuli3 Web 默认身份头恢复。

## Database Design(DS-3)

不改表、索引、菜单或迁移。继续使用 MySQL 8 与原 MyBatis 分页、审计字段策略。

## 权限与已知缺口(DS-4)

不增加权限码、菜单、写接口。不替换 BCrypt/JWT/Cookie/CSRF/token_version 与 RequiresPermission。现有登录和操作日志必须通过回归。数据范围、多租户和审批不在范围。

## 分层与装配(DS-5)

starter 只在 framework 外层 implementation 引入。保留本仓 Gradle 质量约定，避免一次迁移全部插件。依赖版本不再复述 Wuli3 已管理的库；依赖快照继续执行 verifyFrameworkVersions。

GitHub Packages 仓库限定 com.wulicode.wuli3，避免向私有源发送无关依赖请求。本地凭据从用户级 Gradle 属性或明确环境变量注入；不自动执行 gh auth token。CI 使用获包访问授权的 GITHUB_TOKEN 与 packages:read，无法授权时使用专用 PACKAGES_READ_TOKEN。Docker 使用 BuildKit secret，不以 ARG/ENV 固化密钥。

core 的日志/关闭行为必须尊重现有项目配置；若重复，则只关闭具体的 Wuli3 可选行为并说明理由，不关闭框架整体或质量门禁。

## 前端设计(DS-6)

不改前端、路由、菜单、组件和 docs 演示；HTTP 包络和分页字段保持不变，因此不改 types/api.ts。

## Observability

保留 requestId、访问日志、异步 MDC 和 sys_operation_log/sys_login_log。新增仓库认证异常只输出缺少的配置键，不输出凭据。通过 dependencyInsight、版本漂移报告和启动/集成测试定位冲突。

## Test Plan

| 层级 | 范围 | 命令 |
|---|---|---|
| 制品 | 真实 GitHub Packages BOM 与 starter | 认证下载与 Gradle dependencyInsight |
| 格式与全量 | 编译、质量、依赖版本、单元及集成测试 | JDK 21 ./gradlew spotlessApply，随后 check --no-daemon |
| 合约 | Cookie/CSRF、权限、分页、审计与响应 | framework/app 既有测试，补充必要的装配及单解析器断言 |
| 规格 | 规格和现行规则一致性 | pnpm openspec:check |

## Rollout Plan

1. 确认跨仓 package Actions 读取授权与本地只读凭据配置。
2. 替换依赖平台，接入基础 starter，解决真实冲突并完成全量回归。
3. 更新架构决策、现行指南和容器/CI 认证注入；无数据库发布动作。

## Rollback Plan

1. revert 本 change 最终实现提交；代码基线为 f17c86f，保留本会话已授权的 Boot 3.5.15 / MP 3.5.16 调整。
2. 无数据库迁移，不需要数据回滚。
3. 去除 Wuli3 运行时依赖和专属仓库配置，恢复原 framework 装配。

## Open Questions

- 无。正式仓库和本机下载已确认，CI 跨仓读取需在实现时验证；失败时如实报告权限配置要求。

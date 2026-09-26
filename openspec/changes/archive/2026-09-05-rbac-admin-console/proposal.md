---
title: "RBAC 后台管理控制台（角色 / 账号 / 封禁）"
owner: "duoli"
status: "draft"
created_at: "2026-09-04"
updated_at: "2026-09-04"
---

# Proposal

## Why

- 背景：weiran4j 是 PHP 项目 weiran-v1 的 Java 重做，PHP 侧 `mgr-page` 是一套完整的后台管理框架（Blade + LayUI 服务端渲染），承载角色管理、账号管理、风险拦截等十余个业务模块。Java 后端目前只有登录/鉴权两个只读接口，前端只有登录页和一个鉴权示例首页，没有任何管理后台能力。
- 业务目标：把 mgr-page 的管理能力迁移到 weiran4j，前端改用 Semi Design 组件、后端改用 REST API + JSON，取代 PHP 侧的服务端渲染方式（`docs/10-模块映射.md` 已明确 mgr-page 由前端 `web/` 取代）。
- 当前问题：全量复刻涉及 12+ 个业务模块，工作量巨大且各模块高度相似（列表 + 表单弹层 + 删除的标准三件套）。若不先定型一套可复用的实现模式（Java 五层建模、REST API 设计、Semi 页面模式），后续每个模块都要重新摸索，返工成本会成倍放大。
- 需求来源：见 `interview.md`

## What Changes

- 新增：
  - `weiran-system-domain`：角色/权限管理所需的可编辑领域模型（在 design 阶段确定与现有 `rbac/Role`、`rbac/Permission` 只读值对象的关系）、`Ban` 聚合根，以及对应的仓储端口。
  - `weiran-system-application`：角色管理、账号管理（含登录日志只读查询）、封禁管理三个应用服务。
  - `weiran-system-infrastructure`：`pam_role`/`pam_permission`/`pam_role_account`/`pam_permission_role`/`pam_ban` 五张既有表的 MyBatis-Plus DO/Mapper/Repository 实现。
  - `weiran-system-adapter`：`RoleController`、`PamController`（账号管理 + 登录日志）、`BanController` 三个 REST 端点，及对应请求/响应 DTO。
  - `web`：`AdminLayout`（Semi `Layout` + `Nav` 侧边栏 + 顶部栏）+ 嵌套布局路由；角色管理、账号管理、封禁管理三个业务页面（列表 + 新增/编辑弹层表单 + 删除 + 角色权限树分配 + 账号启禁用）。
- 改造：
  - `weiran-system-domain/.../port/AccountRepository.java`：新增分页查询、新增账号、启用/禁用方法。
  - `weiran-system-infrastructure/.../persistence/MyBatisAccountRepository.java`：实现上述新方法。
  - `weiran-system-adapter/.../autoconfigure/SystemAdapterAutoConfiguration.java`：`@Import` 列表追加三个新 Controller。
  - `weiran-system-infrastructure/.../autoconfigure/SystemInfrastructureAutoConfiguration.java`：追加新增 Repository 的 Bean 定义。
  - `web/src/App.tsx`：接入 `AdminLayout` 与新增的嵌套路由。
- 复用（来自 `explore.md` 的可复用点）：
  - `PamAccountDO`/`PamAccountMapper`/`MyBatisAccountRepository` 的三件套结构，作为新增五个 DO/Mapper/Repository 的样板。
  - `weiran-common` 已有的 `PageQuery`/`PageResult`（分页契约）与 `WeiranErrors`（`RESOURCE_NOT_FOUND`/`CONCURRENT_CONFLICT` 等通用错误码），三个新 Controller 直接复用，不新增分页/错误码类型。
  - `AuthApplicationService` 的应用服务写法（构造器注入端口 + `@Transactional` 用例方法）。
  - 前端 `RequireAuth`、`hasPermission()`、`web/src/lib/api.ts` 的 `get`/`post` 封装。
  - 模块自装配双文件模式（`@AutoConfiguration` + `@Import`/`@MapperScan` + `@ConditionalOnMissingBean`），不新建装配类，直接在现有两个 `SystemXxxAutoConfiguration` 里追加。
- 下线/不做：无（本 change 全部是新增能力，不涉及现有能力的修订或下线）。

## Scope

### In Scope

- 角色管理：列表（分页）、详情、新增、编辑、删除、角色-权限树分配。
- 账号管理：列表（分页，支持按用户名/手机号/邮箱/类型筛选）、详情、新增、编辑、启用、禁用；登录日志只读分页列表（复用 `pam_account.logined_at`/`login_ip`，不新建表）。
- 封禁管理：列表（分页）、新增、编辑、删除。
- 前端通用后台布局壳子（侧边菜单 + 顶部栏 + 嵌套路由），供本 change 及后续模块 change 复用。
- 权限点新增，命名沿用 Java 现有风格 `weiran-system:{resource}.{action}`。

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- Token 会话管理（会话列表/强制下线）。
- 手机号绑定/解绑管理。
- 系统配置（sys_config）、邮件设置、上传设置页面。
- area/sms/oss/sensitive-word/category/content/app/version/ad/push 任何业务模块（留给后续按 P1→P2→P3 优先级开的 change）。
- 前端全局状态管理库（Redux/Zustand）引入。
- Semi 组件按需加载/分包体积优化。
- `pam_role_account` 表结构变更（如补唯一约束）。

## Capabilities

> 能力索引（`openspec/specs/README.md`）当前为空（0 个能力），本 change 是首个 change，以下全部为 ADDED，无需检查既有能力冲突。

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `rbac-role-management` | ADDED | 长期管理"角色的定义、启禁用、与权限的绑定关系"——角色 CRUD + 角色-权限分配 |
| `rbac-account-management` | ADDED | 长期管理"后台可管理的账号生命周期"——账号列表/详情/新增/编辑/启禁用 + 登录日志只读查询 |
| `rbac-ban-management` | ADDED | 长期管理"IP/设备维度的访问封禁名单" |
| `admin-console-shell` | ADDED | 长期管理"后台管理前端的整体外壳"——侧边菜单、顶部栏、布局路由、菜单权限过滤，是所有后台业务页面的共同容器 |

## 影响的包

| ID | 模块 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-system-domain` | 新增 | Role/Permission 可编辑领域模型（具体设计见 design.md）、`Ban` 聚合根、`RoleRepository`/`BanRepository` 端口，扩展 `AccountRepository` 端口 | duoli |
| PK-2 | `weiran-system-application` | 新增 | `RoleApplicationService`、`PamApplicationService`、`BanApplicationService` 三个应用服务 | duoli |
| PK-3 | `weiran-system-infrastructure` | 新增 + 改造 | 五张既有表的 DO/Mapper/Repository 实现；改造 `MyBatisAccountRepository` 支持分页/启禁用；两处 `AutoConfiguration` 追加 Bean | duoli |
| PK-4 | `weiran-system-adapter` | 新增 + 改造 | `RoleController`/`PamController`/`BanController` 三个 REST 端点；`SystemAdapterAutoConfiguration` 的 `@Import` 列表追加 | duoli |
| PK-5 | `weiran-common` | 不改动，仅复用 | `PageQuery`/`PageResult`/`WeiranErrors` 已满足本次分页与通用错误码需求 | duoli |
| PK-6 | `web` | 新增 + 改造 | `AdminLayout` + 三个业务页面；`App.tsx` 接入嵌套路由 | duoli |
| PK-7 | `weiran-app` | 不改动 | 已依赖 `weiran-system-adapter`/`weiran-system-infrastructure`，新增文件在既有模块内，无需改 `build.gradle.kts` 或 `settings.gradle.kts` | duoli |

## 共享层影响(决定能否并行)

> 命中即进入 `exec/plan.md` 的 Layer 0，串行先做。本表来源是 `explore.md` 的共享层命中三张表，此处做汇总勾选。

| 类别 | 是否命中 | 说明 |
|---|---|---|
| `SystemAdapterAutoConfiguration.java` 的 `@Import` 列表（Controller 注册桶） | ☑ | 三个新 Controller（Role/Pam/Ban）都要加进同一个 `@Import({...})` 列表，Layer 0 一次性改完 |
| `SystemInfrastructureAutoConfiguration.java` 的 Bean 方法列表（Repository 装配桶） | ☑ | 新增 3-5 个 Repository Bean 都要加进同一个类文件，Layer 0 一次性改完 |
| `web/src/App.tsx`（前端路由注册桶） | ☑ | AdminLayout 挂载 + 三个页面的嵌套路由结构要一次性改完，Layer 0 |
| `web/src/lib/api.ts`（前端请求封装） | ☐ | design 阶段已倾向沿用 POST 语义化路径（避免与 PHP 侧 RPC 风格割裂太大，也避免动这个共享文件），若最终选标准 REST 动词则需改为 ☑，由 design.md 定案 |
| `weiran-dependencies`（BOM 版本号） | ☐ | 不引入新第三方依赖（MyBatis-Plus、Semi 均已存在） |
| `settings.gradle.kts`（Gradle 模块映射） | ☐ | 不新建 Gradle 模块，全部在既有五个 `weiran-system-*` 模块内新增文件 |
| 数据库迁移脚本 | ☐ | 全部复用既有表，不做 ALTER，本项目尚未选定 Flyway/Liquibase，本次不涉及 |

## 横切关注点

> 这几项在本仓库最容易漏，漏了 L8 也发现不了（因为 spec 里根本没写）。按 weiran4j 实际业务域重新梳理（非电商/工作流类横切关注点，如"数据范围/多租户/工作流绑定"在本项目当前阶段不适用）。

| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 / 菜单 | ☑ | 新增 `weiran-system:role.manage`、`weiran-system:account.manage`、`weiran-system:ban.manage` 等权限点（design.md 定具体清单），前端菜单按权限点过滤显隐 |
| CC-2 密码处理（本项目特有横切关注点，替代模板默认的"数据范围"） | ☑ | 账号新增/重置密码必须复用已有 `PasswordHasher` 端口，产出 BCrypt 哈希，禁止依赖 PHP 遗留 `md5(sha1(...))` 算法（CP-8） |
| CC-3 多租户隔离 | ☐ | 本项目当前无多租户概念，`AccountType`（user/backend）已是账号空间隔离维度，非多租户 |
| CC-4 审计日志（操作日志） | ☐ | interview.md 已明确"本次不决定"，属于未来模块，本 change 不做 |
| CC-5 字段脱敏 | ☐ | 账号管理列表展示手机号/邮箱，PHP 侧 mgr-page 未做脱敏展示，本次保持一致不做脱敏（如需要留给后续 change） |
| CC-6 幂等 | ☑ | 角色-权限分配保存必须是"整体替换该角色的权限集合"（先按 `role_id` 删全部旧关联再插入新集合），避免 `pam_permission_role`/`pam_role_account` 因重复提交产生脏数据（`pam_role_account` 无唯一约束，见 explore.md 真实约束） |
| CC-7 导出 / 任务中心 | ☐ | PHP mgr-page 有导出能力（CSV），但 interview.md 未将其列入本次范围，留给后续按需评估 |
| CC-8 与 PHP 侧的破坏性影响（本项目特有横切关注点，替代模板默认的"工作流绑定"） | ☑ | 五张表均为迁移期与 PHP 并行读写的既有表，Java 侧新增 DO 字段类型/约束须与 `weiran-v1/weiran/system/resources/migrations/` 逐一核对一致，不做任何 ALTER（CP-7，已写入 interview.md「对下游的硬约束」） |

## Dependencies

- 产品/设计：无外部依赖，信息架构参照 PHP 侧 `weiran/mgr-page/configurations/menus.yaml` 的分组（角色管理/账号管理/登录日志/风险拦截）。
- 后端：无外部服务依赖，全部基于既有 `weiran-system-*` 模块与既有数据库表。
- 前端：`@douyinfe/semi-ui` 已在 `web/package.json` 中声明（^2.100.0），本次首次实际引入使用，无需新增依赖。
- 数据库变更：无（本项目未选定 Flyway/Liquibase，且本次全部复用既有表，无需生成迁移脚本）。
- 运维/配置：无新增环境变量或部署配置。
- 测试：后端遵循 `./gradlew check`（Checkstyle/SpotBugs/Forbidden APIs/Error Prone/NullAway/覆盖率）；前端遵循 `pnpm test`/`pnpm lint`。

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| Role/Permission 写模型设计不当导致与现有只读链路（`RbacRepository`）产生歧义或重复逻辑 | design 阶段未清晰界定新写模型与既有 `rbac/Role.java`/`Permission.java` 的边界 | design.md 必须在动手写 tasks 前明确二选一方案（扩展既有类 vs 新增独立聚合根），并说明转换关系，见 interview.md「本次要在 design 阶段决定」 |
| Controller 遗漏加入 `@Import` 列表导致运行时 404，且无编译期提示 | 新增 Controller 时漏改 `SystemAdapterAutoConfiguration.java` | tasks.md 将其列为独立可勾选任务项，verify 阶段做端到端 HTTP 请求验证三个 Controller 均可达 |
| `pam_role_account`/`pam_permission_role` 历史脏数据（重复行）导致分配保存逻辑行为异常 | 角色-权限/账号-角色关联保存未采用"整体替换"策略 | 见横切关注点 CC-6，应用层保存逻辑统一走事务内先删后插 |
| Semi 组件首次接入踩坑（Form 相关已知问题，见 mono4ts 项目经验） | 大量使用 Semi Form/Table/Modal 组合 | 出问题时参考 `/Users/duoli/Projects/hanrui-jinnuo/mono4ts/packages/web` 已验证过的分包/兼容性处理，但不预防性引入其复杂度 |

## Review Checklist

- [x] 范围和非目标已确认，且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认(本项目暂无灰度机制，走标准 CI 门禁)

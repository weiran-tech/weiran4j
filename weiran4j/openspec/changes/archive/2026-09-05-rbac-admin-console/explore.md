---
title: "RBAC 后台管理控制台 · 代码现状调研"
status: "draft"
updated_at: "2026-09-04"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。

## 调研范围

| 包 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-system-domain` | `account/`、`rbac/`、`port/` | 确认现有 Account 聚合根、只读 Role/Permission 值对象、端口定义方式，避免与新增写模型冲突 |
| `weiran-system-infrastructure` | `persistence/`、`autoconfigure/` | 确认 DO/Mapper/Repository 实现样板与模块自装配方式，新增 DO 要照抄这套结构 |
| `weiran-system-adapter` | `web/`、`autoconfigure/` | 确认 Controller 注册方式（`@Import` 而非组件扫描）与统一响应格式的处理机制 |
| `weiran-app` | `build.gradle.kts` | 确认新增五层文件是否需要改这里（结论：不需要，已依赖 adapter+infrastructure） |
| `web/src` | `App.tsx`、`pages/`、`components/`、`lib/` | 确认路由注册方式、现有 API 客户端封装、鉴权组件，新增布局与页面要复用这些 |
| `weiran-v1/weiran/system` | `resources/migrations/` | 核对 `pam_role`/`pam_permission`/`pam_role_account`/`pam_permission_role`/`pam_ban` 五张表的真实字段与约束，避免 Java 侧建模与既有表结构冲突（CP-7） |

## 现有实现

> 带 `file_path:line` 引用,便于后续 agent 直接跳转。

| 能力 | 位置 | 现状 |
|---|---|---|
| 账号聚合根 | `weiran-system-domain/.../account/Account.java` | 不可变值对象（`@Builder(toBuilder=true)`），字段含 `passwordHash`/`passwordKey`/`enabled`/`createdAt`，密码哈希逻辑委托给 `PasswordHasher`，不在类内 |
| 账号类型/通行证类型 | `weiran-system-domain/.../account/AccountType.java`、`PassportType.java` | `AccountType.fromCode()` 按落库值解析，未知值抛业务异常；`PassportType.detect()` 自动识别用户名/手机号/邮箱 |
| 只读角色/权限值对象 | `weiran-system-domain/.../rbac/Role.java:1-32`、`Permission.java:1-33` | 纯 `@Getter @Builder` 值对象，**无 setter/无持久化注解**，`Permission.java:9` 明确写死示例权限点 `weiran-system:account.index`，服务于登录鉴权只读链路，不是管理后台需要的可编辑聚合根 |
| RBAC 只读查询端口 | `weiran-system-domain/.../port/RbacRepository.java:1-17` | 仅 `findRoleNamesByAccountId`/`findPermissionNamesByAccountId` 两个方法，返回 `Set<String>`，无 CRUD |
| RBAC 只读查询实现 | `weiran-system-infrastructure/.../persistence/MyBatisRbacRepository.java`、`mapper/RbacMapper.java` | 用 `@Select` 原生 SQL 直接 JOIN 四张表（`pam_role_account`/`pam_role`/`pam_permission_role`/`pam_permission`），硬编码表名与 `is_enable` 字段判断 |
| 账号仓储端口 | `weiran-system-domain/.../port/AccountRepository.java:1-27` | 已有 `findByPassport`/`findById`/`recordLogin`/`updatePassword`，**没有分页列表查询、没有新增/启禁用方法** |
| 账号仓储实现 | `weiran-system-infrastructure/.../persistence/MyBatisAccountRepository.java`、`entity/PamAccountDO.java`、`mapper/PamAccountMapper.java` | MyBatis-Plus 标准三件套（DO + BaseMapper 子接口 + Repository 实现类），是新增 Role/Permission/Ban DO 的直接样板 |
| 认证 REST 端点 | `weiran-system-adapter/.../web/AuthController.java:31-74` | `@RequestMapping("/api/v1/auth")`，`@Import(AuthController.class)` 方式登记（非组件扫描），返回裸业务对象由 wuli3 的 `ApiResponseBodyAdvice` 统一包装，路径沿用 PHP 版 `/api/v1/...` 前缀 |
| 适配层自装配 | `weiran-system-adapter/.../autoconfigure/SystemAdapterAutoConfiguration.java:38-90` | `@AutoConfiguration(before = {WebErrorAutoConfiguration, WebContextAutoConfiguration})` + `@Import(AuthController.class)`，Bean 全部 `@ConditionalOnMissingBean` |
| 基础设施自装配 | `weiran-system-infrastructure/.../autoconfigure/SystemInfrastructureAutoConfiguration.java:36-83` | `@MapperScan("com.weiran.system.infrastructure.persistence.mapper")` 在模块内自声明，应用侧零改动；端口实现 Bean 全部 `@ConditionalOnMissingBean` |
| 前端路由表 | `web/src/App.tsx:13-28` | 声明式 `<Routes>`，当前仅 `/login`、`/`（`RequireAuth` 包裹 `HomePage`）、`*` 兜底三条，无嵌套/布局路由 |
| 前端 API 客户端 | `web/src/lib/api.ts` | 基于 `fetch`，`ApiResponse<T>.code` 为字符串，`SUCCESS_CODE='0'`；`get<T>()`/`post<T>()` 封装；401 自动清 token |
| 前端鉴权域 | `web/src/lib/auth.ts` | `login()`/`fetchCurrentAccount()`/`hasPermission()`；`hasPermission` 已按 `weiran-system:account.index` 这种命名格式实现字符串匹配 |
| 前端权限守卫 | `web/src/components/RequireAuth.tsx` | 用 TanStack Query 请求 `/api/v1/auth/me` 判定，而非仅查本地 token |
| Semi 依赖 | `web/package.json` | `@douyinfe/semi-ui: ^2.100.0` 已装但**零使用**，无主题/CSS 引入，`vite.config.ts` 无按需加载配置（刻意保持最小，见该文件顶部注释） |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `PamAccountDO`/`PamAccountMapper`/`MyBatisAccountRepository` 三件套结构 | `weiran-system-infrastructure/.../persistence/` | 直接照抄这套「DO + Mapper 接口 + Repository 实现」模式新建 `PamRoleDO`/`PamPermissionDO`/`PamRoleAccountDO`/`PamPermissionRoleDO`/`PamBanDO` 及各自 Mapper/Repository | 否，模式直接复用 |
| `AccountRepository` 端口 | `weiran-system-domain/.../port/AccountRepository.java` | 扩展新增方法：分页列表查询、新增账号、启用/禁用 | 是：新增方法签名，不改现有方法 |
| 模块自装配双文件模式（`@AutoConfiguration` + `AutoConfiguration.imports`） | `SystemAdapterAutoConfiguration.java`、`SystemInfrastructureAutoConfiguration.java` | 新增的 `RoleController`/`PamController`/`BanController` 用同样的 `@Import` 方式登记到 `SystemAdapterAutoConfiguration`；新增 Repository Bean 用同样的 `@ConditionalOnMissingBean` 方式登记到 `SystemInfrastructureAutoConfiguration` | 否，直接在现有两个 AutoConfiguration 类里加代码，不新建装配类 |
| `RequireAuth`/`hasPermission()` | `web/src/components/RequireAuth.tsx`、`web/src/lib/auth.ts` | 布局路由与页面按钮级权限判断直接复用，不重新实现 | 否 |
| `web/src/lib/api.ts` 的 `get`/`post` 封装 | `web/src/lib/api.ts` | 新增页面的数据请求直接用现成的 `get<T>()`/`post<T>()`，如需 PUT/DELETE 需要补充这两个方法 | 是：补 `put<T>()`/`del<T>()`（PHP 侧接口是 POST-only 的 RPC 风格，但 Java 侧新 Controller 若走标准 REST 方法则前端需要这两个封装） |
| `AuthApplicationService` 的分层写法（应用服务持有多个端口，`@Transactional` 用例方法） | `weiran-system-application/.../auth/AuthApplicationService.java` | 新增 `RoleApplicationService`/`PamApplicationService`/`BanApplicationService` 照此结构：构造器注入端口、`@Transactional` 包裹写操作 | 否，模式直接复用 |

## 真实约束

> 代码里客观存在、设计必须绕开的东西。

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| `Role`/`Permission` 是不可变值对象，无 setter，且已被 `RbacRepository` 只读链路使用 | `weiran-system-domain/.../rbac/Role.java`、`Permission.java`、`RbacMapper.java` | 新增的角色/权限管理写模型不能直接改造这两个类加 setter（会破坏"不可变值对象"的既有语义和调用方假设），应作为独立的领域概念处理，或者明确让这两个类同时承担只读投影与写聚合根职责——design 阶段需要定这个取舍 |
| `pam_role_account` 中间表无唯一约束（PHP 迁移文件确认），可能存在历史重复行 | `weiran-v1/weiran/system/resources/migrations/2018_02_27_144936_create_pam_role_account_table.php` | 新增账号-角色分配逻辑的写入路径必须"先删后插"或做去重判断，不能假设 `INSERT` 不会产生重复 |
| `pam_ban` 无状态字段、无过期时间字段，封禁语义靠"记录是否存在"表达 | `weiran-v1/weiran/system` 对应迁移文件（`2021_04_27_183109_...`、`2021_06_29_233109_...`），已由子 agent 调研确认 | 封禁管理页面的"启用/禁用"如果要做，必须新增字段而非利用现有字段語义扭曲；本次若做删除即视为解封，不新增状态字段（design 阶段确认） |
| Controller 通过 `@Import` 显式登记，不是组件扫描 | `SystemAdapterAutoConfiguration.java:38-39` | 新增的三个 Controller 必须同样加到 `@Import({...})` 列表，漏加则请求 404 且没有任何编译期或启动期报错提示 |
| `Permission.name` 是权限判定唯一依据，`group`/`root`/`module` 仅用于界面分组 | `Permission.java:18-19,25-31` | 角色-权限分配 UI 的权限树分组展示可以用 `group`/`module` 字段，但后端鉴权拦截逻辑只能比较 `name` 字符串 |
| `web/vite.config.ts` 明确注释「刻意不做 Semi 按需加载/分包优化」 | `web/vite.config.ts` 顶部注释（前序调研已确认） | 本次首次真正引入 Semi 组件，不要顺手抄 mono4ts 的分包配置，除非首屏体积已经成为问题 |
| 前端目前无 PUT/DELETE 请求封装，只有 GET/POST | `web/src/lib/api.ts` | 若新 Controller 用标准 REST 方法（`PUT /roles/{id}`、`DELETE /roles/{id}`），前端 `api.ts` 需要新增对应方法；也可以让后端全部收敛为 POST 语义化路径（`/roles/{id}/update`）避免动这个文件——design 阶段二选一 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran-system-domain/.../rbac/` | 新增：Role/Permission 写模型相关类型（具体命名 design 阶段定），Ban 聚合根，RoleRepository/PamRepository（或扩展 AccountRepository）/BanRepository 端口 |
| `weiran-system-application/.../rbac/`、`.../ban/` | 新增：角色管理、账号管理、封禁管理应用服务 |
| `weiran-system-infrastructure/.../persistence/entity/` | 新增：`PamRoleDO`、`PamPermissionDO`、`PamRoleAccountDO`、`PamPermissionRoleDO`、`PamBanDO` |
| `weiran-system-infrastructure/.../persistence/mapper/` | 新增：对应五个 Mapper 接口 |
| `weiran-system-infrastructure/.../persistence/` | 新增：Repository 实现类；改造 `MyBatisAccountRepository.java` 支持分页查询、启禁用 |
| `weiran-system-adapter/.../web/` | 新增：`RoleController`、`PamController`、`BanController`、对应 DTO |
| `web/src/layouts/`（新目录） | 新增：`AdminLayout.tsx`（Semi Layout + Nav） |
| `web/src/pages/role/`、`web/src/pages/account/`、`web/src/pages/ban/`（新目录） | 新增：三个业务模块的列表页 + 表单弹层组件 |
| `web/src/lib/api.ts` | 改造：视 design 阶段的 REST 方法选型决定是否新增 `put`/`del` |

### 共享层命中 ⚠️

> weiran4j 的共享层是 `weiran-dependencies`(BOM)、`build-logic`(约定插件)、`weiran-common`(跨模块契约)与数据库迁移脚本；命中任意一项即归入 Layer 0 串行先做。

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `weiran-system-adapter/.../autoconfigure/SystemAdapterAutoConfiguration.java` 的 `@Import({...})` 列表 | 每新增一个 Controller 都要在这一处追加，多个执行单元同时改会冲突 | **命中**：新增 `RoleController`/`PamController`/`BanController` 三个类都要加进同一处 `@Import` 列表 → 归入 Layer 0，一次性改完，不拆给多个并行单元各自加一行 |
| SL-2 | `weiran-system-infrastructure/.../autoconfigure/SystemInfrastructureAutoConfiguration.java` 的 Bean 方法列表 | 每新增一个 Repository 实现都要在这一处追加 `@Bean` 方法 | **命中**：新增 3-5 个 Repository Bean（Role/Permission、Account 扩展、Ban）都要加进同一个类文件 → 归入 Layer 0 |
| SL-3 | `web/src/App.tsx` | 前端路由注册桶文件，新增布局路由与嵌套页面路由都要改这一处 | **命中**：AdminLayout 挂载 + 三个页面路由的嵌套结构要一次性改完 → 归入 Layer 0 |
| SL-4 | `web/src/lib/api.ts` | 若需要新增 `put`/`del` 方法，是所有页面共同依赖的请求封装 | **视 design 阶段 REST 方法选型而定**：若选纯 POST 语义化路径则未命中；若选标准 REST 动词则命中，且必须先改完这个文件角色管理/账号管理/封禁管理三个页面才能各自发起请求 → 归入 Layer 0（如果命中） |

#### 跨包契约(三个包共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common` 模块（错误码基座、分页契约） | domain/application/adapter 三层若都要用统一的分页请求/响应契约 | **命中**：需要确认 `weiran-common` 是否已有分页 DTO（`PageRequest`/`PageResult` 之类），若没有需要新增到 `weiran-common`，会被 Role/Account/Ban 三个 Controller 共同消费 → 归入 Layer 0，design 阶段先查证 `weiran-common` 现状再定 |
| SL-7 | `weiran-system-api`（对外契约模块，不依赖 Spring/不依赖领域层） | 若新增的角色/账号/封禁管理需要跨模块暴露的 DTO/接口契约 | 需 design 阶段判断是否需要在 `weiran-system-api` 新增类型（当前 `AuthService`/`LoginResult`等已在此模块），倾向于**命中**：管理类用例通常仍需要对外契约以保持 adapter 不直接依赖 application 具体实现 |

#### 序号型资源(冲突不可自动解决)

| ID | 资源 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-10 | 数据库迁移脚本 | 本项目尚未选定 Flyway/Liquibase（`openspec/project.json` 的 checks-note 已注明"迁移方案未落定"） | **未命中**：本次全部复用既有表（`pam_role`/`pam_permission`/`pam_role_account`/`pam_permission_role`/`pam_ban`），不新建/修改表结构，不涉及迁移脚本 |
| SL-11 | `weiran-dependencies`（BOM 版本号） | 所有版本号只在这里出现一次 | **未命中**：本次不引入新的第三方依赖（MyBatis-Plus/Semi 均已存在），不需要改 BOM |
| SL-12 | `settings.gradle.kts` 模块映射 | 新增业务模块需要在此追加 `include()` 与 `projectDir` 映射 | **未命中**：本次在已有的 `weiran-system-*` 五个模块内新增文件，不新建 Gradle 模块 |

> 结论：本次改动的共享层冲突集中在**两个 Java 自动装配类**和**前端路由桶文件**（SL-1/SL-2/SL-3 三处必然命中），外加 `weiran-common` 分页契约需要 design 阶段先确认现状（SL-6/SL-7）。数据库迁移与 Gradle 模块映射均未命中，风险面比预想的小。

## 对 interview 的反向修正

> explore 的价值一半在这里。发现需求与现实冲突,**回改 `interview.md` 并注明**,不要闷头往下走。

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| interview.md 假设可以"新建 Role/Permission 写模型，与现有只读值对象共存" | 现有 `rbac/Role.java`/`rbac/Permission.java` 就是 `pam_role`/`pam_permission` 表在领域层的唯一现有表示，且已被 `RbacMapper`/`RbacRepository` 使用；直接再建一套同名/近似命名的类型会造成"两个 Role 类"的认知负担 | design 阶段需要明确决策：(a) 扩展现有 `Role`/`Permission` 类使其同时承担只读投影与可编辑聚合根职责，或 (b) 保持现有两个类只读不变、新增独立的可编辑聚合根并明确两者的转换关系 | ☑ 已加入 interview.md「本次要在 design 阶段决定」小节 |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| `pam_role_account` 无唯一约束导致的重复行 | 角色-权限分配保存逻辑用"先删后插"但删除条件写错，或并发保存 | design 阶段明确保存策略为"整体替换该账号/角色的关联集合"（先按 `account_id`/`role_id` 删全部旧记录，再插入新集合），并在应用层加事务保证原子性 |
| Controller 忘记加进 `@Import` 列表导致运行时 404 | 新增 Controller 时遗漏这一步，且没有编译期检查 | tasks.md 里把"三个 Controller 全部加入 SystemAdapterAutoConfiguration 的 @Import 列表"列为独立可勾选任务项，verify 阶段做一次端到端 HTTP 请求验证 |
| `weiran-common` 若没有现成分页契约，三个 Controller 各自定义分页 DTO 导致后续模块复刻时不一致 | design 阶段未先查证 `weiran-common` 现状就直接各写各的 | design 阶段第一步先读 `weiran-common` 源码确认现状，若缺失则在 `weiran-common` 新增一次性通用分页请求/响应类型，三个 Controller 共用 |
| Semi 组件首次接入，Form/Table/Modal 组合使用可能有样式或状态管理踩坑（mono4ts 项目的 vite.config.ts 注释里提到过 Semi Form 的已知问题） | 大量使用 Semi Form 组件且未做分包处理 | 参考 `/Users/duoli/Projects/hanrui-jinnuo/mono4ts/packages/web` 的既有实践，但仅在真正遇到问题时才引入其分包配置，不预防性引入 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`（见上表，非阻塞性，design 阶段处理）
- [x] 可复用点已确认,避免 subagent 重复造轮子

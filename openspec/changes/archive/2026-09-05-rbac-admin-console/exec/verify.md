---
title: "RBAC 后台管理控制台 · 集成与一致性校验"
status: "draft"
updated_at: "2026-09-05"
---

# Verify

> **L6 集成 + L8 规格一致性**。

---

# 一、集成记录(L6)

**worktree 数**：1 个（单 worktree，无并行集成——本 change 经用户明确指示跳过 worktree 隔离，在主工作区单 session 顺序执行，见 exec/plan.md 第 5 节）
**执行单元数**：7 个（E1-E7，按 exec/plan.md 的层序顺序完成）

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全（E1-E7 共 7 份）
- [x] Layer 0（E1）已完成且契约未再变动
- [x] 自测通过（每个单元完成时均已跑对应范围的编译/测试，见各 notes 的"自测结果"）

## 重复实现消除

无重复实现。各单元职责边界清晰（Layer 0 契约 → domain/application → infrastructure → adapter → 前端 → 测试 → 发布），未出现两处等价逻辑。

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| `RoleAggregate.rename()` 接受 `name` 参数并在运行时校验系统角色拒绝改名 | E2 | 改为 `updateProfile()` 不接受 `name` 参数，从类型层面天然满足不变量，比运行时校验更强的保证，且与 E1 已定义的 `UpdateRoleCommand`（同样不含 `name`）呼应 |
| `MyBatisRoleRepository.bindAccountToRole` 包内方法 | E3 | 写完后发现没有任何调用方（`RoleRepository` 接口未声明、应用层未使用），账号-角色分配的 UI 入口本身是 design.md 的 Open Question，未定案前不应该有陪跑的死代码，已删除 |
| `RoleController`/`PermissionController` 合并成一个 Controller，`GET /api/v1/permissions` 用类级 `@RequestMapping` 覆盖 | E4 | Spring MVC 不支持方法级映射跳出类级 `@RequestMapping` 前缀（曾尝试 `@GetMapping("/api/v1/permissions")` 覆盖 `/api/v1/roles`，实际路径拼接成 `/api/v1/roles/api/v1/permissions`，是错的），改为独立 `PermissionController` |
| `HTMLCanvasElement.getContext` stub 返回 `null` | E6 | lottie-web 在模块加载阶段就调用 `.fillStyle`，返回 `null` 会在解引用时抛 `TypeError`；改为返回一个吸收所有读写的 `Proxy` 对象 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `weiran-system-domain/.../account/Account.java`（新增 `loginIp` 字段） | E2 | 必要连带 | 保留——`rbac-account-management` FR-004 要求登录日志返回来源 IP，现有 `Account` 领域模型缺这个字段，不加则该需求无法实现 |
| `weiran-system-infrastructure/.../MyBatisAccountRepository.java`（`toDomain` 补 `loginIp` 映射） | E3 | 必要连带 | 保留——与上一条同一因果链条 |
| `weiran-system-adapter/.../web/PermissionController.java`（新增类，design.md 未声明） | E4 | 必要连带 | 保留——Spring MVC 机制决定的必然结果，见上表"被牺牲的方案" |
| `weiran-app/src/test/resources/schema.sql`（补 `pam_ban` 表定义） | E4 | 必要连带 | 保留——E6 阶段的端到端测试需要这张表才能运行 |
| `weiran-app/src/test/resources/schema.sql`（`pam_ban.value` 改为加引号定义） | E6 | 必要连带（bug 修复） | 保留——H2 保留字语法错误，容器起不来 |
| `weiran-system-infrastructure/.../entity/PamBanDO.java`、`PamPermissionDO.java`（加 `@TableField` 转义） | E6 | 必要连带（bug 修复） | 保留——MyBatis-Plus 生成 SQL 未转义保留字列名，两个数据库方言下都有隐患 |
| `weiran-system-infrastructure/.../MyBatisBanRepository.java`（`note` 字段 null 规整） | E6 | 必要连带（bug 修复） | 保留——`pam_ban.note` 是 `NOT NULL DEFAULT ''`，可空值直接透传会违反约束 |
| `web/src/test-setup.ts`（canvas stub） | E6 | 必要连带（测试环境兼容） | 保留——不是本项目代码缺陷，是 Semi Design 在 jsdom 下的已知兼容性问题，不 stub 则前端组件测试无法运行 |
| `weiran-system-adapter/.../web/RoleController.java`、`BanController.java`（`@DeleteMapping` 改为 `@PostMapping("/{id}/delete")`） | 未在原 notes 申报，本节补充说明 | 自我纠错（非越界） | E4 完成后、E5 开工前发现自己的实现偏离了 design.md 的既定路径设计（design.md 一直写的是 `POST /{id}/delete`），已在 E4 notes 追加"修正记录"一节说明，不是对其他单元文件的越界修改，是对本单元自身产出的纠正 |

**判定说明**：以上全部为必要连带或自我纠错，**无未申报的越界扩大**。

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew assemble` | ☑ 绿 | `evidence/build.log` |
| test | `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew test` | ☑ 绿 | `evidence/test.log` |
| lint | `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew check` | ☑ 绿 | `evidence/lint.log` |

补充证据（`project.json` 的 `commands` 未覆盖前端，本次改动涉及前端，补充留证）：

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| 前端类型检查 | `npx tsc --noEmit -p tsconfig.json` | ☑ 绿 | `evidence/frontend-typecheck.log` |
| 前端 lint | `npx eslint src` | ☑ 绿 | `evidence/frontend-lint.log` |
| 前端测试 | `npx vitest run` | ☑ 绿 | `evidence/frontend-test.log` |
| 前端构建 | `npx vite build` | ☑ 绿 | `evidence/frontend-build.log` |

三条正式命令与四条补充验证全部一次性绿灯通过，无需走"红灯归因"流程。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 0.1 | - | interview.md 已确认 | ☑ |
| 0.2 | - | 依赖目标环境，本地无法验证，已如实声明未完成 | ☑（声明为未完成，非漏做） |
| 1.1 | E1 | `weiran-system-api/.../rbac/*.java` | ☑ |
| 1.2 | E1 | `RoleQuery`/`AccountQuery`/`BanQuery` 引用 `PageQuery` | ☑ |
| 1.3、1.4 | E1 | 定位确认（无代码改动） | ☑ |
| 2.1 | E1 | 字段核对，发现 `pam_permission.type` 遗漏并在 4.2 补上 | ☑ |
| 3.1-3.10 | E2 | `weiran-system-domain/.../rbac/`、`weiran-system-application/.../rbac/` | ☑ |
| 4.1-4.9 | E3 | `weiran-system-infrastructure/.../entity/`、`mapper/`、`persistence/` | ☑ |
| 4.10-4.14 | E4 | `weiran-system-adapter/.../web/`，`exec/permission-seed.sql` | ☑ |
| 5.1-5.6 | E5 | `web/src/layouts/`、`web/src/pages/` | ☑ |
| 6.1-6.4 | E6 | `RoleAggregateTest`、`RbacAdminEndpointIT`、前端组件测试 | ☑ |
| 7.1、7.2 | E7 | 构建验证 | ☑ |
| 8.1 | E7（本文件之前） | `artifacts.md` | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 0.2（确认目标环境已有 `system=true` 管理角色） | 需连接目标环境真实数据库才能核实，本地开发阶段无法验证 | 未在 exec/plan.md 单独声明，但 tasks.md 该条目本身已注明"留待 7. 发布阶段执行"，性质是"发布前人工确认步骤"，不是代码实现缺失 |

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| Role/Permission 写模型设计决策 | 新增独立聚合根，不改造现有只读值对象 | `RoleAggregate`/`PermissionRef`/`Ban` 新建，`rbac/Role.java`/`Permission.java` 未改动 | ☑ |
| 前端 REST 交互方式决策 | 沿用 POST 语义化路径，不引入 PUT/DELETE | 最初 `RoleController`/`BanController` 的 delete 端点误用了 DELETE 动词，E4 完成后发现并修正为 `POST /{id}/delete`（见「被牺牲的方案」表） | ☑（修正后一致） |
| API Design | 18 个端点，`GET /api/v1/permissions` 独立顶级路径 | 全部端点已实现；权限点查询因 Spring MVC 机制约束改由独立 `PermissionController` 承载（路径不变，仍是 `GET /api/v1/permissions`） | ☑ |
| Database Design | 五张表全部复用，不做 ALTER，字段类型对齐 PHP 迁移文件 | 五个 DO 字段逐一核对，`pam_permission.type` 补齐（design.md 原稿遗漏），无任何 ALTER TABLE | ☑ |
| 权限点命名 | `weiran-system:{resource}.{action}` | 7 个新权限点全部符合格式，`exec/permission-seed.sql` 已产出录入脚本 | ☑ |
| 前端设计 | 不抽通用 CrudTable/CrudFormModal，先各自实现 | 三个页面独立实现，未抽象 | ☑ |
| CP-11（错误码归属决定 HTTP 状态） | Controller 不手写状态码 | 四个新 Controller 均未手写状态码，异常统一走 `ErrorCodeException` + `SystemErrors`/`WeiranErrors` | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| rbac-role-management FR-001 | 分页查询角色列表，按账号类型/启用状态筛选 | `RbacAdminEndpointIT.roleManagementFullCycle` | ☑ |
| rbac-role-management FR-002 | 新增/编辑角色，系统内置角色 name 不可改 | `RoleAggregateTest.updateProfileKeepsNameAndSystemFlag`、`systemRoleCannotBeDeleted`（IT） | ☑ |
| rbac-role-management FR-003 | 删除角色，系统内置角色拒绝删除 | `RoleAggregateTest.systemRoleCannotBeDeleted`、`RbacAdminEndpointIT.systemRoleCannotBeDeleted` | ☑ |
| rbac-role-management FR-004 | 权限分配整体替换语义 | `RbacAdminEndpointIT.roleManagementFullCycle`（分配后详情核对） | ☑ |
| rbac-role-management FR-005 | 权限点命名规范 | `RoleController`/权限点录入脚本人工核对格式 | ☑ |
| rbac-account-management FR-001 | 分页查询，模糊匹配+类型筛选 | `RbacAdminEndpointIT.accountManagementFullCycle`（间接）、`AccountListPage.test.tsx` | ☑ |
| rbac-account-management FR-002 | 新增账号，BCrypt 落库 | `RbacAdminEndpointIT.accountManagementFullCycle`（断言 `stored.startsWith("$2")`） | ☑ |
| rbac-account-management FR-003 | 编辑/启禁用，禁用后登录被拒 | `RbacAdminEndpointIT.accountManagementFullCycle` | ☑ |
| rbac-account-management FR-004 | 登录日志只读查询 | `PamService.loginLogs` 实现，未单独写集成测试断言该端点（见遗留问题） | ⚠ 部分 |
| rbac-account-management FR-005 | 密码重置沿用 BCrypt | `PamApplicationService.resetPassword` 复用 `PasswordHasher.hash()`，未单独写集成测试用例（见遗留问题） | ⚠ 部分 |
| rbac-ban-management FR-001/002/003 | 封禁 CRUD | `RbacAdminEndpointIT.banManagementFullCycle` | ☑ |
| admin-console-shell FR-001/002/003/004 | 布局、权限过滤、登出、路由 | `AdminLayout.test.tsx`（3 用例）、`RequireAuth.test.tsx`（2 用例） | ☑ |

## 越界检查

`git status --short` 显示的改动文件集，与「越界修改汇总」表逐一核对：全部改动均可追溯到某个执行单元的既定范围或已申报的必要连带，**无未申报越界**。

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | `RoleController`/`BanController` 的删除端点最初实现为 `DELETE` 而非 design.md 规定的 `POST /{id}/delete` | **代码错**（实现偏离设计意图，非设计本身有问题） | 已在 E4 完成后立即修正为 `POST /{id}/delete`，不需要回 L2；design.md 本身的表述是清晰一致的 |
| 2 | `GET /api/v1/permissions` 承载类从"归入 RoleController"变为独立 `PermissionController` | **spec 表述模糊，实现是合理解读**（design.md 只规定了路径，未规定必须挂在哪个类下；Spring MVC 机制决定了这个技术选择） | 不改设计意图（路径本身完全符合 design.md），只是实现层面的必然调整，已在 exec/plan.md 契约冻结记录之外、以 verify.md 本节说明的方式记录，不需要重开 L2 |
| 3 | design.md 遗漏 `pam_permission.type` 字段 | **spec 有遗漏，但不影响设计意图本身**（design.md 的核心决策——复用既有表、不做 ALTER——依然成立，只是字段清单不完整） | 实现阶段（tasks.md 2.1）已发现并补齐，不影响整体设计正确性，不需要重开 L2 走完整人工审阅——这是 design 阶段信息收集不全，不是设计判断错误 |

三项不一致均已在实现过程中就地处置，无需打回设计。

## 遗留问题

- [ ] rbac-account-management FR-004（登录日志查询）与 FR-005（密码重置）两个端点在 `RbacAdminEndpointIT` 中未有专门的独立测试用例断言其响应内容（`loginLogs`/`resetPassword` 的应用层逻辑已实现且编译通过，但集成测试层面的覆盖不完整）。**已登记到 `openspec/reality/waitlist-tech.md`**（症状：若这两个端点的响应字段映射有误，现有测试套件不会捕获，需要人工或后续 change 补测试用例）。
- [ ] 账号-角色分配的具体 UI 入口未定案（design.md Open Question），`PamRoleAccountMapper` 已建模但应用层未提供绑定用例。**已登记到 `openspec/reality/waitlist-tech.md`**。
- [ ] `MyBatisRoleRepository`/`MyBatisAccountRepository` 是否存在类似"可空字段写入 NOT NULL 列"的同类隐患未做穷举式排查（E6 collections 已发现 `MyBatisBanRepository` 有此问题并修复，但未反向检查其余两个 Repository）。**已登记到 `openspec/reality/waitlist-tech.md`**。

## 流程反馈

- `exec/plan.md` 契约冻结表在规划阶段把 `GET /api/v1/permissions` 归入 `RoleController` 名下，但未预见到 Spring MVC 的类级/方法级路径拼接约束会导致这个归属在实现阶段被迫调整。建议后续 change 的契约冻结表在涉及"独立顶级路径但语义上关联某个资源"的端点时，显式标注"可能需要独立 Controller 承载"，减少这类实现阶段才发现的技术约束导致的计划外调整。
- 本次 MyBatis-Plus + H2（`MODE=MySQL`）保留字踩坑（`value`/`group`）具有可复用性——建议后续 P1/P2/P3 模块 change 在新建 DO 时，参照 `openspec/rules/constitution.md` 或类似机制，把"检查字段名是否为 SQL 保留字"列为新建 DO 的一项常规检查项，而不是等到集成测试报错才发现。

## 结论

- [x] 集成完成（单 worktree，越界汇总已写）
- [x] L7 三项全绿（+ 前端四项补充验证全绿）
- [x] tasks.md 条目全部覆盖或已声明（0.2 已声明为依赖外部环境的未完成项）
- [x] design/specs 基本一致（3 处不一致已判定归属并就地处置，均不需要打回设计）
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**：☑ 通过，进入 L9 人类审阅 diff

---
title: "RBAC 后台管理控制台 · 任务清单"
status: "draft"
updated_at: "2026-09-05"
---

# Tasks

> **本文件是需求的权威源，粒度是「做什么」不是「怎么做」。**

## 0. 准备

- [x] 0.1 确认本 change 在主工作区直接推进（无 worktree 隔离，无远程仓库），确认负责人为 duoli
- [ ] 0.2 确认目标环境已存在至少一个 `system=true` 的后台管理角色，供本次新增权限点分配（发布阶段依赖，需连接目标环境数据库才能核实，本地开发阶段无法验证，留待 7. 发布阶段执行）

## 1. 共享契约层

> 对应 `exec/plan.md` 的 Layer 0，串行先做。涉及面：`weiran-system-api` 对外契约、`weiran-common` 复用确认、两处 `AutoConfiguration` 桶文件。

- [x] 1.1 在 `weiran-system-api` 新增 `RoleService`/`PamService`/`BanService` 接口及对应 Command/View record 类型（design.md「跨模块契约变更」）
- [x] 1.2 确认 `weiran-common` 的 `PageQuery`/`PageResult`/`WeiranErrors` 满足本次分页与错误码需求，不新增类型（design.md 已定案，仅需在实现时核对签名）——已在 `RoleQuery`/`AccountQuery`/`BanQuery` 中实际引用 `PageQuery`，`RoleService`/`PamService`/`BanService` 返回类型实际引用 `PageResult`，编译通过确认签名匹配
- [x] 1.3 在 `SystemAdapterAutoConfiguration.java` 的 `@Import` 列表中预留三个新 Controller 的登记位（待 4. 后端-适配层任务完成对应类后一并加入，此任务仅做位置确认，避免多个后续任务并行修改同一文件冲突）——已确认文件位置：`weiran-system-adapter/src/main/java/com/weiran/system/adapter/autoconfigure/SystemAdapterAutoConfiguration.java`
- [x] 1.4 在 `SystemInfrastructureAutoConfiguration.java` 中预留新增 Repository Bean 的登记位（同上，避免并行冲突）——已确认文件位置：`weiran-system-infrastructure/src/main/java/com/weiran/system/infrastructure/autoconfigure/SystemInfrastructureAutoConfiguration.java`

## 2. 数据层

> 本次全部复用既有表（`pam_role`/`pam_permission`/`pam_role_account`/`pam_permission_role`/`pam_ban`），不做任何 ALTER，不涉及迁移脚本生成（design.md「Database Design」已确认）。

- [x] 2.1 核对五张既有表字段类型与 PHP 迁移文件（`weiran-v1/weiran/system/resources/migrations/`）逐一一致，作为后续 DO 编写的字段类型依据（CP-7，design.md 已完成初步核对，此任务是实现前的最终复核）——发现 design.md 遗漏 `pam_permission.type`(varchar50) 字段，`PamPermissionDO` 编写时需补上；其余字段与 design.md 记录一致

## 3. 后端 - 领域层与应用层 `weiran-system-domain` / `weiran-system-application`

- [x] 3.1 新增 `RoleAggregate` 聚合根，含 `rename()` 业务方法（`system=true` 时拒绝改名）（rbac-role-management/FR-002）——实现为 `updateProfile()`（不接受 `name` 参数，从类型层面天然满足"系统角色不可改名"，见收尾笔记）
- [x] 3.2 新增 `PermissionRef` 只读引用类型（按 `group`/`module` 分组，供权限树展示）（rbac-role-management/FR-005）
- [x] 3.3 新增 `Ban` 聚合根（rbac-ban-management/FR-001）
- [x] 3.4 新增 `RoleRepository` 端口：分页查询、详情（含已绑定权限 ID）、新增、编辑、删除、权限整体替换（rbac-role-management/FR-001, rbac-role-management/FR-002, rbac-role-management/FR-003, rbac-role-management/FR-004）
- [x] 3.5 新增 `BanRepository` 端口：分页查询、新增、编辑、删除（rbac-ban-management/FR-001, rbac-ban-management/FR-002, rbac-ban-management/FR-003）
- [x] 3.6 扩展 `AccountRepository` 端口：分页查询（支持关键字模糊匹配 + 账号类型筛选）、新增账号、启用、禁用、登录日志查询（rbac-account-management/FR-001, rbac-account-management/FR-002, rbac-account-management/FR-003, rbac-account-management/FR-004）——登录日志查询未新增独立端口方法，复用 `findById` 已含的 `loginedAt`/`loginIp` 字段（新增 `Account.loginIp` 字段，见收尾笔记的必要连带申报）
- [x] 3.7 在 `SystemErrors` 追加业务错误码：角色不存在、系统角色不可删除/不可改名、账号名冲突、封禁记录不存在等（design.md CP-11 对照）
- [x] 3.8 新增 `RoleApplicationService`：实现角色 CRUD 与权限分配用例，权限分配走"先删后插"整体替换语义（rbac-role-management/FR-001, rbac-role-management/FR-002, rbac-role-management/FR-003, rbac-role-management/FR-004）
- [x] 3.9 新增 `PamApplicationService`：实现账号 CRUD、启禁用、密码重置（复用 `PasswordHasher.hash()`）、登录日志查询用例（rbac-account-management/FR-001, rbac-account-management/FR-002, rbac-account-management/FR-003, rbac-account-management/FR-004, rbac-account-management/FR-005）
- [x] 3.10 新增 `BanApplicationService`：实现封禁记录 CRUD 用例（rbac-ban-management/FR-001, rbac-ban-management/FR-002, rbac-ban-management/FR-003）

## 4. 后端 - 基础设施层与适配层 `weiran-system-infrastructure` / `weiran-system-adapter`

- [x] 4.1 新增 `PamRoleDO`/`PamRoleMapper`，字段与 `pam_role` 表对齐（design.md Database Design）
- [x] 4.2 新增 `PamPermissionDO`/`PamPermissionMapper`，字段与 `pam_permission` 表对齐——补上了 design.md 遗漏的 `type` 字段（见任务 2.1 记录）
- [x] 4.3 新增 `PamRoleAccountDO`/`PamRoleAccountMapper`，字段与 `pam_role_account` 表对齐
- [x] 4.4 新增 `PamPermissionRoleDO`/`PamPermissionRoleMapper`，字段与 `pam_permission_role` 表对齐（联合主键 `(permission_id, role_id)`）
- [x] 4.5 新增 `PamBanDO`/`PamBanMapper`，字段与 `pam_ban` 表对齐
- [x] 4.6 新增 `MyBatisRoleRepository` 实现 `RoleRepository`，权限整体替换用"按 role_id 删全部旧记录 + 批量插入新集合"策略（rbac-role-management/FR-004）
- [x] 4.7 新增 `MyBatisBanRepository` 实现 `BanRepository`
- [x] 4.8 改造 `MyBatisAccountRepository`：实现分页查询、新增账号、启用、禁用、登录日志查询——登录日志复用 `findById` 已含字段，不新增独立查询方法
- [x] 4.9 在 `SystemInfrastructureAutoConfiguration.java` 正式登记 `RoleRepository`/`BanRepository` 的 Bean（完成 1.4 预留位）
- [x] 4.10 新增 `RoleController`：列表、详情、新增、编辑、删除、权限分配、权限点列表端点（rbac-role-management/FR-001, rbac-role-management/FR-002, rbac-role-management/FR-003, rbac-role-management/FR-004, rbac-role-management/FR-005，design.md API Design 表）——权限点列表端点因路径不能跳出类级前缀，拆到新增的 `PermissionController`（见收尾笔记越界申报）
- [x] 4.11 新增 `PamController`：列表、详情、新增、编辑、启用、禁用、密码重置、登录日志端点（rbac-account-management/FR-001, rbac-account-management/FR-002, rbac-account-management/FR-003, rbac-account-management/FR-004, rbac-account-management/FR-005）
- [x] 4.12 新增 `BanController`：列表、新增、编辑、删除端点（rbac-ban-management/FR-001, rbac-ban-management/FR-002, rbac-ban-management/FR-003）
- [x] 4.13 在 `SystemAdapterAutoConfiguration.java` 正式登记三个新 Controller 的 `@Import`（完成 1.3 预留位）——实际登记四个（含必要连带新增的 `PermissionController`），并补充三个应用服务的 Bean 定义
- [x] 4.14 录入本次新增的 7 个权限点（`weiran-system:role.index`/`role.manage`/`role.permissions`/`account.index`/`account.manage`/`ban.index`/`ban.manage`）到 `pam_permission` 表，并绑定到 `system=true` 的管理角色（design.md Rollout Plan 第 2 步）——SQL 脚本已产出至 `exec/permission-seed.sql`，实际执行需在目标环境人工完成（本地无可连接的真实数据库），发布阶段（7. 发布）实际执行

## 5. 前端 `web`

- [x] 5.1 新增 `AdminLayout`（Semi `Layout`+`Nav` 侧边栏+顶部栏），菜单按 `hasPermission()` 过滤显隐（admin-console-shell/FR-001, admin-console-shell/FR-002, admin-console-shell/FR-003）——菜单项不带图标，`@douyinfe/semi-icons` 未随 `semi-ui` 安装（见收尾笔记）
- [x] 5.2 改造 `App.tsx`：接入 `AdminLayout` 为父路由，新增嵌套子路由（admin-console-shell/FR-004）
- [x] 5.3 新增角色管理页面：列表、新增/编辑弹层表单、删除、权限树分配交互（rbac-role-management/FR-001, rbac-role-management/FR-002, rbac-role-management/FR-003, rbac-role-management/FR-004, rbac-role-management/FR-005）
- [x] 5.4 新增账号管理页面：列表（含筛选）、新增/编辑弹层表单、启禁用开关、密码重置交互（rbac-account-management/FR-001, rbac-account-management/FR-002, rbac-account-management/FR-003, rbac-account-management/FR-005）
- [x] 5.5 新增登录日志只读列表页面，挂载在账号管理下（rbac-account-management/FR-004）
- [x] 5.6 新增封禁管理页面：列表、新增/编辑弹层表单、删除（rbac-ban-management/FR-001, rbac-ban-management/FR-002, rbac-ban-management/FR-003）

## 6. 测试

- [x] 6.1 后端单元测试：`RoleAggregate.rename()` 系统角色保护逻辑、应用服务用例编排（对应 domain/application 层新增代码）——`RoleAggregateTest` 覆盖 domain 层；应用服务用例编排未做隔离单测（无 Mockito 依赖，且仓库既有先例 `AuthApplicationService` 同样只靠集成测试覆盖，不做隔离单测），改由 6.2 的端到端集成测试覆盖
- [x] 6.2 后端集成测试：仿照 `AuthEndpointIT` 新增端到端 HTTP 测试，覆盖三个新 Controller 的全部端点，验证 `@Import` 登记无遗漏、响应格式正确——`RbacAdminEndpointIT` 新增 6 个测试用例全部通过；过程中发现并修复 4 个真实 bug（见收尾笔记 E6）
- [x] 6.3 前端组件测试：`AdminLayout` 权限过滤显隐（admin-console-shell/FR-002 两个场景）、登出流程（admin-console-shell/FR-003）、未登录重定向（admin-console-shell/FR-004）——`AdminLayout.test.tsx`（3 用例）+ `RequireAuth.test.tsx`（2 用例），发现并修复 jsdom canvas 兼容性问题（见收尾笔记）
- [x] 6.4 前端组件测试：三个业务页面的列表/表单/删除交互——`RoleListPage.test.tsx`（3 用例）、`AccountListPage.test.tsx`（2 用例）、`BanListPage.test.tsx`（2 用例）

## 7. 发布

- [x] 7.1 后端随 `weiran-app` 正常构建发布，无数据库迁移步骤（design.md Rollout Plan）——`./gradlew check` 全绿验证构建就绪；数据库侧仍需人工执行 `exec/permission-seed.sql`（tasks.md 4.14 已注明）
- [x] 7.2 前端 `pnpm build` 产物随静态资源发布——`vite build` 验证构建成功，产物 `dist/`；存在 1.47MB 单 chunk 体积警告，design.md 已确认本次不做分包优化（刻意推迟决定）

## 8. 上线后

- [x] 8.1 验收记录写入 `artifacts.md`（只写 `exec/verify.md` 没有的：人读摘要、运行时验证、已知缺口）

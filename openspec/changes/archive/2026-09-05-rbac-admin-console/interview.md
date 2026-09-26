---
title: "RBAC 后台管理控制台（角色 / 账号 / 封禁）"
status: "draft"
updated_at: "2026-09-04"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。
> 澄清阶段信息密度最高,不落盘则换 session 即蒸发,后续所有文档都是它的降级复述。

## 一句话需求

> 用户原话,不要改写。

- 把 /Users/duoli/Projects/duoli-weiran/weiran-v1 的 mgr-page 后台复刻到本项目, 本项目对接 semi 组件, 如果不清楚框架样子, 可以查 mono repo 仓库的配置

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | PHP mgr-page 有约 15-18 个业务模块，但 Java 后端目前只有登录接口，这次要做多大范围？ | 全量复刻所有 12+ 个业务模块 | 拆分为多个 openspec change 分批推进，不做单次大爆炸式实现 |
| 2 | 全量复刻涉及 RBAC + 10 个业务领域，按什么顺序推进？ | 按 docs/10-模块映射.md 优先级（P1→P2→P3），逐个 openspec change 推进 | 本 change 是**第一个** change：RBAC 模板（角色 + 账号 + 封禁），作为后续所有模块的样板；P1(area/sms/oss)→P2(sensitive-word/category/content/app/version)→P3(ad/push) 留给后续 change |
| 3 | PamController 还包含登录日志、Token 会话管理、手机号绑定，本次要不要包含？ | 连带登录日志只读列表一起做 | 范围含：登录日志只读列表（复用 `pam_account.logined_at`/`login_ip`，无需新建表）。Token 会话管理（列表/强制下线）、手机号绑定管理明确推到后续 change |
| 4 | PHP 权限点命名是 `backend:{module}.{action}`，Java 侧现有示例是 `weiran-system:account.index`，新增权限点怎么命名？ | 沿用 Java 现有风格 `weiran-system:{resource}.{action}` | 新增权限点：`weiran-system:role.manage`、`weiran-system:account.manage`、`weiran-system:ban.manage` 等，不引入第二套命名体系 |
| 5 | 前端目前只有 LoginPage/HomePage，无侧边菜单/布局路由，本次要不要一并搭出通用后台布局壳子？ | 是，这次一并搭布局壳子 | 新增 AdminLayout（Semi Layout + Sidebar + Header）+ 嵌套路由，菜单含角色管理/账号管理/登录日志/风险拦截，为后续模块预留扩展位 |

## 边界

### 要做

- **Java 后端 - 领域建模**：在 `weiran-system-domain` 新增/扩展 Role、Permission（写模型，区别于现有 `rbac/Role.java`、`rbac/Permission.java` 这两个只读值对象）、Ban 聚合根及对应端口（Repository）。
- **Java 后端 - 基础设施**：新增 `pam_role`、`pam_permission`、`pam_role_account`、`pam_permission_role`、`pam_ban` 五张已存在表（迁移期与 PHP 共用）的 MyBatis-Plus DO/Mapper/Repository 实现；扩展 `AccountRepository`（分页查询、启用/禁用）。
- **Java 后端 - 应用层**：角色管理用例（列表/详情/新增/编辑/删除/角色-权限分配）、账号管理用例（分页列表/详情/新增/编辑/启用/禁用，不含手机号绑定）、登录日志只读查询用例、封禁管理用例（列表/新增/编辑/删除）。
- **Java 后端 - 适配层**：`RoleController`、`PamController`（账号管理 + 登录日志）、`BanController` 三个 REST Controller，统一走 `{code, message, timestamp, requestId, data}` 响应格式。
- **前端 - 布局壳子**：AdminLayout（Semi `Layout` + `Nav` 侧边栏 + 顶部栏），嵌套路由容器，替换/扩展现有 `RequireAuth` 路由结构。
- **前端 - 三个业务页面**：角色管理（列表 + 新增/编辑弹层表单 + 删除 + 权限树分配）、账号管理（列表 + 新增/编辑弹层表单 + 删除 + 启禁用开关）、封禁管理（列表 + 新增/编辑弹层表单 + 删除）；登录日志只读列表页挂在账号管理下。
- **样板沉淀**：本 change 的 design.md 要把「Java 五层建模模式」「REST API 设计规范（分页/统一响应/错误码）」「Semi 后台页面模式（列表页 Table + 表单弹层 Modal + 权限点绑定隐藏入口）」写清楚，供后续 P1/P2/P3 模块 change 直接复用，不重新发明。

### 明确不做

- 不做 Token 会话管理（PamController 的会话列表/强制下线），推到后续 change。
- 不做手机号绑定/解绑管理，推到后续 change。
- 不做系统配置（sys_config）、邮件设置、上传设置页面，这些属于 docs/10-模块映射.md 里未来才规划的模块。
- 不做 area/sms/oss/sensitive-word/category/content/app/version/ad/push 任何一个业务模块，全部推到后续按优先级开的 change。
- 不引入前端状态管理库（Redux/Zustand），继续沿用 TanStack Query，不做全局 store。
- 不做 Semi 的按需加载/分包体积优化（vite.config.ts 已有注释说明这是刻意推迟的决定，本 change 不重新引入 mono4ts 那套复杂度）。
- 不修改 `pam_role_account` 表结构本身（如补唯一约束），只按现状读写；若发现重复行等历史脏数据问题，记录到 openspec/reality/waitlist-tech.md，不在本 change 内清理。

### 本次不决定(留给后续 change)

- Token 会话管理的具体交互方式（是否支持批量强制下线）。
- 权限树的具体 UI 组件选型细节（Semi Tree vs 自定义），design 阶段再定。
- 审计日志（操作日志，区别于登录日志）是否需要，属于未来模块。

### 本次要在 design 阶段决定(留给 L2 design.md，非阻塞性歧义)

- **Role/Permission 写模型与现有只读值对象的关系**：`explore.md` 发现现有 `weiran-system-domain/.../rbac/Role.java`、`Permission.java` 已是 `pam_role`/`pam_permission` 表在领域层的唯一现有表示（被 `RbacRepository` 只读链路使用，`@Builder(toBuilder=true)` 不可变值对象，无持久化注解）。design.md 必须明确二选一：(a) 扩展这两个既有类使其同时承担只读投影与可编辑聚合根职责；(b) 保持两者只读不变，新增独立的可编辑聚合根并说明与现有类型的转换关系。不得含糊地"新建一套同名类型"了事。
- **前端 REST 方法选型**：`web/src/lib/api.ts` 目前只有 `get`/`post` 封装。design.md 需决定新 Controller 是走标准 REST 动词（PUT/DELETE，需要扩展 `api.ts`）还是全部收敛为 POST 语义化路径（避免改动这个共享文件）。
- **`weiran-common` 分页契约现状**：design 阶段第一步需先读 `weiran-common` 源码确认是否已有可复用的分页请求/响应 DTO，没有则新增一次性通用类型供三个 Controller 共用，避免三套不一致的分页实现。

## 验收标准

> 可判定真假的陈述。「体验更好」不是验收标准,「列表首屏 < 1s」是。
> **逐条编号 `AC-N`** —— L8 校验要按编号逐条回指,没有编号就只能整体估。

- [ ] AC-1 `RoleController` 提供角色列表（分页）、详情、新增、编辑、删除、角色-权限树分配六个 REST 端点，均返回统一响应格式 `{code, message, timestamp, requestId, data}`。
- [ ] AC-2 `PamController` 提供账号列表（分页，支持按用户名/手机号/邮箱/类型筛选）、详情、新增、编辑、启用、禁用六个 REST 端点，以及登录日志只读分页列表端点。
- [ ] AC-3 `BanController` 提供封禁列表（分页）、新增、编辑、删除四个 REST 端点。
- [ ] AC-4 `weiran-system-domain` 不依赖任何 Spring/MyBatis 框架类型；`*DO`/`BaseMapper`/`IPage`/`Wrappers` 只出现在 `weiran-system-infrastructure`（CP-1/CP-2/CP-3 静态可验证）。
- [ ] AC-5 新增权限点全部符合 `weiran-system:{resource}.{action}` 命名格式，且在角色-权限分配 UI 中可见、可勾选、可保存。
- [ ] AC-6 前端新增 AdminLayout，包含侧边菜单（角色管理/账号管理/风险拦截三个一级菜单项，账号管理下含登录日志二级项）+ 顶部栏（当前用户信息 + 登出）。
- [ ] AC-7 角色管理页可完成：查看列表 → 新增角色 → 编辑角色 → 分配权限 → 删除角色的完整闭环操作，每步操作后列表数据实时刷新（TanStack Query invalidate）。
- [ ] AC-8 账号管理页可完成：查看列表（分页）→ 新增账号 → 编辑账号 → 启用/禁用切换 → 查看登录日志的完整闭环操作。
- [ ] AC-9 封禁管理页可完成：查看列表 → 新增封禁记录 → 编辑 → 删除的完整闭环操作。
- [ ] AC-10 无权限的按钮/菜单项在前端隐藏（复用 `hasPermission()`），但真正的访问控制在后端 Controller 层用权限点拦截生效（前端隐藏仅优化体验，不作为安全边界）。
- [ ] AC-11 `./gradlew check`（含 Checkstyle/SpotBugs/Forbidden APIs/Error Prone/NullAway/覆盖率）全绿；`pnpm test`、`pnpm lint`（前端）全绿。
- [ ] AC-12 涉及的五张表（`pam_role`/`pam_permission`/`pam_role_account`/`pam_permission_role`/`pam_ban`）均为迁移期与 PHP 侧共用的既有表，Java 侧新增的 DO 字段类型/约束与 PHP 迁移文件定义的字段一致，不做任何 ALTER（非破坏性变更，CP-7 合规）。

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 复刻范围 | 拆成多个 change，本次只做 RBAC 模板 | 一次性全量复刻 12+ 模块 | 单个 change 涵盖全部模块会导致 design/tasks/verify 文档失控，且后端从零到有的建模工作量本身就很大；先做样板可复用给后续模块，降低总成本 |
| Role/Permission 领域类型 | 新建写模型（聚合根），与现有 `rbac/Role.java`/`rbac/Permission.java`（只读值对象）共存，通过命名/包路径区分职责 | 直接复用现有只读值对象加 setter | 现有值对象服务于登录鉴权这条只读链路（`RbacRepository.selectRoleNamesByAccountId`），语义是"账号已有的角色/权限名称集合"；管理后台需要的是可编辑的聚合根，语义不同，混用会让只读值对象承担不该有的持久化职责 |
| 登录日志范围 | 只读列表，复用 `pam_account` 已有的 `logined_at`/`login_ip` 字段 | 新建独立的登录日志明细表 | PHP 侧 `PamController@log` 展示的就是账号表上的最近登录信息，不是逐次登录流水表；不新建表避免不必要的破坏性变更评估 |
| 前端布局 | 本次一并搭 AdminLayout 壳子 | 只写三个孤立页面，布局另开 change | 布局壳子是所有后续业务模块页面的共同容器，晚做等于后面每个模块 change 都要单独打补丁改路由结构，不如现在定型 |
| 权限点命名 | 沿用 `weiran-system:{resource}.{action}` | 引入 PHP 风格 `backend:{module}.{action}` | 前端 `HomePage.tsx` 已经写死了 `weiran-system:account.index` 这个示例权限点，双重命名体系会让权限判断逻辑复杂化且容易出错 |

## 未决歧义

> **必须清零才能进入 L2 propose**。每一条都要么被回答,要么被移入「本次不决定」。
> 每条歧义写成 `- [ ] <歧义>`;被回答后改成 `- [x] <歧义> → 已确认:<结论>`。
> **全部清零后本节保留下面的 `- 无`,不要留空的 `- [ ]`** —— 空占位会被 `openspec check` 判为未清零。

- 无

## 对下游的硬约束

> 明确传给 design/tasks 的不可协商项(兼容性、数据不可丢、必须灰度、依赖的外部时间点等)。

- 五张 RBAC/封禁相关表（`pam_role`/`pam_permission`/`pam_role_account`/`pam_permission_role`/`pam_ban`）是迁移期与 PHP 侧并行读写的既有表，Java 侧新增 DO 严禁做 ALTER TABLE，字段类型必须与 PHP 迁移文件（`weiran/system/resources/migrations/`）逐一核对一致（详见宪法 CP-7）。
- `pam_role_account` 中间表当前没有唯一约束、可能存在重复行，Java 侧新增/编辑角色分配逻辑必须能容忍历史重复数据，不能假设唯一性。
- 新密码/账号相关操作一律遵循 CP-8：不得引入或依赖 PHP 遗留的 `md5(sha1(...))` 算法，账号管理页面如涉及密码重置需复用已有的 `PasswordHasher` 端口。
- domain 层新增的 Role/Permission/Ban 聚合根禁止依赖任何框架类型（CP-1），端口定义在 domain、实现在 infrastructure（CP-3）。
- 前端统一响应格式 `code` 字段是字符串 `"0"` 表示成功，禁止用 `code !== 0` 判断。

## Gate

- [x] 「未决歧义」已清零
- [x] 验收标准均可判定真假
- [x] 「明确不做」已列出且足够具体

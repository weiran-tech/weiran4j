---
title: "用户列表高级筛选补后端单字段查询 · 现实校验"
status: "done"
updated_at: "2026-09-27"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。
> 这一层是**必须执行**的,不是 `explore / propose` 二选一——跳过它,设计就是纸上推演,
> 现实冲突会推迟到 subagent 动手时才爆,那时返工成本已经放大 10 倍。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-common` | `status/EnableStatus.java` | 现有 `status` 查询参数的解析口径(`filterOf`),新增的性别过滤要照抄这个模式 |
| `weiran-framework` | `web/GlobalExceptionHandler.java`、`autoconfigure/WeiranFrameworkAutoConfiguration.java`、`time/WeiranTime.java` | 时间参数的全局绑定格式、类型不匹配时的错误码 |
| `weiran-system-*` | `UserController` → `UserService`/`UserQuery`(api)→ `UserApplicationService` → `UserCriteria`/`UserRepository`(domain)→ `MybatisUserRepository`(infrastructure);`Gender`;`LoginLogController` | 用户分页查询全链路;时间范围参数的既有写法 |
| `weiran-app` | `src/test/java/com/weiran/app/UserRoleIT.java`、`IntegrationTestSupport.java` | 用户接口集成测试的既有结构,新测试接在这里 |
| 迁移脚本 | `weiran-system-infrastructure/.../db/migration/system/V202609260001__system_init_schema.sql` | 确认所需列与索引都已存在,本次不需要新脚本 |
| `web` | `pages/system/users/UsersPage.tsx`、`components/SearchToolbar.tsx`、`types/api.ts`、`hooks/queries/roles.ts`、`utils/date.ts` | 前端高级筛选面板、已选条件、查询参数类型 |

## 现有实现

> 带 `file_path:line` 引用,便于后续 agent 直接跳转。

| 能力 | 位置 | 现状 |
|---|---|---|
| 分页接口入参 | `weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/UserController.java:48-55` | `@RequestParam` 只收 `keyword`、`status`、`departmentId`、`page`、`pageSize`,组装 `new UserQuery(keyword, status, departmentId)` |
| 查询条件(api 层) | `weiran4j/weiran-system/weiran-system-api/src/main/java/com/weiran/system/api/user/UserQuery.java:12` | `record UserQuery(@Nullable String keyword, @Nullable String status, @Nullable Long departmentId)`,原始字符串未校验 |
| 应用服务 | `weiran4j/weiran-system/weiran-system-application/src/main/java/com/weiran/system/application/user/UserApplicationService.java:78-87` | 把 `UserQuery` 规范化成 `UserCriteria`:`Texts.trimToNull(keyword)`、`EnableStatus.filterOf(status)`、部门展开为含子部门的 ID 集合 |
| 查询条件(domain 层) | `weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/user/UserCriteria.java` | `record UserCriteria(keyword, EnableStatus status, Set<Long> departmentIds)`,全部可空,空即不过滤 |
| 仓储端口 | `weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/user/UserRepository.java:64` | `PageResult<User> page(UserCriteria criteria, PageQuery pageQuery)` |
| 仓储实现 | `weiran4j/weiran-system/weiran-system-infrastructure/src/main/java/com/weiran/system/infrastructure/persistence/MybatisUserRepository.java:187-206` | `LambdaQueryWrapper<SysUserDO>`:keyword 三列 `like`(`Likes.escape`)、`eq status`、`in departmentId`,`orderByAsc(id)` |
| 状态解析 | `weiran4j/weiran-common/src/main/java/com/weiran/common/status/EnableStatus.java:41` | `filterOf`:空白 → `null`(不过滤),非法值 → `BizException.badRequest`(40000) |
| 性别枚举 | `weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/user/Gender.java:31-39` | 只有 `of`:空白 → `UNKNOWN`(不是 `null`),非法 → 40000。**没有「空即不过滤」的 `filterOf`** |
| 时间范围参数先例 | `weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/LoginLogController.java:35-36` | `@RequestParam(required = false) @Nullable LocalDateTime startTime / endTime`,由全局格式化器按 `yyyy-MM-dd HH:mm:ss` 绑定 |
| 时间格式注册 | `weiran4j/weiran-framework/src/main/java/com/weiran/framework/autoconfigure/WeiranFrameworkAutoConfiguration.java:119`、`time/WeiranTime.java:19` | `addFormatters` 注册 `DATE_TIME_PATTERN = "yyyy-MM-dd HH:mm:ss"` |
| 参数类型错误 | `weiran4j/weiran-framework/src/main/java/com/weiran/framework/web/GlobalExceptionHandler.java:135-136` | `MethodArgumentTypeMismatchException` → 「<参数名>: 参数类型不正确」,归入 40000 |
| 表结构 | `V202609260001__system_init_schema.sql:4-57` | `sys_user` 已有 `username`(唯一)、`email`、`phone`、`gender`、`created_at`、`last_login_at`(可空);`sys_user_role(user_id, role_id)` 主键 + `idx_sys_user_role_role_id` |
| 用户集成测试 | `weiran4j/weiran-app/src/test/java/com/weiran/app/UserRoleIT.java:81-130` | `userCrud` 已覆盖 `keyword&status&departmentId` 组合查询;Testcontainers MySQL |
| 前端查询类型 | `web/src/types/api.ts:136-140` | `UserQuery { keyword?, status?, departmentId? }` |
| 前端页面 | `web/src/pages/system/users/UsersPage.tsx` | `Filters` 三字段 + `toQuery()`;高级面板(本会话未提交改动)只放关键字 / 所属部门 / 状态;`conditions` 生成已选条件 |
| 搜索栏组件 | `web/src/components/SearchToolbar.tsx` | 本会话未提交改动:`leading` / `advanced` + `SearchField` / `conditions` / `onRefresh` 已就绪 |
| 角色下拉 | `web/src/hooks/queries/roles.ts:30` | `useRoleOptions()` → `GET /api/roles/options`(🔑 仅需登录),**只返回启用角色** |
| 日期工具 | `web/src/utils/date.ts:7` | `toTimeRange(Date[])` 按 `YYYY-MM-DD HH:mm:ss` 原样格式化,不做整天边界 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `EnableStatus.filterOf` 的「空即不过滤、非法 40000」模式 | `weiran-common/.../EnableStatus.java:41` | 给 `Gender` 照抄一个 `filterOf` | 是:`Gender` 新增 `filterOf`(domain 内,不动 `weiran-common`) |
| `@Nullable LocalDateTime` + 全局格式化器 | `LoginLogController.java:35-36` | 新时间参数同样声明为 `LocalDateTime`,格式与报错全部白拿 | 否 |
| `MethodArgumentTypeMismatchException` → 40000 | `GlobalExceptionHandler.java:135` | 非法时间 / 非数字 ID 自动得到 40000(AC-6) | 否 |
| `Texts.trimToNull` | 应用服务已在用 | 用户名 / 手机号 / 邮箱去首尾空白、空串视为不过滤 | 否 |
| `LambdaQueryWrapper` 条件链 | `MybatisUserRepository.java:191-201` | 追加 `eq` / `ge` / `le` / 子查询 | 否 |
| `sys_user_role.role_id` 索引 | 建表脚本 | 角色过滤用 `id in (select user_id from sys_user_role where role_id = ?)`,天然去重(AC-4) | 否 |
| `UserRoleIT` + `IntegrationTestSupport` | `weiran-app/src/test/...` | 新增一个用例覆盖 AC-1~AC-7 | 否 |
| `SearchToolbar` 的 `advanced` / `SearchField` / `conditions` | `web/src/components/SearchToolbar.tsx` | 面板直接加字段、条件直接加标签 | 否 |
| `useRoleOptions`、`useDictOptions('sys_user_gender')`、`DictSelect` | `hooks/queries/roles.ts`、`hooks/queries/dicts.ts`、`components/DictSelect.tsx` | 角色下拉 / 性别下拉与标签取名 | 否 |

## 真实约束

> 代码里客观存在、设计必须绕开的东西。

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| `Gender.of(null)` 返回 `UNKNOWN` 而不是 `null` | `Gender.java:31-34` | 不能直接拿 `of` 做过滤解析,否则「不传性别」会变成「只查 unknown」,静默改变默认结果(违反 AC-7)。必须新增 `filterOf` |
| 持久化类型只能出现在 infrastructure | AGENTS.md「分层规矩」、宪法 | 子查询 / `Wrappers` 只能写在 `MybatisUserRepository`;`UserCriteria` 只放领域可理解的值 |
| `*-api` / `*-domain` 只能依赖 `weiran-common` | AGENTS.md「分层规矩」 | `UserQuery`、`UserCriteria` 里的时间用 `java.time.LocalDateTime`,不引框架类型 |
| 禁 `java.util.Date` | 宪法 / Forbidden APIs | 全程 `LocalDateTime` |
| 契约先行 | AGENTS.md「先读这四条」第 1 条 | §6.2 先改 |
| 角色下拉只返回启用角色 | `hooks/queries/roles.ts:30`、契约 §6.3 `/options` | 前端无法选到已禁用角色来筛选;后端 `roleId` 参数本身对禁用角色照样生效 |
| 前端 DatePicker 的 `dateRange` 返回当天 00:00 | Semi 行为;`utils/date.ts:7` 不补边界 | 结束日需前端补 `23:59:59` 才满足「含当天整天」(interview #3),不能直接复用 `toTimeRange` |
| 本会话未提交的搜索栏改造已在工作区 | `git status`:`SearchToolbar.tsx`、`UsersPage.tsx`、`UsersPage.test.tsx`、`global.css`、`components.md`、`sys_user.md` | 按 interview #6 并入本 change;L7 / L9 的 diff 同时包含两部分 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran4j/docs/01-架构与接口契约.md` §6.2 | 改造:列出全部查询参数与匹配口径 |
| `weiran-system-api/.../user/UserQuery.java` | 改造:新增字段 |
| `weiran-system-adapter/.../web/UserController.java` | 改造:新增 `@RequestParam` |
| `weiran-system-domain/.../user/UserCriteria.java` | 改造:新增字段 |
| `weiran-system-domain/.../user/Gender.java` | 改造:新增 `filterOf` |
| `weiran-system-domain/src/test/.../user/UserTest.java` | 改造:补 `Gender.filterOf` 单测 |
| `weiran-system-application/.../user/UserApplicationService.java` | 改造:`page()` 规范化新条件 |
| `weiran-system-infrastructure/.../persistence/MybatisUserRepository.java` | 改造:`page()` 追加条件 |
| `weiran-app/src/test/java/com/weiran/app/UserRoleIT.java` | 改造:新增高级筛选集成用例 |
| `web/src/types/api.ts` | 改造:`UserQuery` 新增字段 |
| `web/src/utils/date.ts` | 改造:新增「日期范围 → 整天边界」工具(或同等位置) |
| `web/src/pages/system/users/UsersPage.tsx` | 改造:`Filters` / `toQuery` / 面板字段 / 已选条件 |
| `web/src/pages/system/users/__tests__/UsersPage.test.tsx` | 改造:补 AC-9、AC-10 用例 |
| `openspec/state/bizs/sys_user.md` | 改造:关闭 #08,同步筛选说明 |
| `openspec/rules/advisory/components.md` | 改造:`SearchToolbar` 条目中「用户页只有三项」的描述 |
| (并入)`web/src/components/SearchToolbar.tsx`、`web/src/styles/global.css` | 已在工作区的搜索栏改造,本 change 不再改其结构 |

**不会碰的目录**:`weiran-common/`、`weiran-dependencies/`、`build-logic/`、`weiran-platform/`、`weiran-framework/`、
所有 `db/migration/`、`settings.gradle.kts`、`web/src/App.tsx`、`web/src/layouts/`、其它页面目录(`web/src/pages/` 下除 `system/users/` 以外)、
`openspec/rules/enforced/`、`openspec/schemas/`、`openspec/check.mjs`、`openspec/guards/`。

### 共享层命中 ⚠️

> **命中任意一项,该改动即归入 L4 执行计划的第 0 层,串行先做,不参与并行。**
>
> 下面三张表是本仓库的完整判定清单 —— **逐行过一遍**,命中写原因与预计改动,未命中写「未命中」。
> 整行留空视为漏判:共享层漏一项,L5 并行阶段必然冲突。
>
> 判定流程:
> ```
> 改动涉及的文件
>       ↓
> 命中下面三张表? ──是──→ Layer 0,串行
>       ↓否
> 被 2 个以上执行单元读取? ──是──→ Layer 0(读也要先冻结)
>       ↓否
> 普通并行单元
> ```

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 | 未命中:不新增模块 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 | 未命中:不新增模块、不加依赖 |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 | 未命中:只改 `weiran-app/src/test` 下的集成测试,不改构建脚本 |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 | 未命中:不新增页面 |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) | 未命中:不新增菜单 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 | 未命中:非法值复用现有 40000(`BizException.badRequest` / 类型不匹配),不新增错误码 |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 | 未命中:分页结构不变 |

#### 序号型资源(本仓库暂无)

本仓库没有 Flyway/Liquibase 或带序号的 migration 文件,数据库结构变更依赖手写 SQL
并与 PHP 侧 `weiran-v1` 的迁移文件人工核对(宪法 CP-7)。**不存在**「文件名序号递增,
两个并行改动会撞同一个号」这类冲突点。若本次改动确实要引入某种迁移工具,
在 `rules/enforced/project.md` 补一条 SL-N 再回填这里,不要假设已有序号台账。

> 本次核对:模板本节的文字已过时——本仓库实际使用 Flyway(`db/migration/<module>/V<yyyyMMddHHmm>__*.sql`)。
> 但**本 change 不新增任何迁移脚本**(所需列与 `role_id` 索引均已存在),序号型资源未命中。
> 模板文字过时属于流水线自身欠账,不在本 change 范围内。

**非共享层但被多单元读取的冻结点**:接口契约 §6.2 的参数名与口径(后端 adapter、前端 `types/api.ts`、前端页面三处共同消费)
——须在后端与前端动手前先定稿(契约冻结),归入 L4 的 Layer 0。

## 对 interview 的反向修正

> explore 的价值一半在这里。发现需求与现实冲突,**回改 `interview.md` 并注明**,不要闷头往下走。

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| (无冲突)需求与代码现实一致:所需列、索引、时间参数绑定、40000 报错路径均已存在 | — | 不需修正 | ☑ 无需同步 |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 性别过滤误用 `Gender.of` | 实现时图省事直接调 `of` | 「不传」会被解析成 `unknown`,默认列表静默只剩未知性别用户;design 明确要求新增 `filterOf` 并单测「空 → null」 |
| 角色过滤用 join 导致重复行 | 用 `join sys_user_role` 而非子查询 | 一人多角色时重复且 `total` 偏大(AC-4);design 规定用 `in (subquery)` |
| 子查询拼接 SQL | 用字符串拼 `role_id` | 虽为 `Long` 无注入面,仍按参数绑定写(`apply` 的 `{0}` 占位或 `inSql` 配合数值) |
| 结束日不含当天 | 前端直接把 DatePicker 的日期原样传 | 当天创建的用户查不出;前端需补 `23:59:59`,有单测 |
| 已禁用角色选不到 | 角色下拉只返回启用角色 | 本次接受:后端参数照常支持;记入 `sys_user.md` 说明,不另开问题 |
| 无索引列过滤 | `email` / `phone` / 时间列数据量大时 | interview 已列入「本次不决定」;后台管理量级可接受 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子

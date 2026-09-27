---
title: "用户列表高级筛选补后端单字段查询"
owner: "多厘"
status: "done"
created_at: "2026-09-27"
updated_at: "2026-09-27"
---

# Proposal

## Why

- 背景:用户管理的搜索栏已按设计稿 `wuli-design/testing.pen`「用户列表」改造,设计稿的高级筛选面板有用户名、用户 ID、手机号、邮箱、
  所属部门、角色、状态、性别、创建时间、最后登录时间等字段。
- 业务目标:管理员能按单个字段的确切值定位用户,并按角色、性别、时间范围收窄列表。
- 当前问题:`GET /api/users` 只支持 `keyword`(用户名 / 昵称 / 手机模糊)、`status`、`departmentId`,高级面板只能放出三项,
  其余字段无法筛选(`openspec/state/bizs/sys_user.md#08`)。
- 需求来源:见 `interview.md`

## What Changes

- 新增:`GET /api/users` 的独立查询参数——用户名、用户 ID、手机号、邮箱(均精确匹配)、角色 ID(拥有该角色)、性别(等值)、
  创建时间范围、最后登录时间范围(闭区间)。
- 改造:契约 §6.2 的用户查询说明;前端 `UserQuery` 类型;用户管理页高级筛选面板放出设计稿的 10 个字段,新条件进入「已选条件」标签。
- 复用(来自 `explore.md` 的可复用点):`EnableStatus.filterOf` 的解析模式、`LocalDateTime` 全局格式化绑定与类型不匹配 40000、
  `Texts.trimToNull`、`sys_user_role.role_id` 索引、`SearchToolbar` 的 `advanced` / `SearchField` / `conditions`、`useRoleOptions`、
  `DictSelect`、`UserRoleIT` 集成测试骨架。
- 并入:本会话此前未提交的搜索栏改造(设计稿工具栏、高级筛选面板骨架、已选条件胶囊标签及缩小),见 `interview.md` 澄清 #6。
- 下线/不做:见 Out of Scope。

## Scope

### In Scope

- 后端 `GET /api/users` 新增八类独立查询参数,与既有 `keyword` / `status` / `departmentId` 取交集,缺省即不过滤。
- 契约 §6.2 先行更新;前端 `web/src/types/api.ts` 同步。
- 前端高级筛选面板按设计稿顺序放出 10 个字段;新条件显示为可删除的「已选条件」标签(可读值)。
- 并入已在工作区的搜索栏改造。
- 关闭 `sys_user.md#08`,同步 `sys_user.md` 列表 / 筛选说明。

### Out of Scope

> 与 `interview.md` 的「明确不做」保持一致。

- 不做「是否启用」字段(与状态同义)。
- 不做角色多选、用户名 / 手机号 / 邮箱的模糊匹配(模糊找人继续用顶栏 `keyword`,其口径不变)。
- 不改表结构、不加索引、不新增 Flyway 脚本(所需列与 `sys_user_role.role_id` 索引均已存在)。
- 不改列表排序(仍按 `id` 升序)、不加导出、不加「展开树状」按钮。
- 不改其它列表页(角色、部门、日志等)的搜索栏。
- 不改 `GET /api/users/options`、用户增删改接口与 `UserView` 返回结构。

## Capabilities

> 本节是 **proposal 与 specs 阶段之间的契约**:每个能力对应一个 `specs/<kebab-case>/spec.md`,
> 一一对应,不得多也不得少(`node openspec/check.mjs` 会逐项校验)。
> 能力名必须用反引号包裹的 kebab-case。
>
> **能力名是持久的领域名词,不是本次 change 的名字。** 与 change 同名会被判错
> (`L2a/capability-not-change-name`)。`fix-` / `-fixed` / `-cleanup` / 动词短语都是事件名不是能力名:
> 同一块实现该叫 `biz-project-create-modal`,而不是拆成
> `project-create-as-modal` + `project-create-modal-fullscreen-headers-buttons` + `fix-project-create-modal-scroll`
> 三个并列能力 —— 那样它们会同时生效并互相矛盾,且校验全绿。
>
> **填表前先读 `openspec/specs/README.md`(能力索引)** —— 一页看全全部能力的名字、需求数、
> 状态与一句话职责。要改的行为已有能力在管,就用那个能力名走 MODIFIED / REMOVED,不要新开一个。

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `user-list-search` | ADDED | 用户列表的检索口径:查询参数、各字段匹配方式、条件组合与非法值处理,以及前端高级筛选与已选条件的行为。已读能力索引:`admin-foundation` 的 Purpose 明确「只约束跨接口恒成立的行为」,不管单接口的筛选口径;`rbac-account-management` 已 superseded。故新建 |

<!-- openspec:slot project-structure
  【项目特定 · 换项目必须重写本槽】
  问:本项目由哪些可独立影响的部分组成?一次改动需要按什么维度声明影响面?
  为什么问:这决定了 L4 分层的粒度。monorepo 按包,单体按模块,Laravel 按 poppy 模块。
  答案要求:一张覆盖全部组成部分的表,每行能回答「这次动没动它、怎么动」。

  本项目的权威版本住在 `openspec/rules/enforced/project.md` 的 `PK-N` 条目(下方「影响的包」表)——
  改包清单先改那里,再同步这里的表(ID 列对应 `PK-N`)。两边 ID 不一致会被
  `TEMPLATE/profile-rows` 拦。「共享层影响」表不走这套同步,见 rules/enforced/project.md 「五」的说明。
-->

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | `weiran-common` | 不涉及 | 错误码复用 40000,分页契约不变,不改动 | — |
| PK-2 | `weiran-system-*`(api/domain/application/infrastructure/adapter) | 改造 | api:`UserQuery` 加字段;domain:`UserCriteria` 加字段、`Gender.filterOf`;application:`page()` 规范化;infrastructure:`MybatisUserRepository.page()` 加条件;adapter:`UserController` 加参数 | 多厘 |
| PK-3 | `weiran-app` | 改造(仅测试) | `src/test/.../UserRoleIT.java` 新增集成用例;构建脚本不动 | 多厘 |
| PK-4 | `web` | 改造 | `types/api.ts`、`utils/date.ts`、`pages/system/users/*`;并入 `components/SearchToolbar.tsx`、`styles/global.css` 的既有改动 | 多厘 |

## 共享层影响(决定能否并行)

> 命中即进入 `exec/plan.md` 的 Layer 0,串行先做。本表来源是 `explore.md` 的共享层命中清单——
> 那里是完整清单,此处只做汇总勾选。

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| `settings.gradle.kts` / `weiran-dependencies` BOM(新增模块) | ☐ | 不新增模块、不加依赖 |
| `weiran-common` 的错误码/分页契约 | ☐ | 复用 40000,分页结构不变 |
| `weiran-app/build.gradle.kts` 依赖聚合 | ☐ | 只改测试源码 |
| `web/src/App.tsx` + `AdminLayout.tsx`(路由/菜单) | ☐ | 不新增页面与菜单 |

<!-- /openspec:slot project-structure -->

<!-- openspec:slot crosscuts
  【项目特定 · 换项目必须重写本槽】
  问:本项目有哪些「每次改动都该问一遍、漏了没人会发现」的横切关注点?
  为什么问:tasks.md 是唯一权威需求源,没人会重新推导需求。这里漏掉的东西,
           L8 也发现不了 —— 因为 spec 里根本没写。这张表是唯一的漏项防线。
  答案要求:逐项可勾选;勾「不涉及」是合法的,但必须写判断依据。
  注意:这一项与语言无关,与【业务域】有关 —— 电商、财务、内控各不相同。

  本项目的权威版本住在 `openspec/rules/enforced/project.md` 的 `CC-N` 条目 —— 改横切关注点先改那里,
  再同步下面表格「项」列的 ID 前缀。两边 ID 不一致会被 `TEMPLATE/profile-rows` 拦。
-->

## 横切关注点

> 这几项在本仓库最容易漏,漏了 L8 也发现不了(因为 spec 里根本没写)。
> **本系统目前只有 RBAC/JWT 登录一个业务域**,多项标注「不适用/尚未引入」是如实反映现状,
> 不是模板没填全——填写时不要因为条目存在就假设对应机制已经落地,先去
> `rules/enforced/project.md` 「三、横切关注点」核实。

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 (`pam_permission`) | ☐ | 沿用 `system:user:list`,不新增权限码;角色下拉 `/api/roles/options` 仅需登录,有列表权限者均可用 |
| CC-2 菜单(前端硬编码,无后端表) | ☐ | 不新增菜单与页面 |
| CC-3 数据范围 (`data-scope`,尚未引入) | ☐ | 尚未引入;新条件只在已有可见范围内收窄结果,不放宽 |
| CC-4 多租户隔离 (`tenant`,不适用) | ☐ | 不适用 |
| CC-5 审计日志(登录日志 + `@OperationLog` 操作日志) | ☐ | 只读查询,按现有约定 GET 不记操作日志 |
| CC-6 字段脱敏 (`masking`,尚未引入) | ☐ | 返回的 `UserView` 不变;手机号 / 邮箱作为查询参数只用于比对,不新增日志输出 |
| CC-7 幂等 (`idempotency`,尚未引入) | ☐ | 只读 GET,天然幂等 |
| CC-8 导出 / 任务中心(尚未引入) | ☐ | 明确不做导出 |
| CC-9 工作流绑定(不适用,系统内暂无审批引擎) | ☐ | 不适用 |

<!-- /openspec:slot crosscuts -->

## Dependencies

- 产品/设计:设计稿 `wuli-design/testing.pen`「用户列表」及其笔记约定(已在本会话读取)。
- 后端:`weiran-system` 五层;不依赖其它模块改动。
- 前端:`SearchToolbar` 的 `advanced` / `SearchField` / `conditions`(并入的既有改动)。
- 数据库变更(需按宪法 CP-7 去 `weiran-v1` 核对迁移文件):无——不新增迁移脚本,所需列与索引均已存在。
- 运维/配置:无。
- 测试:`weiran-app` 集成测试(Testcontainers,需要 Docker);`Gender.filterOf` 单测;前端 vitest。

## Risks

| 风险 | 触发场景 | 应对方案 |
|---|---|---|
| 不传性别时被解析成 `unknown` | 过滤解析误用 `Gender.of` | 新增 `Gender.filterOf`(空 → 不过滤),单测锁住;集成测试断言不传新参数时结果不变(AC-7) |
| 一人多角色导致重复行 / total 偏大 | 角色过滤用 join | 用 `id in (select user_id from sys_user_role where role_id = ?)` 子查询 |
| 当天数据查不出 | 结束日期未补到当天 23:59:59 | 前端统一在工具函数里补边界并单测 |
| 已禁用角色无法在下拉中选择 | `/api/roles/options` 只返回启用角色 | 本次接受并在 `sys_user.md` 说明;后端参数对禁用角色照常生效 |
| L9 diff 同时含并入的搜索栏改造 | interview #6 决策 | verify 中分别说明两部分,L9 展示时按文件分组 |

## Review Checklist

- [x] 范围和非目标已确认,且与 `interview.md` 一致
- [x] 涉及的包和 Owner 已确认
- [x] 共享层影响已勾选(直接决定 L4 分层)
- [x] 横切关注点已逐项过一遍
- [x] 数据库、接口、定时任务、配置、发布影响已列出
- [x] 测试和灰度策略已确认

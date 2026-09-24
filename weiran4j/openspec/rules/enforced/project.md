# 项目结构画像

> **跨 change 不变的项目结构事实。** 共享层清单与并行判据只在这里断言一次，不在每个
> change 里重新调研——这两类事实几乎不随 change 变化，变化的只是"这次改没改到"。
>
> **本文件与 [`rules/enforced/constitution.md`](constitution.md) 是同一种机制，同样的取舍**：
> 内容本身**不会**被 OpenSpec 自动注入 agent 的提示词（不在 `config.yaml` / `schema.yaml` 的
> instruction / `templates/` 三处之内）。真正被注入的是六个槽里各自的镜像：
>
> | 条目前缀 | 来源 | 镜像在哪 |
> |---|---|---|
> | `SL-N` | 共享层清单 | `templates/explore.md` 的 `shared-layers` 槽（表格行） |
> | `WT-N` | 并行判据 | `templates/exec-plan.md` 的 `worktree-tradeoffs` 槽（表格行） |
> | `CC-N` | 横切关注点 | `templates/proposal.md` 的 `crosscuts` 槽（表格「项」列前缀） |
> | `PK-N` | 影响的包 | `templates/proposal.md` 的 `project-structure` 槽（表格行） |
> | `TG-N` | 实现任务分组 | `templates/tasks.md` 的 `task-groups` 槽（分组标题后缀） |
> | `DS-N` | Design 必填章节 | `templates/design.md` 的 `design-sections` 槽（章节标题后缀） |
>
> 每一处都只要求 **ID 覆盖一致**，不要求文字复述一致；`node openspec/check.mjs` 的
> `TEMPLATE/profile-rows` 检查两边 ID 集合是否漂移。
>
> **怎么改**：项目事实变化（新增模块、新增横切关注点、调整任务分组顺序……）时，
> **先改这里**，再同步改对应模板槽里的那一行/那个标题，最后跑 `node openspec/check.mjs` 确认没漏改。
> 只加 ID 不写行，或只删行不删 ID，都会被检查拦下来。

---

## 什么时候读哪节

六个小节的标题按**流水线产物**命名（它们决定哪份 artifact 怎么填），但这些事实
**不走流水线时同样成立**——下表按「你正在做什么」重新索引一遍：

| 你正在做 | 读 | 漏读会怎样 |
|---|---|---|
| **新增一个 Gradle 模块**（如 `weiran-area`） | **§一 全部 SL-N** | `settings.gradle.kts` 与 BOM 是全仓单点，漏改会导致新模块编译不进整个构建，或与他人同时改同一文件区域时冲突 |
| 改 `weiran-common/**`、跨模块共享的 DTO/契约 | §一 对应那条 SL-N | 与他人并行时在共享层撞车 |
| **判断能不能与他人同时推进** | **§二 WT-0~WT-3** | WT-0 的后果：L7 被别的改动染红、L9 拿不到可签字的 diff、L3 落章失去不可变性 |
| 大改动前评估影响面 | §三 CC-N + §五 PK-N | `proposal.md` 的漏项防线失效 |
| 排任务顺序 | §四 TG-N | 共享层没排在 Layer 0，并行阶段必冲突 |
| 写 design | §六 DS-N | 审阅范围缺章节 |

---

## 一、共享层清单（决定 `exec/plan.md` 的 Layer 0）

> **本仓库没有 `packages/` 那种单一 monorepo 目录树**——共享层冲突点是 Gradle 构建配置文件
> 与自动配置注册表，不是源码目录。每一条命中都意味着"两个人同时改，会撞在同一段文本上"。

### 桶文件 / 注册表（必然冲突）

### SL-1 · `settings.gradle.kts`

新增模块必须在两处追加：`include(...)` 块里加五个扁平模块名
（`weiran-<mod>-{api,domain,application,infrastructure,adapter}`），
以及下方 `listOf(...).forEach { ... project(":$name").projectDir = file(...) }` 的目录映射块。
两处都是**全仓单点**，两个并行改动同时追加行，文本上大概率相邻，极易冲突或需要人工合并。

### SL-2 · `weiran-dependencies/build.gradle.kts`

`constraints { ... }` 块列出仓内每个模块的坐标+版本。新增模块需追加五行
`api("com.weiran:weiran-<mod>-*:${project.version}")`。同一原因：全仓单点，多人同时追加会冲突。

### SL-3 · `weiran-app/build.gradle.kts`

新增模块需在 `dependencies {}` 追加对其 `adapter` 与 `infrastructure` 两层的
`implementation(project(":..."))`。这是应用侧唯一需要感知新模块存在的地方。

### SL-4 · `web/src/App.tsx`

新增前端页面需追加一条 `<Route>`。是前端路由的唯一注册点。

### SL-5 · `web/src/layouts/AdminLayout.tsx`

新增前端页面通常还需在侧边栏菜单数组里追加一项（含权限点字符串）。
**SL-4 与 SL-5 是配对的两个文件**——只加路由不加菜单项，页面能访问但导航不出来；
只加菜单不加路由，点击后白屏。

> ⚠️ 这不是"共享层"意义上的冲突点（两个人同时加两个不同页面时，Git 通常能自动合并两条
> 相邻但不同的新增行），登记在这里是因为**遗漏是静默的**：两个文件缺一个都不报错，
> 只在人工点击验证时才会发现。

### 跨模块契约（多层共同消费）

### SL-6 · `weiran-common/src/main/java/com/weiran/common/error/WeiranErrors.java`

跨模块错误码基座。**刻意冻结为小集合**——模块专属错误码应定义在各自模块的 `error` 包里，
不要往这里加：每多一个常量，就多一处所有依赖 `weiran-common` 的模块都要一起重新编译的耦合点。
这条与其余几条方向相反：**不是"该加就加"，而是"新增前先确认真的是跨模块概念"**。

### SL-7 · `weiran-common/src/main/java/com/weiran/common/page/{PageQuery,PageResult}.java`

跨模块分页契约，被 `weiran-system-*` 与前端 `web/src/lib/role.ts` 的 TS 镜像共同依赖。
改动签名需要同步检查所有消费方，且前端的 TS 接口定义**没有自动同步机制**，改了后端要手动改前端。

### 序号型资源（本仓库暂无）

暂无 Flyway/Liquibase 或带序号的 migration 文件——数据库结构变更目前依赖手写 SQL
并与 PHP 侧的 `weiran-v1` 迁移文件人工核对（宪法 CP-7），不存在"序号台账"意义上的冲突点。
详见 [`state/waitlist-workflow.md`](../../state/waitlist-workflow.md)。**若日后引入 migration 工具，
在此补一条 `SL-N` 登记序号文件与台账文件**，参照的正是这个类别过去在其他项目里的形态。

---

## 二、并行判据（决定能不能与他人同时推进）

> **本仓库没有 worktree 工具**（`.claude/skills/devops-ff-workflow/SKILL.md` Phase 0 已明确：
> 不要发明、也不要照抄上游 mono4ts 的 `scripts/wt.mjs` 流程）。所有 change 都在同一个工作区
> 主检出（main checkout）里推进。**这意味着 WT-0 的三条后果完全没有"开 worktree 就能绕开"
> 这条退路**——工作区从头到尾只有一个，隔离只能靠人的判断纪律。

### WT-0 · 工作区已有**他人**在推进的 change（**先问这一条**）

命中即 **MUST NOT 与对方同时推进**：必须等对方收尾（提交或至少让 `git status` 干净），
不能假设"文件集不相交就没事"——本仓库没有 worktree，两个 change 的证据、diff、`design.md`
落章状态全部共用同一份工作区状态。

**命中任一即触发**，理由与本 change 自身的大小、是否并行**全部无关**：

1. `git status --short` 有**本 change 之外的、他人的**未提交改动；
2. `openspec/changes/` 下存在第二个未归档 change，**且它有实际文件**
   （`find openspec/changes/<name> -type f | head -1` 非空）**且近期有文件被修改**；
3. 近期 `git log` 出现**非本 change 的提交**（说明有别的 session 正在同一仓库推进）。

**本判据不覆盖「远端」**：上面三条**全是本地信号**。它回答的是「现在这个工作区里有没有别人」，
**不回答**「主分支是不是最新的」——防线在 `devops-ff-workflow` skill 里：Phase 0 要求开工前
`git fetch` 并确认未落后，Phase 8 要求合并前 rebase 到最新 `origin/main` 并重跑 L7 三闸门。

**为什么**：WT-1~WT-3 回答的都是「这一个 change 内部能不能拆开并行」，没有一条覆盖
「工作区里是不是已经有别人」。而后者会同时打穿 L7 与 L9 两道闸门：

1. **L7 被别人染红**：`./gradlew check` 是全仓命令。对方若正在跑测试或改代码，
   它的红灯会直接让你的 L7 退出码非 0，证据变成一份「红的证据」。
2. **L9 拿不到可签字的 diff**：`git status` / `git diff` 交织两个 change 的文件，
   人类无法单独就你这个 change 签字。
3. **L3 落章失去不可变性**：对方若改了 `rules/enforced/constitution.md`（加 CP-N），
   `L2c/constitution-check` 从该文件**动态读取**清单，你已通过人类审阅的 `design.md`
   会立刻被判缺行，只能回改落章后的文件。

**已经撞上了怎么办**：不要代改对方的文件。按外因红灯在 `exec/verify.md` 里如实归因、
判定为「暂缓」而非「打回 L5」，等对方转绿后重跑闸门刷新证据。提交时用 `git add <你的路径>`
逐条指定，**不要 `git add -A`**。

### WT-1 · 纯文档 / spec / openspec 流水线自身的改动

✅ 可与他人的**代码**改动交替推进（不同时段，仍受 WT-0 约束）。`node openspec/check.mjs`
零依赖，不需要 `pnpm install` 或 Gradle 构建。⚠️ 改流水线本体（`rules/**`、`schemas/**`、
`config.yaml`、`check.mjs`、`guards/**`）命中 WT-0 第 3 条判据的动态读取风险，谨慎评估。

### WT-2 · 涉及 `weiran-common` 或流水线本体

必须排队，不能与另一个同样改 `weiran-common` 或流水线本体的 change 同时推进。
`weiran-common` 是所有模块的公共依赖，改了签名要同步检查所有消费方；流水线本体被
`check.mjs` 动态读取，对方一改，你已落章的 design 立刻被判缺行（同 WT-0 第 3 条）。

### WT-3 · 单模块、几个文件的小改动

✅ 可与他人交替推进（仍受 WT-0 约束——本仓库没有 worktree，"交替"指时间上不重叠，
不是空间上文件不重叠就能同时改）。改动小不改变"同一工作区同一时刻只能有一个人在改"这条约束。

---

## 三、横切关注点（决定 `proposal.md` 的漏项防线）

> 这几项在本仓库最容易漏，漏了 L8 也发现不了（因为 spec 里根本没写）。
> **与 mono4ts 不同：本系统目前只有 RBAC/JWT 登录一个业务域**（`weiran-system`），
> 多租户、数据范围、工作流绑定等概念**尚未引入**，下面按"存在/不存在"如实标注，
> 不要因为条目存在就假设对应机制已经落地。

### CC-1 · 权限点（`pam_permission`）

已实现。新增受保护的接口/页面需要在 `pam_permission` 表登记新权限点，并在前端
`AdminLayout.tsx` 的菜单项上标注对应的 `hasPermission(...)` 字符串。

### CC-2 · 菜单（前端概念，无后端表）

**本仓库没有后端菜单表**（不存在 `sys_menu` 一类的持久化菜单）。菜单是纯前端硬编码数组
（`web/src/layouts/AdminLayout.tsx`），每项用权限点字符串做展示条件。新增页面若要出现在
导航里，改的是这个数组，不是数据库。`docs/10-模块映射.md` 记录了一个未落地的提案
（`PermissionContributor` Bean 汇总入库）——写 design 时若涉及菜单，按"当前是前端硬编码"
的现实来写，不要假设提案已实现。

### CC-3 · 数据范围（`data-scope`）

**尚未引入**。本系统暂无按部门/角色过滤数据可见范围的机制。

### CC-4 · 多租户隔离（`tenant`）

**不适用**。本系统不是多租户系统。

### CC-5 · 审计日志（`audit-context`）

**已知缺失**，见 [`state/waitlist.md`](../../state/waitlist.md) T-003：
`pam_account` 只更新 `login_times`/`logined_at` 两个字段，没有逐次登录的审计记录表，
查不到"谁在什么时候从哪个 IP 登录过"。`LoginLogView` 目前是从账号自身字段合成的假单条记录，
不是真实的按次审计。涉及登录/权限变更相关的 design 时需要显式提及这个已知缺口。

### CC-6 · 字段脱敏（`masking`）

**尚未引入**。

### CC-7 · 幂等（`idempotency`）

**尚未引入**。写接口目前没有统一的幂等键机制。

### CC-8 · 导出 / 任务中心

**尚未引入**。

### CC-9 · 工作流绑定（`workflow-biz-binding`）

**不适用**。本系统目前不含审批流程引擎，`weiran-system` 是唯一已建的业务域（账号/RBAC/JWT）。

---

## 四、实现任务分组（决定 `tasks.md` 的分组顺序）

> 排在最前的组对应 Layer 0（串行先做）。顺序错了，派生执行计划时容易切错层。

### TG-1 · 共享契约层 `weiran-common`

对应 `exec/plan.md` 的 Layer 0，**串行先做**，完成后冻结签名。
涉及面：跨模块错误码 / 分页契约。改动影响所有依赖 `weiran-common` 的模块，需重新编译整个仓库。
**不涉及就整组删掉。**

### TG-2 · 领域层 `*-domain` / `*-api`

对应本次涉及模块的领域模型、端口定义、对外契约类型。**不依赖 Spring，不依赖任何框架**——
这一层的单测必须能在不启动 Spring 的情况下跑。**不涉及就整组删掉。**

### TG-3 · 应用与基础设施层 `*-application` / `*-infrastructure`

涉及面：用例编排 / 事务边界（application）；MyBatis-Plus / JWT / 密码算法等框架实现
（infrastructure）。端口的实现只允许出现在这一层。**不涉及就整组删掉。**

### TG-4 · 适配层 `*-adapter`

涉及面：Controller / 认证过滤器。每个模块用 `@AutoConfiguration` 自我登记，
不在 `weiran-app` 写 `@ComponentScan`。**不涉及就整组删掉。**

### TG-5 · 前端 `web`

涉及面：页面 / 路由（`App.tsx`）、菜单项（`AdminLayout.tsx`）、数据请求 hook、复用组件、
权限控制、空态与错误态。每条都要带需求 ID。**不涉及就整组删掉。**

---

## 五、影响的包（决定 `proposal.md` 的影响面声明）

### PK-1 · `weiran-common`

跨模块通用：错误码基座、分页契约。改动影响面最广，任何新增常量都需要谨慎评估
（见 §一 SL-6 的冻结原则）。

### PK-2 · `weiran-system-*`（api/domain/application/infrastructure/adapter）

账号 / RBAC / JWT 登录，DDD 五层。当前唯一已落地的业务域模块。

### PK-3 · `weiran-app`

可执行应用，只做依赖聚合，没有业务代码。新增模块时在此追加依赖行（见 §一 SL-3）。

### PK-4 · `web`

前端：Vite + React 19 + TanStack Query。单 SPA 入口，路由与菜单登记见 §一 SL-4/SL-5。

---

## 六、Design 必填章节（决定 `design.md` 的审阅范围）

> `design.md` 是 L3 人闸唯一的审阅对象，也是 L4 契约冻结的来源。章节缺一块，
> 那块就不会被审，也不会进契约表。两节任何项目都要保留：跨模块契约变更、Rollout/Rollback。

### DS-1 · 跨模块契约变更

`weiran-common` 的错误码/分页契约、或任何模块间共享的接口签名变更，会成为
`exec/plan.md` 的 Layer 0 与契约冻结项。

### DS-2 · API Design

路由 / 方法 / 所属模块 / 请求关键字段 / 返回关键字段 / 权限点。统一响应包络由 wuli3 底座的
`ApiResponseBodyAdvice` 产生（`{code, message, timestamp, requestId, data}`，**code 是字符串
`"0"`**），不在本仓库自行定义，design 里不需要重新设计包络本身，只需声明业务字段。

### DS-3 · Database Design

表 / 动作 / 关键字段 / 索引。**本仓库没有 migration 工具**（见 §一「序号型资源」），
需要在 design 里写清楚：改动是否需要手写 DDL、是否需要去 `weiran-v1` 核对迁移文件
（涉及 `pam_*` 表时是宪法 CP-7 的硬要求）。

### DS-4 · 权限与已知缺口

权限点设计、菜单挂载（前端硬编码，见 CC-2）、是否涉及 CC-5 提到的审计日志已知缺口。

### DS-5 · 分层与装配

依赖方向是否符合 `adapter → application → domain`、`infrastructure → domain`；
新模块的 `@AutoConfiguration` 与 `.imports` 登记方式（参照 `weiran-system-adapter`/
`weiran-system-infrastructure` 已有的两个文件）。

### DS-6 · 前端设计

页面/路由（`App.tsx`）、菜单项（`AdminLayout.tsx`）、数据请求方式、复用组件、权限控制点。

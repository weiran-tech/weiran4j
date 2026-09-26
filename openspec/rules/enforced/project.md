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

新增业务模块只需在 `businessModules` 列表里追加模块名（五层 include 与目录映射由循环生成）；
新增非业务模块（如 `weiran-xxx-starter`）在 `include(...)` 块里追加。**全仓单点**，并行追加极易冲突。

### SL-2 · `weiran-dependencies/build.gradle.kts`

`constraints { ... }` 块钉住 Spring Boot / MyBatis-Plus BOM 之外的第三方版本，并列出仓内模块坐标。
新增模块或新依赖需追加行。全仓单点，多人同时追加会冲突。

### SL-3 · `weiran-app/build.gradle.kts`

新增模块需在 `dependencies {}` 追加对其 `adapter` 与 `infrastructure` 两层的
`implementation(project(":..."))`。这是应用侧唯一需要感知新模块存在的地方。

### SL-4 · Flyway 种子菜单（`weiran-*-infrastructure/.../db/migration/**`）

**前端路由由后端 `sys_menu` 驱动**（`/api/auth/menus`），`web/src/App.tsx` 不再逐页登记 `<Route>`。
新增页面必须**追加一个 Flyway 迁移**往 `sys_menu` 插入菜单行（`component` = 相对 `web/src/pages` 的路径，无 `.tsx`），
并按需插入按钮权限行与 `sys_role_menu` 绑定。菜单 id 是全局序号：并行的两个 change 各插一个 id，会撞主键。

### SL-5 · `web/src/pages/**` 与 `web/src/utils/page-registry.ts`

页面文件路径必须与 SL-4 菜单行的 `component` 字段**逐字一致**。
**SL-4 与 SL-5 是配对的两处**——只有页面没有菜单行，导航不出来也没有路由；
只有菜单行没有页面，点开是「页面不存在」占位。

> ⚠️ 遗漏是**静默的**：两处缺一个都不报错，只在人工点击验证时才会发现。
> `web/src/utils/__tests__` 里有「种子菜单的 component 全部能解析」的测试，新增菜单时同步补上。

### 跨模块契约（多层共同消费）

### SL-6 · `weiran-common/src/main/java/com/weiran/common/error/CommonErrors.java`

跨模块错误码基座（五位数字，前三位 = HTTP 状态）。**刻意冻结为小集合**——模块专属错误码应定义在各自模块
domain 的 `error` 包里。前端 `web/src/utils/request.ts` 依赖 `40100`（清令牌跳登录）与 `40101`（不清令牌）的区分，
改这两个码必须同步前端。**不是"该加就加"，而是"新增前先确认真的是跨模块概念"**。

### SL-7 · `weiran-common/src/main/java/com/weiran/common/{page,response}/*`

跨模块分页与响应包络契约（`{code, message, data}`、`{list, total, page, pageSize}`），
被全部后端模块与前端 `web/src/types/api.ts` 共同依赖。TS 定义**没有自动同步机制**，改了后端要手动改前端，
并同步 `docs/01-架构与接口契约.md`。

### 序号型资源

**Flyway 迁移版本号**（`V<yyyyMMddHHmm>__<module>_<desc>.sql`，全仓全局唯一）与 **`sys_menu` 的 id** 是本仓库的序号型资源。
两个 change 取到同一版本号或同一菜单 id 时，合并后 Flyway 启动失败或主键冲突。
已合入的迁移不可修改（宪法 CP-7）。

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
> 下面按"存在/不存在"如实标注，不要因为条目存在就假设对应机制已经落地。

### CC-1 · 权限点（`sys_menu.permission`）

已实现。权限码形如 `system:user:create`，登记为 `sys_menu` 的 button 行（Flyway 迁移，见 SL-4）；
后端接口用 `@RequiresPermission`，前端用 `<Permission code>` / `usePermission()`。超管角色 `super_admin` 放行一切。

### CC-2 · 菜单（后端 `sys_menu` 驱动）

已实现。菜单树由 `/api/auth/menus` 下发并驱动前端动态路由；管理页 `/system/menus`。
新增页面按 §一 SL-4/SL-5 同时登记菜单行与页面文件。

### CC-3 · 数据范围（`data-scope`）

**尚未引入**。本系统暂无按部门/角色过滤数据可见范围的机制（部门字段已存在于 `sys_user`）。

### CC-4 · 多租户隔离（`tenant`）

**不适用**。本系统不是多租户系统。

### CC-5 · 审计日志（`audit-context`）

已实现两类：登录日志（`sys_login_log`，登录/登出成功与失败都记）与操作日志（写接口标 `@OperationLog`，
由 `weiran-platform` 异步落库 `sys_operation_log`，请求体按字段名脱敏）。新增写接口**必须**标 `@OperationLog`。
尚无「变更前后数据 diff」。

### CC-6 · 字段脱敏（`masking`）

**仅日志层**：`SensitiveDataMasker` 对操作日志请求体中的 password/token 等字段打码。响应数据脱敏尚未引入。

### CC-7 · 幂等（`idempotency`）

**尚未引入**。写接口目前没有统一的幂等键机制。

### CC-8 · 导出 / 任务中心

**尚未引入**。

### CC-9 · 工作流绑定（`workflow-biz-binding`）

**不适用**。本系统目前不含审批流程引擎。

---

## 四、实现任务分组（决定 `tasks.md` 的分组顺序）

> 排在最前的组对应 Layer 0（串行先做）。顺序错了，派生执行计划时容易切错层。

### TG-1 · 共享契约层 `weiran-common`

对应 `exec/plan.md` 的 Layer 0，**串行先做**，完成后冻结签名。
涉及面：跨模块错误码 / 分页 / 响应契约，以及 `weiran-framework`（认证、权限、操作日志、统一响应）。
改动影响所有业务模块，需重新编译整个仓库。
**不涉及就整组删掉。**

### TG-2 · 领域层 `*-domain` / `*-api`

对应本次涉及模块的领域模型、端口定义、对外契约类型。**不依赖 Spring，不依赖任何框架**——
这一层的单测必须能在不启动 Spring 的情况下跑。**不涉及就整组删掉。**

### TG-3 · 应用与基础设施层 `*-application` / `*-infrastructure`

涉及面：用例编排 / 事务边界（application）；MyBatis-Plus / JWT / BCrypt 等框架实现与 Flyway 迁移
（infrastructure）。端口的实现只允许出现在这一层。**不涉及就整组删掉。**

### TG-4 · 适配层 `*-adapter`

涉及面：Controller / 请求 DTO 校验 / `@RequiresPermission` / `@OperationLog`。每个模块用 `@AutoConfiguration` 自我登记，
不在 `weiran-app` 写 `@ComponentScan`。**不涉及就整组删掉。**

### TG-5 · 前端 `web`

涉及面：页面（`src/pages/**`，路由由菜单驱动）、数据请求 hook（`src/hooks/queries/*`）、类型（`src/types/api.ts`）、复用组件、
权限控制、空态与错误态。每条都要带需求 ID。**不涉及就整组删掉。**

---

## 五、影响的包（决定 `proposal.md` 的影响面声明）

### PK-1 · `weiran-common` / `weiran-framework`

跨模块通用：错误码、分页与响应契约（common）；统一响应、全局异常、认证拦截、权限注解、操作日志切面、
MyBatis-Plus 配置（framework）。改动影响面最广（见 §一 SL-6/SL-7）。

### PK-2 · `weiran-system-*` / `weiran-platform-*`（api/domain/application/infrastructure/adapter）

`weiran-system`：认证 / 用户 / 角色 / 菜单 / 部门 / 登录日志。`weiran-platform`：字典 / 系统配置 / 操作日志。均为 DDD 五层。

### PK-3 · `weiran-app`

可执行应用，只做依赖聚合与集成测试（Testcontainers MySQL），没有业务代码。新增模块时在此追加依赖行（见 §一 SL-3）。

### PK-4 · `web`（仓库根下的 `web/`）

前端：Vite + React 19 + Semi UI + TanStack Query。路由由菜单驱动，页面登记见 §一 SL-4/SL-5。

---

## 六、Design 必填章节（决定 `design.md` 的审阅范围）

> `design.md` 是 L3 人闸唯一的审阅对象，也是 L4 契约冻结的来源。章节缺一块，
> 那块就不会被审，也不会进契约表。两节任何项目都要保留：跨模块契约变更、Rollout/Rollback。

### DS-1 · 跨模块契约变更

`weiran-common` 的错误码/分页契约、或任何模块间共享的接口签名变更，会成为
`exec/plan.md` 的 Layer 0 与契约冻结项。

### DS-2 · API Design

路由 / 方法 / 所属模块 / 请求关键字段 / 返回关键字段 / 权限点 / 是否 `@OperationLog`。统一响应包络
`{code, message, data}`（**code 是数字，0 为成功**）由 `weiran-framework` 的 `ApiResponseBodyAdvice` 产生，
design 里只声明业务字段；新接口同步写进 `docs/01-架构与接口契约.md`。

### DS-3 · Database Design

表 / 动作 / 关键字段 / 索引，以及**新 Flyway 脚本的文件名（版本号）与所在模块**（宪法 CP-7：只追加、不修改）。
涉及菜单/权限点的，写清新增 `sys_menu` 行的 id。

### DS-4 · 权限与已知缺口

权限码设计、菜单挂载（`sys_menu` 迁移行，见 CC-1/CC-2）、是否需要 `@OperationLog`（CC-5）。

### DS-5 · 分层与装配

依赖方向是否符合 `adapter → application → domain`、`infrastructure → domain`；
新模块的 `@AutoConfiguration` 与 `.imports` 登记方式（参照 `weiran-system-adapter`/
`weiran-system-infrastructure`），Mapper 的 `@MapperScan` 写在本模块 infrastructure 的自动配置里。

### DS-6 · 前端设计

页面文件与对应菜单行（SL-4/SL-5）、数据请求 hook、复用组件、按钮权限控制点。

# weiran4j

**Java 21 + MySQL 8 + Semi UI 的后台管理框架**，能力形态对标
[mono4ts](/Users/duoli/Projects/hanrui-jinnuo/mono4ts)（Hono + Drizzle + Semi）的「标准后台底座」：
登录/JWT、用户、角色、菜单（动态路由 + 按钮权限）、部门、字典、系统配置、登录日志、操作日志。
2026-09-26 起原地重写（决策 D-008）：**不再兼容 PHP weiran-v1，不再依赖 wuli3 底座**。

## 对话语言

- 使用中文（简体）返回会话内容

## 先读这四条

1. **前后端契约只有一份：[`weiran4j/docs/01-架构与接口契约.md`](weiran4j/docs/01-架构与接口契约.md)。**
   改接口、字段、错误码、表结构、种子菜单时先改它，再改代码；前端 `web/src/types/api.ts` 手动同步。
2. **构建必须用 JDK 21。** 本机默认 JDK 可能更高，Gradle daemon 跑在高版本上
   palantir-java-format 会直接崩，报错看起来像代码问题但不是。
   所有 Gradle 命令前置 `JAVA_HOME=$(/usr/libexec/java_home -v 21)`，或用 `mise` 自动切换。
3. **改代码后先 `./gradlew spotlessApply` 再 `check`。** 格式由 palantir-java-format 强制，
   手写的换行几乎一定会被判违规——那不是代码问题，别去猜。
4. **统一响应的 `code` 是数字 `0`**（`{code, message, data}`，失败为五位错误码，前三位即 HTTP 状态）。
   旧版 weiran4j 是字符串 `"0"`，从旧代码或别处搬前端代码时判断会静默出错。

## 常用命令

```bash
# ── 后端（在 weiran4j/ 下）──
cd weiran4j && export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./gradlew spotlessApply           # 格式化（改完代码先跑这个）
./gradlew check --no-daemon       # 全量门禁：编译 + 测试 + Checkstyle + SpotBugs + Forbidden APIs
                                  #   + Error Prone/NullAway + 覆盖率；集成测试用 Testcontainers，需要 Docker
./gradlew :weiran-system-domain:check   # 只验一个模块，迭代时用
./gradlew :weiran-app:bootRun     # 起服务（需要 MySQL 与 weiran4j/config/application-local.yml）

# ── 前端与 openspec（在仓库根）──
pnpm install
pnpm dev                          # 前端开发服务器（VITE_PORT 默认 5373，/api 代理到 3300）
pnpm test / pnpm lint / pnpm build
pnpm openspec:check               # = node openspec/check.mjs，结构检查，零依赖
node openspec/check.mjs --explain # 看全部检查项
pnpm hooks:install                # 新 clone 后跑一次，启用 .githooks/pre-commit
```

> ⚠️ **不要打开 Gradle 配置缓存**，也**不要同时跑两个 `clean check`**。
> 前者让 palantir 随机报 `InvocationTargetException`；后者互相删 build 目录，集成测试全挂。
> 复用的 daemon 报 `NoClassDefFoundError ... ImportOrderer` 时 `./gradlew --stop` 或加 `--no-daemon`。
> 症状与实测见 [`openspec/rules/advisory/toolchain.md`](openspec/rules/advisory/toolchain.md)。

## 仓库结构

```
duoli-weiran4j/                  # git 仓库根 = pnpm 工作区根 = openspec 根
├── CLAUDE.md / AGENTS.md        # 本文件（两份内容一致，AGENTS.md 给其它 agent 工具读）
├── .claude/                     # Claude Code 配置与 skill（见下「AI 工作流文件放在哪」）
├── .githooks/pre-commit         # 提交前跑 openspec check
├── openspec/                    # 规格治理流水线（L0–L10 闸门）
├── web/                         # 前端：Vite + React 19 + Semi UI + TanStack Query，路由由菜单驱动
└── weiran4j/                    # 后端：Gradle 多模块
    ├── build-logic/             # 约定插件。质量规则的唯一来源，不要在模块里重复配置
    ├── weiran-dependencies/     # BOM（import Spring Boot + MyBatis-Plus BOM）。所有版本号只在这里出现
    ├── weiran-common/           # 纯 Java：错误码、分页、响应包络、树工具
    ├── weiran-framework/        # Spring 基础设施：统一响应、全局异常、认证拦截、@RequiresPermission、
    │                            #   @OperationLog、MyBatis-Plus 配置与审计字段填充
    ├── weiran-system/           # 身份与权限（DDD 五层）：认证 / 用户 / 角色 / 菜单 / 部门 / 登录日志
    ├── weiran-platform/         # 平台能力（DDD 五层）：字典 / 系统配置 / 操作日志
    ├── weiran-app/              # 可执行应用：依赖聚合 + application.yml + 集成测试
    └── docs/                    # 决策记录、架构与接口契约
```

业务模块的五层：`weiran-<mod>-{api,domain,application,infrastructure,adapter}`。模块路径是**扁平**的
（`:weiran-system-api`），目录是**嵌套**的（`weiran-system/weiran-system-api`）——新增业务模块只需在
`weiran4j/settings.gradle.kts` 的 `businessModules` 列表里追加模块名。

### 新增一个页面 / 功能的完整路径

1. 契约：在 `weiran4j/docs/01-架构与接口契约.md` 登记接口、表、权限码。
2. 表结构与菜单：在模块 infrastructure 追加 Flyway 脚本
   `db/migration/<module>/V<yyyyMMddHHmm>__<module>_<desc>.sql`（**已合入的脚本永不修改**，宪法 CP-7），
   往 `sys_menu` 插菜单行与按钮权限行（`component` = 相对 `web/src/pages` 的路径）。
3. 后端：domain → application → infrastructure → adapter；写接口标 `@RequiresPermission` 与 `@OperationLog`。
4. 前端：`web/src/pages/<component>.tsx` + `hooks/queries/*` + `types/api.ts`；按钮用 `<Permission code>`。
   **不需要改 `App.tsx`**——路由由 `/api/auth/menus` 驱动；菜单行与页面文件缺一个都不报错（见 project.md SL-4/SL-5）。
   写页面前先查 [`components.md`](openspec/rules/advisory/components.md)。
5. 现状文档：新表在 `openspec/state/bizs/` 加一份 `<table>.md`（八段结构，见 [`bizs/README.md`](openspec/state/bizs/README.md)）。

## AI 工作流文件放在哪

三套文件各管一段：

| 位置 | 管什么 |
| --- | --- |
| `.claude/` | Claude Code 自己的配置与 skill。`settings.json` 的 `PostToolUse` hook 在每次写/改文件后跑 `openspec/check.mjs --hook`（门禁 ①） |
| `openspec/` | 本仓库的规格治理流水线：`rules/`（现在必须）· `design/`（过去为什么）· `state/`（现状 + 欠账）· `schemas/` · `specs/` · `changes/` · `guards/` · `check.mjs` · `config.yaml` · `project.json` |
| `.githooks/` | 把流水线接到本地提交（门禁 ②）；`pnpm hooks:install` 启用 |

### 门禁：设计上三道，现在只有两道

| # | 门禁 | 强度 | 现状 |
| --- | --- | --- | --- |
| ① | Claude Code hook：写/改后跑 `check.mjs --hook`，只查改动涉及的插件，20s 超时 | 即时 · 不阻断 | ✅ 在跑 |
| ② | `.githooks/pre-commit`：改动命中 `openspec/`、`weiran4j/`、`web/` 才跑全量 `check.mjs` | 阻断（`--no-verify` 可应急绕过） | ✅ 需先 `pnpm hooks:install` |
| ③ | CI 全量 build / test / lint | 兜底 | ❌ **没有**：仓库没有 `.github/workflows/`，后端 `check` 与前端测试只在本地跑。见 [`artifact.md#05`](openspec/state/bizs/artifact.md) |

### 用哪个 skill 开 / 推进 / 归档 change

`.claude/skills/` 下 13 个 openspec 相关 skill，**只有 `devops-ff-workflow` 认识本仓库的 schema**
（`config.yaml`/`schemas/`/`guards/`，并读 `openspec/rules/`），其余 12 个（`openspec-*`）是 `openspec` CLI
生成的通用件，不读本文件与 `rules/`。用错的后果是**静默的**：不报错，只是绕过闸门把流程走完。

| 想做什么 | 用 | **不要**用，以及为什么 |
| --- | --- | --- |
| 开新 change / 推进（支持 resume）/ 走完 L0–L10 | `devops-ff-workflow` | `openspec-continue-change` —— 不知道 L3 的 `approved_by`，design 一 done 就直接生成 tasks，**静默绕过人闸** |
| 归档 | `devops-ff-workflow`，或直接 `openspec archive "<name>"` | `openspec-archive-change` / `-bulk-archive-change` / `-sync-specs` —— 用 `mv` + 手工合并代替 CLI 归档，上游实测丢过整条需求 |
| 验收 | `devops-ff-workflow` 的 L8 | `openspec-verify-change` —— 报告没有 `通过/打回` 结论行，`L8/verdict-line` 会拦 |
| 只想跑一次机械校验 | `pnpm openspec:check` | — |

> **不要直接改那 12 个通用 skill 来加警告** —— `openspec update` 会整体覆盖它们。
> 本仓库的定制只能放在 `devops-ff-workflow` 与本文件里。

## 规则索引（`openspec/rules/`，总览见 [rules/README.md](openspec/rules/README.md)）

> **本节列的是「什么时候必须去读」，不是内容摘要。** 正文全在 `openspec/rules/` 下——
> 那些文件**不会**被自动注入上下文，靠下面的触发条件唤起。触发条件命中却没读，
> 后果都是**静默的**：不报错、不失败，只在事后对不上的数据或读 spec 的人身上生效。

| 文件 | 什么时候**必须**读 | 有无机械校验 |
| --- | --- | --- |
| [`rules/enforced/constitution.md`](openspec/rules/enforced/constitution.md) | 写 `design.md` 的「宪法对照」表时；**改表结构或种子数据前（CP-7：只能追加 Flyway 脚本，已合入的永不修改）**；碰密码/令牌路径时（CP-8：只用 BCrypt，吊销只走 `token_version`）；给模块加依赖或版本号时（CP-4）；要放宽任何质量规则时（CP-5/CP-6） | ✅ `L2c/constitution-check` + `TEMPLATE/constitution-rows` |
| [`rules/enforced/project.md`](openspec/rules/enforced/project.md) | 新增 Gradle 模块前、**新增页面/菜单前（§一 SL-4/SL-5：菜单行与页面文件配对）**、取 Flyway 版本号或菜单 id 前（序号型资源）；判断能不能与他人同时推进时（§二 WT-N，本仓库没有 worktree）；写 `proposal.md`/`tasks.md`/`design.md` 前（§三～六 CC/PK/TG/DS-N） | ✅ `TEMPLATE/profile-rows` |
| [`rules/advisory/components.md`](openspec/rules/advisory/components.md) | **写 `web/` 的页面或组件前 —— 先查再造**；**给侧边菜单加图标时**（目录节点必须用 `renderNavIcon()`）；删除组件或改其对外协议后回来改这里 | 🟡 只查「新增未登记」（`REPO/components-unregistered`），不查描述对不对 |
| [`rules/advisory/pitfalls.md`](openspec/rules/advisory/pitfalls.md) | 走 OpenSpec 流水线的**每一层**开工前，读对应那一节（L0–L10 分节）；**尤其**产出 L7 证据前（`git stash` 会让刚写好的证据全部失效）、判定「本次不修」时（只写在 `verify.md` 里等于把它埋了） | ❌ 无 —— 全靠这张表唤起 |
| [`rules/advisory/toolchain.md`](openspec/rules/advisory/toolchain.md) | **构建报 `palantir-java-format(...)` 相关错误时**（`InvocationTargetException` / `NoClassDefFoundError`，那不是代码问题）；**集成测试成片失败、日志里有 `NoSuchFileException ... build/` 时**（有人同时在跑 `clean`）；**从旧版或别处搬前端代码时**（`code` 现为数字 `0`） | ❌ 无 —— 全靠这张表唤起 |

**分工**：`enforced/constitution.md` 管**代码不变量**（CP-N），`enforced/project.md` 管
**项目结构事实**（SL/WT/CC/PK/TG/DS-N），`advisory/components.md` 管**可复用的前端公共组件**，
`advisory/pitfalls.md` 管**流水线各层踩过的坑**，`advisory/toolchain.md` 管
**其余几份都装不下的工具行为与代码库欠账**。

**两个子目录的差别不是主题，是可靠性**：`enforced/` 漏改会被 `pnpm openspec:check` 拦住；
`advisory/` 基本没有守卫，漏读是**静默**的——所以后者的条目必须写清**症状**，否则唤不起来。
**新规则该写到哪**，按 [rules/README.md](openspec/rules/README.md) 的决策流程判断。

> ⚠️ `rules/enforced/constitution.md` 与 `rules/enforced/project.md` 的路径被 `openspec/check.mjs`
> 硬编码引用（`L2c/constitution-check` 与 `TEMPLATE/profile-rows`）。**移动它们必须同步改代码**，
> 改完跑 `pnpm openspec:check` 确认。

## openspec/ 的三个目录（三种时态）

| 目录 | 时态 | 回答 | 什么时候用 |
| --- | --- | --- | --- |
| [`openspec/rules/`](openspec/rules/) | **现在必须** | 我该遵守什么 | **读**：见上方索引表的触发条件；**写**：新规则按 [rules/README.md](openspec/rules/README.md) 的决策流程判断落点 |
| [`openspec/design/`](openspec/design/) | **过去为什么** | 这套流水线为什么长这样 | **读**：想改流水线本身、或对某条规则的动机存疑时；**动 `check.mjs` / `project.json` / `guards/` 前先读 [`design/check.md`](openspec/design/check.md)**；**写**：改了流水线（schema / 模板 / 校验 / 目录结构 / skill）后在 [`CHANGELOG.md`](openspec/design/CHANGELOG.md) 最上面加一条；改了校验机制**同步改 `check.md`**；流水线**自身的欠账**写 [`design/README.md`](openspec/design/README.md) 的「附：流水线自身的待办池」 |
| [`openspec/state/`](openspec/state/) | **现状 + 将来** | 现在实际什么样，还欠着什么 | **读**：接手某个模块前读 `state/bizs/<table>.md`；动手处理某条已知问题前；**写**：见下（五个时机） |

### `state/` 的读写时机（容易漏，专门列出来）

> `state/bizs/` 每张表一份 `<table>.md`，八段结构（概要 / 列表 / 字段与表单 / 动作 / 组件 / 说明与建议 /
> **已知问题汇总** / **changelog**）；跨模块业务口径收在 [`bizs/cross-biz.md`](openspec/state/bizs/cross-biz.md)，
> 架构 / 技术问题收在 [`bizs/artifact.md`](openspec/state/bizs/artifact.md)。条目用**文件内编号**
> `- **#NN {状态} {优先级} 标题**`，跨文件引用写 `文件名.md#NN`（规则见 [`bizs/README.md`](openspec/state/bizs/README.md)）。
> 除编号检查（`openspec/guards/state-waitlist.mjs`：文件内重号、悬空引用、已废止的 `T-NN`/`B-NN`）外，
> 下面每一条漏做都是**静默的**：不报错、不变红，只让下一个读它的人拿到假信息。

**① 接手某条已知问题 → 先认领，再动手**

决定处理 `bizs/<table>.md` §6「已知问题汇总」里的某条时，**先在该条目末尾追加 `→ <change 名>`**，
再开始写代码。不认领的后果是别人并行开了同一条——单文件没有并发保护，两个 change 改同一片代码，要到合并时才发现。

**② 发现了问题但这次不修 → 写进对应模块文件的「已知问题汇总」**

判为「越界扩大、本次不修」的问题，**必须写进对应表的 `state/bizs/<table>.md` §6**（编号取该文件当前最大号 + 1），
写不进单一模块的按性质写进 `cross-biz.md`（业务口径）或 `artifact.md`（架构 / 技术）。
不要只写在 `exec/verify.md` 的「遗留问题」里——那会随 change 归档一起沉底，再也没人翻得到。
写的时候必须带**症状**（谁会因此拿到错的东西）。

**③ 条目被解决了 → 从「已知问题汇总」移到「changelog」**

整条（编号不变、状态改 ✅）从 §6 移到同一文件的 §7 changelog，按日期分组、**日期倒序（新条目插在 §7 最上方）**，
写清是哪个 change 关的；只解决一部分的留在 §6，状态写「部分解决」。
留着已解决的条目，清单就开始撒谎——**一份看起来周全、里面却有一条是假的清单，比没有清单更有害**。

**④ 改了某个模块的字段 / 动作 → 同步对应的 `state/bizs/<table>.md`**

§0~§5 是该模块的现状说明，流水线不依赖它、过期不会被拦——只能靠改代码的人顺手更新。
发现文档与代码不符，**以代码为准**，并回来改文档。

**⑤ 新增一张表 → 新建 `state/bizs/<table>.md`，并登记进 `bizs/README.md` 的文件索引**

## 分层规矩

依赖只能从外向内：`adapter → application → domain`，`infrastructure → domain`。

- **domain 不依赖任何框架**。领域规则的单测必须能在不启动 Spring 的情况下跑。
- **持久化类型不跨层**：`*DO`、`BaseMapper`、`IPage`、`Wrappers` 只允许出现在 `*-infrastructure` 里。
- **端口定义在 domain，实现在 infrastructure**。端口签名里出现框架类型，这层反转就白做了。
- **模块自己负责装配**：每个模块用 `@AutoConfiguration` + `META-INF/spring/...imports` 自我登记，
  应用侧不写 `@ComponentScan` / `@MapperScan`。新增模块时 `weiran-app` 只加一行依赖。
- **`weiran-framework` 是外层**：`*-domain` 与 `*-api` 只能依赖 `weiran-common`。

完整不变量见 [`openspec/rules/enforced/constitution.md`](openspec/rules/enforced/constitution.md)（CP-1 … CP-11），
每个 change 的 design 都要逐条对照。

## 写 Java 代码时

这些不是风格偏好，是门禁会拦的硬约束：

- **禁 `java.util.Date` / `Calendar` / `java.sql.Date|Time|Timestamp`**，一律 `java.time`。
  无法回避的第三方边界用 `@SuppressForbidden` 就地豁免并写明理由，不要关规则。
- **禁中文标识符**（ErrorProne `UnicodeInCode`）。测试方法名用英文 + `@DisplayName("中文")`。
- **空安全用 JSpecify**：包上标 `@NullMarked`，可空处标 `@Nullable`。
  框架反射填充的类（如 MyBatis 的 `*DO`）整类标 `@NullUnmarked`，并把空值处理集中在映射边界。
- **字段、参数、局部变量能 final 就 final**；实例成员访问显式写 `this.`，静态成员用类名限定。
- **行宽 140**，禁 `import *`，禁未使用的 import。

## 前端测试

vitest + jsdom + @testing-library/react。**断言 Semi `Form.*` 受控控件时必须包一层 `<Form>`**，
否则这些控件不渲染任何 DOM，失败信息只有 `expected null not to be null`，完全不提 Form context。
视觉问题（如侧边菜单图标尺寸）单测看不出来，改布局后要在真浏览器里看一眼。

## 认证与权限要点

- 认证不用 Spring Security 过滤器链：`weiran-framework` 的 `AuthInterceptor` 拦 `/api/**`，
  `@PublicApi` 放行，`@RequiresPermission` 校验权限码，`CurrentUser` 取当前用户。
- 权限码登记在 `sys_menu` 的 button 行（如 `system:user:create`）；角色 `super_admin` 放行一切，`/me` 返回 `["*"]`。
- 令牌吊销只靠 `sys_user.token_version`（JWT 的 `ver` claim）：改密码 / 重置密码 / 禁用账号时递增（宪法 CP-8）。
- 登录失败不区分「用户不存在」与「密码错误」，统一 `40101`（宪法 CP-10）。前端对 `40100` 清令牌跳登录，对 `40101` 不清。
- 种子账号 `admin` / `admin123`（Flyway 种子），**上线前必须改密**。

## 密钥与本地配置

任何密钥都不进版本库、不进日志（宪法 CP-9）。

- **本地开发**：`weiran4j/config/application-local.yml`（已 gitignore，且在源码树之外，不会被打进 jar）。
  `bootRun` 默认激活 `local` profile 并从 `weiran4j/config/` 读取——路径由 `weiran-app/build.gradle.kts`
  写死为绝对路径，因为 `bootRun` 的工作目录是 `weiran-app/`，靠 Spring Boot 默认的 `./config/`
  探测会找错地方。
- **部署**：环境变量，对应 `application.yml` 里的 `${WEIRAN_*}` 占位符，见 `weiran4j/.env.example`。
  `WEIRAN_JWT_SECRET` 至少 32 字节，缺失或过短时应用启动失败。
- 仓内只有 `.example` 模板，没有真实值。
- 本地库用独立的空库 `weiran4j`（Flyway 自动建表与种子）。**不要把本地配置指向任何已有业务库**：
  Flyway 遇到非空且无 `flyway_schema_history` 的库会拒绝启动，但指错库本身就是事故。

## 设计

- 主色 #0064FA

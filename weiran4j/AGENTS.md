# weiran4j

**Java 21 + MySQL 8 + Semi UI 的后台管理框架**，能力形态对标
[mono4ts](/Users/duoli/Projects/hanrui-jinnuo/mono4ts)（Hono + Drizzle + Semi）的「标准后台底座」：
登录/JWT、用户、角色、菜单（动态路由 + 按钮权限）、部门、字典、系统配置、登录日志、操作日志。
2026-09-26 起原地重写（决策 D-008）：**不再兼容 PHP weiran-v1，不再依赖 wuli3 底座**。

git 仓库根是上一级目录：`weiran4j/`（本目录，Java 后端 + openspec）与 `../web/`（前端）是兄弟目录，
pnpm 工作区在仓库根。

## 先读这四条

1. **前后端契约只有一份：[`docs/01-架构与接口契约.md`](docs/01-架构与接口契约.md)。**
   改接口、字段、错误码、表结构、种子菜单时先改它，再改代码；前端 `../web/src/types/api.ts` 手动同步。
2. **构建必须用 JDK 21。** 本机默认 JDK 可能更高，Gradle daemon 跑在高版本上
   palantir-java-format 会直接崩，报错看起来像代码问题但不是。
   所有 Gradle 命令前置 `JAVA_HOME=$(/usr/libexec/java_home -v 21)`，或用 `mise` 自动切换。
3. **改代码后先 `./gradlew spotlessApply` 再 `check`。** 格式由 palantir-java-format 强制，
   手写的换行几乎一定会被判违规——那不是代码问题，别去猜。
4. **统一响应的 `code` 是数字 `0`**（`{code, message, data}`，失败为五位错误码，前三位即 HTTP 状态）。
   旧版 weiran4j 是字符串 `"0"`，从旧代码或别处搬前端代码时判断会静默出错。

## 常用命令

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

./gradlew spotlessApply           # 格式化（改完代码先跑这个）
./gradlew check                   # 全量门禁：编译 + 测试 + Checkstyle + SpotBugs
                                  #   + Forbidden APIs + Error Prone/NullAway + 覆盖率
                                  #   集成测试用 Testcontainers MySQL，需要 Docker；没有 Docker 时自动跳过
./gradlew :weiran-system-domain:check   # 只验一个模块，迭代时用
./gradlew :weiran-app:bootRun     # 起服务（需要 MySQL 与 config/application-local.yml）

# 前端在仓库根执行（cd ..）
pnpm install
pnpm dev                          # 前端开发服务器（VITE_PORT 默认 5373，/api 代理到 3300）
pnpm test / pnpm lint / pnpm build

node openspec/check.mjs           # openspec 流水线校验
node openspec/check.mjs --explain # 看全部检查项
```

> ⚠️ **不要打开 Gradle 配置缓存。** 打开后 Spotless 的 palantir 步骤会随机报
> `palantir-java-format(java.lang.reflect.InvocationTargetException)`，且每次失败的文件都不一样
> ——看起来像某些文件格式有问题，实际与文件内容无关。原因与实测对照写在 `gradle.properties` 里。

## 仓库结构

```
duoli-weiran4j/                 # git 仓库根（pnpm 工作区根）
├── web/                        # 前端：Vite + React 19 + Semi UI + TanStack Query，路由由菜单驱动
└── weiran4j/                   # 本目录
    ├── build-logic/            # Gradle 约定插件。质量规则的唯一来源，不要在模块里重复配置
    ├── weiran-dependencies/    # 本仓 BOM（import Spring Boot + MyBatis-Plus BOM）。所有版本号只在这里出现
    ├── weiran-common/          # 纯 Java：错误码、分页、响应包络、树工具
    ├── weiran-framework/       # Spring 基础设施：统一响应、全局异常、认证拦截、@RequiresPermission、
    │                           #   @OperationLog、MyBatis-Plus 配置与审计字段填充
    ├── weiran-system/          # 身份与权限（DDD 五层）：认证 / 用户 / 角色 / 菜单 / 部门 / 登录日志
    ├── weiran-platform/        # 平台能力（DDD 五层）：字典 / 系统配置 / 操作日志
    ├── weiran-app/             # 可执行应用：依赖聚合 + application.yml + 集成测试
    ├── openspec/               # 需求到交付的流水线（L0–L10 闸门）
    └── docs/                   # 决策记录、架构与接口契约
```

业务模块的五层：`weiran-<mod>-{api,domain,application,infrastructure,adapter}`。模块路径是**扁平**的
（`:weiran-system-api`），目录是**嵌套**的（`weiran-system/weiran-system-api`）——新增业务模块只需在
`settings.gradle.kts` 的 `businessModules` 列表里追加模块名。

### 新增一个页面 / 功能的完整路径

1. 契约：在 `docs/01-架构与接口契约.md` 登记接口、表、权限码。
2. 表结构与菜单：在模块 infrastructure 追加 Flyway 脚本
   `db/migration/<module>/V<yyyyMMddHHmm>__<module>_<desc>.sql`（**已合入的脚本永不修改**，宪法 CP-7），
   往 `sys_menu` 插菜单行与按钮权限行（`component` = 相对 `web/src/pages` 的路径）。
3. 后端：domain → application → infrastructure → adapter；写接口标 `@RequiresPermission` 与 `@OperationLog`。
4. 前端：`web/src/pages/<component>.tsx` + `hooks/queries/*` + `types/api.ts`；按钮用 `<Permission code>`。
   **不需要改 `App.tsx`**——路由由 `/api/auth/menus` 驱动；菜单行与页面文件缺一个都不报错（见 project.md SL-4/SL-5）。

## 规则索引（`openspec/rules/`，总览见 [rules/README.md](openspec/rules/README.md)）

> **本节列的是「什么时候必须去读」，不是内容摘要。** 正文全在 `openspec/rules/` 下——
> 那些文件**不会**被自动注入上下文，靠下面的触发条件唤起。触发条件命中却没读，
> 后果都是**静默的**：不报错、不失败，只在事后对不上的数据或读 spec 的人身上生效。

| 文件 | 什么时候**必须**读 | 有无机械校验 |
| --- | --- | --- |
| [`rules/enforced/constitution.md`](openspec/rules/enforced/constitution.md) | 写 `design.md` 的「宪法对照」表时；**改表结构或种子数据前（CP-7：只能追加 Flyway 脚本，已合入的永不修改）**；碰密码/令牌路径时（CP-8：只用 BCrypt，吊销只走 `token_version`）；给模块加依赖或版本号时（CP-4）；要放宽任何质量规则时（CP-5/CP-6） | ✅ `L2c/constitution-check` + `TEMPLATE/constitution-rows` |
| [`rules/enforced/project.md`](openspec/rules/enforced/project.md) | 新增 Gradle 模块前、**新增页面/菜单前（§一 SL-4/SL-5：菜单行与页面文件配对）**、取 Flyway 版本号或菜单 id 前（序号型资源）；判断能不能与他人同时推进时（§二 WT-N，本仓库没有 worktree）；写 `proposal.md`/`tasks.md`/`design.md` 前（§三～六 CC/PK/TG/DS-N） | ✅ `TEMPLATE/profile-rows` |
| [`rules/advisory/pitfalls.md`](openspec/rules/advisory/pitfalls.md) | 走 OpenSpec 流水线的**每一层**开工前，读对应那一节（L0–L10 分节）；**尤其**产出 L7 证据前（`git stash` 会让刚写好的证据全部失效）、判定「本次不修」时（只写在 `verify.md` 里等于把它埋了） | ❌ 无 —— 全靠这张表唤起 |
| [`rules/advisory/toolchain.md`](openspec/rules/advisory/toolchain.md) | **构建报 `palantir-java-format(InvocationTargetException)` 时**（那不是代码问题）；**从旧版或别处搬前端代码时**（响应体 `code` 现为数字 `0`，旧的字符串 `"0"` 判断会恒错） | ❌ 无 —— 全靠这张表唤起 |

**分工**：`enforced/constitution.md` 管**代码不变量**（CP-N），
`enforced/project.md` 管**项目结构事实**（SL/WT/CC/PK/TG/DS-N），
`advisory/pitfalls.md` 管**流水线各层踩过的坑**，
`advisory/toolchain.md` 管**前三者都装不下的工具行为与代码库欠账**。

**两个子目录的差别不是主题，是可靠性**：`enforced/` 漏改会被 `node openspec/check.mjs` 拦住；
`advisory/` 没有任何守卫，漏读是**静默**的——所以后者的条目必须写清**症状**，否则唤不起来。
路径本身就在说明这件事，不必回头查表。
**新规则该写到哪**，按 [rules/README.md](openspec/rules/README.md) 的决策流程判断。

> ⚠️ `rules/enforced/constitution.md` 与 `rules/enforced/project.md` 的路径被 `openspec/check.mjs`
> 硬编码引用（`L2c/constitution-check` 与 `TEMPLATE/profile-rows`）。**移动它们必须同步改代码**，
> 改完跑 `node openspec/check.mjs` 确认。P-001（六个模板槽曾是 mono4ts 原文）已在
> [`state/waitlist-workflow.md`](openspec/state/waitlist-workflow.md) 标记为已解决。

## openspec/ 的三个目录（三种时态）

| 目录 | 时态 | 回答 | 什么时候用 |
| --- | --- | --- | --- |
| [`openspec/rules/`](openspec/rules/) | **现在必须** | 我该遵守什么 | **读**：见上方索引表的触发条件；**写**：新规则按 [rules/README.md](openspec/rules/README.md) 的决策流程判断落点 |
| [`openspec/design/`](openspec/design/) | **过去为什么** | 这套流水线为什么长这样 | **读**：想改流水线本身、或对某条规则的动机存疑时；**动 `check.mjs` / `project.json` / `guards/` 前先读 [`design/check.md`](openspec/design/check.md)**；**写**：改了流水线（schema / 模板 / 校验 / 目录结构）后追加 `CHANGELOG.md` |
| [`openspec/state/`](openspec/state/) | **现状 + 将来** | 现在实际什么样，还欠着什么 | **读**：接手某个模块前；动手处理 waitlist 里某条 `T-NN`/`B-NN` 前；**写**：见下（四个时机） |

完整导航见 [`openspec/design/README.md`](openspec/design/README.md)。

### `state/` 的读写时机（容易漏，专门列出来）

> **`openspec/check.mjs` 不认识这个目录**——它过期不会让任何检查变红。
> 下面每一条漏做都是**静默的**：只让下一个读它的人拿到假信息。

**① 接手 waitlist 里的条目 → 先认领，再动手**

决定处理某条 `T-NN` / `B-NN` 时，**先把那条的状态改成 `→ <change 名>`**，再开始写代码。
不认领的后果是别人并行开了同一条——waitlist 没有任何并发保护，
两个 change 改同一片代码，要到合并时才发现。

**② 发现了问题但这次不修 → 追加到 waitlist**

判为「越界扩大、本次不修」的问题，**必须写进
[`state/waitlist.md`](openspec/state/waitlist.md)**（技术用 `T-NN`，业务用 `B-NN`，同一份清单），
不要只写在 `exec/verify.md` 的「遗留问题」里——那会随 change 归档一起沉底，再也没人翻得到。

写的时候必须带**症状**（谁会因此拿到错的东西）。只写「XX 实现得不好」的条目，
过段时间没人认得出它指什么。

**③ 条目被解决了 → 回来划掉**

某个 change 关掉了 waitlist 里的条目，归档时回来把那条划掉或删掉，并注明是哪个 change 关的。
留着已解决的条目，清单就开始撒谎——**一份看起来周全、里面却有一条是假的清单，
比没有清单更有害**。

**④ 欠的是流水线自己 → 写 `waitlist-workflow.md`**

schema / 模板 / 校验 / 目录结构自身的欠账写
[`state/waitlist-workflow.md`](openspec/state/waitlist-workflow.md)，与业务侧待办分开，
维护约定相同（新增带症状、关闭要回来划掉）。

> 这四件事都没有机械校验兜底，全靠本节唤起。

### ⚠️ 用哪个 skill 开/推进/归档 change

`.claude/skills/` 下有 13 个 openspec 相关 skill，**只有 `devops-ff-workflow` 认识本仓库的 schema**
（`config.yaml`/`schemas/`/`guards/`），其余 12 个（`openspec-*`）是 `openspec` CLI 生成的通用件，
不读本仓库的 `rules/enforced/constitution.md`，也不知道本仓库闸门的额外要求。用错的后果是**静默的**：
不报错，只是绕过闸门把流程走完。

| 想做什么 | 用 | 慎用 |
| --- | --- | --- |
| 开新 change / 推进任意一步 / 归档 | `devops-ff-workflow`（支持 resume） | `openspec-continue-change` 等通用 skill —— 可能不认得本仓库闸门要求的额外字段，静默跳过 |
| 只想跑一次机械校验 | `node openspec/check.mjs` | — |

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

## 认证与权限要点

- 认证不用 Spring Security 过滤器链：`weiran-framework` 的 `AuthInterceptor` 拦 `/api/**`，
  `@PublicApi` 放行，`@RequiresPermission` 校验权限码，`CurrentUser` 取当前用户。
- 权限码登记在 `sys_menu` 的 button 行（如 `system:user:create`）；角色 `super_admin` 放行一切，`/me` 返回 `["*"]`。
- 令牌吊销只靠 `sys_user.token_version`（JWT 的 `ver` claim）：改密码 / 重置密码 / 禁用账号时递增（宪法 CP-8）。
- 登录失败不区分「用户不存在」与「密码错误」，统一 `40101`（宪法 CP-10）。前端对 `40100` 清令牌跳登录，对 `40101` 不清。
- 种子账号 `admin` / `admin123`（Flyway 种子），**上线前必须改密**。

## 密钥

任何密钥都不进版本库、不进日志（宪法 CP-9）。

- **本地开发**：`config/application-local.yml`（已 gitignore，且在源码树之外，不会被打进 jar）。
  `bootRun` 默认激活 `local` profile 并从本目录（Gradle 根）的 `config/` 读取——路径由 `weiran-app/build.gradle.kts`
  写死为绝对路径，因为 `bootRun` 的工作目录是 `weiran-app/`，靠 Spring Boot 默认的 `./config/`
  探测会找错地方。
- **部署**：环境变量，对应 `application.yml` 里的 `${WEIRAN_*}` 占位符，见 `.env.example`。
  `WEIRAN_JWT_SECRET` 至少 32 字节，缺失或过短时应用启动失败。
- 仓内只有 `.example` 模板，没有真实值。
- 本地库用独立的空库 `weiran4j`（Flyway 自动建表与种子）。**不要把本地配置指向任何已有业务库**：
  Flyway 遇到非空且无 `flyway_schema_history` 的库会拒绝启动，但指错库本身就是事故。

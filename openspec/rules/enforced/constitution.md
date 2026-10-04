# weiran4j 工程宪法

> **这是跨 change 的不变量清单，不是本次改动的检查表。**
> 每个 change 的 `design.md` 必须逐条填「## 宪法对照」表，标记三选一：
> ☑ 符合（写怎么遵守的）/ ☐ 不涉及（写为什么碰不到）/ ⚠ 偏离（写为什么必须偏离、代价、
> 是否要连带修订本文件）。**偏离是允许的，不写理由不是。**
>
> 条款编号 `CP-N` 由 `openspec/check.mjs` 的 `L2c/constitution-check` 动态读取本文件的
> `### CP-N` 标题，改标题即改清单。涉及数字的条款一律引用
> `openspec/project.json` 的 `ratchet.baseline`，不在正文复述——复述的数字一过期，宪法就开始撒谎。

## 分层与依赖

### CP-1 · 领域层不依赖框架

`weiran-*-domain` 的 `build.gradle.kts` 不得出现 Spring、MyBatis、Jakarta Servlet 或任何 Web 依赖。
领域规则的单测必须能在不启动容器的情况下跑。

**为什么**：这条边界是可测试性与可迁移性的唯一来源。一旦领域层能 `@Autowired`，
业务规则就会开始依赖注入时序，此后任何一条规则的验证都要先启动 Spring。

### CP-2 · 依赖方向单向向内

依赖只能从外向内：`adapter` → `application` → `domain`，`infrastructure` → `domain`。
`domain` 不依赖任何其他层；`infrastructure` 与 `adapter` 之间不得直接依赖。
外层需要内层能力时，由内层定义端口（`domain/port`），外层实现。
`weiran-framework`（Spring 基础设施）属于外层：`*-domain` 与 `*-api` 只能依赖 `weiran-common`。

**为什么**：反过来的依赖不会立刻报错，只会让「换实现」这条自由度在某天悄悄消失。

### CP-3 · 持久化类型不跨层

`*DO`、`BaseMapper`、`IPage`、`Wrappers` 等 MyBatis-Plus 类型只允许出现在
`*-infrastructure` 模块内。端口签名、应用层与适配层一律用领域模型或 `weiran-common` 的契约类型。

**为什么**：端口签名上出现一个 `IPage`，这层反转就白做了——换 ORM 时要改的不再是一个模块，而是全部。

## 契约与共享层

### CP-4 · 版本号只有一个来源

第三方依赖版本分两类，**各自只有一处**（D-013）：

- **框架版本**只在 `weiran-dependencies/build.gradle.kts`（import 的 Spring Boot / MyBatis-Plus BOM 与上游 constraints）。
  这两个 BOM 已经管住的依赖，不在 `weiran-dependencies` 里复述。
- **业务版本**（fork 下游自己引的第三方库与第三方 BOM）只在下游独占的 `weiran-dependencies/biz-dependencies.gradle.kts`。
  下游清单**不得**约束框架已管理的依赖，不论往高还是往低。

模块的 `build.gradle.kts` 里**不允许出现版本号**。框架依赖在运行时类路径里偏离框架版本（下游钉版本或传递依赖拉高）时，
`weiran-app` 的 `verifyFrameworkVersions` 失败；确认可接受的偏离逐条写进白名单并写理由（CP-6）。

**为什么**：复述一次就多一处会过期的事实，而过期的那处不会报错，只会在某次升级后行为分叉。
两类版本分开放，是为了下游不改上游文件；但 Gradle 对 `platform` 的冲突取高，下游一钉框架依赖就等于悄悄升级框架——
所以两处的边界必须由构建检查守住，而不是靠自觉。

### CP-5 · 质量规则只在 build-logic 里配置

Checkstyle、Spotless、SpotBugs、Forbidden APIs、Error Prone/NullAway 的配置只出现在
`build-logic/`。模块要放宽规则，只能通过 `weiran.conventions.*` property，
且必须在模块 `build.gradle.kts` 里写明理由。

**为什么**：规则散进各模块后，"全仓一致"就变成了口号——没有任何机制能发现某个模块偷偷关掉了空指针检查。

### CP-6 · 豁免必须最小且带理由

需要绕过质量规则时（如 `@SuppressForbidden`、`@NullUnmarked`、`@SuppressWarnings`），
豁免范围必须收敛到单个方法或单个类，并在紧邻位置写明**为什么无法回避**。
禁止在模块级或全仓级关闭规则来绕过单点问题。

**为什么**：一次模块级关闭会永久掩盖此后所有同类问题，而没有人会回来重新收紧它。

## 数据与凭据

### CP-7 · 表结构只经 Flyway 迁移变更，已发布的迁移永不修改

所有表结构与种子数据的变化只能以新增 Flyway 脚本的方式落地
（`weiran-*-infrastructure/src/main/resources/db/migration/<module>/V<yyyyMMddHHmm>__<module>_<desc>.sql`）。
已合入主干的脚本不得修改或删除，要纠正就追加新脚本。不手写 DDL 到任何环境。

**为什么**：Flyway 以校验和识别已执行的脚本。改一个已执行过的脚本，
所有已部署的库启动即失败（checksum mismatch）；更糟的是有人为了让它启动去 `repair`，
于是不同环境的真实结构从此分叉，而没有任何文件记录这件事。

### CP-8 · 密码只用 BCrypt，令牌吊销只走 token_version

密码哈希一律 BCrypt（`spring-security-crypto`），不得引入其它哈希算法或「兼容」分支。
改密码、管理员重置密码、禁用账号时必须递增 `sys_user.token_version`；
JWT 携带 `ver`，认证时与库中值比对。不得用黑名单表或延长/缩短 TTL 代替吊销。

**为什么**：无状态 JWT 在过期前一直有效，改完密码旧令牌还能用，等于改密码没有意义。
`token_version` 是这套架构里唯一让「立即失效」成立的机制，绕开它的任何写法都会留下窗口期。

## 安全

### CP-9 · 凭据不进版本库、不进日志

密钥、令牌、密码哈希不得出现在仓库文件、日志输出或异常消息里。
配置一律走环境变量或 Jasypt 加密，仓内只放 `.env.example` 占位。

**为什么**：密钥一旦进入 git 历史就无法撤销，只能轮换。前身项目 weiran-v1 的 README
里至今明文躺着云服务 AccessKey，这条是那次教训的落地。本地配置走 gitignore 掉的
`config/application-local.yml`，部署走 `WEIRAN_*` 环境变量。

### CP-10 · 认证失败不泄露账号存在性

「账号不存在」与「密码错误」必须返回同一个错误码与同一句 message。

**为什么**：两者可区分即构成账号枚举接口，攻击者可据此批量确认有效账号。

## 可观测性

### CP-11 · 错误码归属决定 HTTP 状态，不靠 Controller 判断

错误的 HTTP 状态由 `ErrorCode.httpStatus()` 决定（五位错误码的前三位即 HTTP 状态，见
`weiran-common` 的 `CommonErrors`），由 `weiran-framework` 的全局异常处理器统一输出。
Controller 不得手写状态码，也不得捕获业务异常自行转换。

**为什么**：状态码一旦在 Controller 里手写，同一个错误在不同入口就会返回不同状态，
而这种分叉只有前端会先发现。

## 三层结构（框架 / 基座 / 业务）

> 仓库按能力分三层（D-011 之后）：**框架** = `weiran-common` + `weiran-framework`（与业务无关的错误码、异常、响应包络、
> 认证与日志机制）；**基座** = `weiran-base`（身份权限、日志、字典与配置，所有业务共用的后台能力）；
> **业务** = 之后新增的业务模块。下面四条管这三层之间的边界，CP-1 … CP-3 管每一层内部的五层结构。

### CP-12 · 依赖只能业务 → 基座 → 框架，反向与同层横向禁止

完整的依赖链是 `weiran-app → 业务 → weiran-base → weiran-framework → weiran-common`，箭头方向就是「依赖谁」。
`weiran-dependencies`（BOM）不在这条链上，所有模块都向它取版本号。

- `weiran-common` / `weiran-framework` 不得依赖 `weiran-base` 或任何业务模块。框架需要基座的能力时，
  由框架定义 SPI、基座实现（现有的 `TokenAuthenticator`、`OperationLogRecorder` 就是这个模式）。
- `weiran-base` 不得依赖任何业务模块。
- `weiran-app` 是装配层，在链的最上端：可依赖基座与所有业务模块的 `adapter` / `infrastructure`（用于自动配置装配），
  但不得写业务代码，也不得被任何模块依赖。
- 业务模块之间不得互相依赖（Gradle 项目依赖与 Java 包引用都不行）；共用的东西上移到基座或框架，
  或经业务模块自己发布的 `*-api` 由调用方显式依赖，且不得成环。

**为什么**：反向依赖不会立刻报错，只会让「基座可以独立升级」这条自由度悄悄消失——
某天基座要改一张表，才发现动不了，因为某个业务在下面接着。

### CP-13 · 业务只经基座的 `weiran-base-api` 接触基座

业务模块对基座的依赖只允许 `:weiran-base-api`（DTO、命令对象、应用服务接口）与 `weiran-framework`
（`CurrentUser`、`@RequiresPermission`、`@OperationLog` 等）。
不得依赖 `weiran-base-domain` / `-application` / `-infrastructure` / `-adapter`，
不得直接读写基座的表（`sys_*`）、不得引用基座的 `*DO` 与 Mapper。
业务需要基座里还没有的能力时，先在 `weiran-base-api` 增加接口，再由基座实现。
例外：`weiran-app`（见 CP-12）为了装配，允许依赖基座的 `adapter` / `infrastructure`，因为它不写业务代码。

**为什么**：基座的表结构是它的内部实现。业务一旦直接 join `sys_user`，基座此后每一次改表都要先找全所有业务里的 SQL，
而这些 SQL 不在基座的测试范围内，坏了只会在业务的生产环境里发现。

### CP-14 · 错误码按号段分配，业务不得占用框架与基座的号段

错误码是五位：前三位 = HTTP 状态，**后两位 = 序号**（如 `40901` 的序号是 `01`）。序号按下表分段，
同一 HTTP 状态下不同段的码互不冲突：

| 序号段 | 归属 | 定义位置 |
| --- | --- | --- |
| `00`–`19` | 框架与基座（通用码） | `weiran-common` 的 `CommonErrors`，唯一登记处 |
| `20`–`99` | 业务模块 | 各业务模块自己的 `*-api` 里（`enum implements ErrorCode`），**每个模块在 `weiran4j/docs/business-modules.md` 领一段并登记** |

业务优先复用 `CommonErrors` 并在 `BizException` 里写具体提示语；只有前端需要按码分支处理时才新增码。
新增码前先在 `business-modules.md` 登记，登记的段不得跨模块重叠。

**为什么**：两个业务各自取 `40902` 不会有任何编译错误，只会让前端按码分支的逻辑把两个不同错误当成同一个。
序号只有两位，共 100 个，不分段几个业务就会撞满。

### CP-15 · 权限码、菜单 id 与 Flyway 模块段按层隔离

- **权限码**形如 `<模块>:<资源>:<动作>`。`system:` 前缀属于基座（包括字典、系统配置、日志等 platform 包内的能力），
  业务模块不得使用；业务用自己的模块名作前缀。
- **`sys_menu` 的 id**：`1`–`999` 属于基座，业务模块从 `1000` 起，每个模块在 `weiran4j/docs/business-modules.md` 领一段。
  这是 SL-4 里「全局序号型资源」的分配规则。
- **Flyway 脚本**放在 `<模块 infrastructure>/src/main/resources/db/migration/<module>/`，文件名 `<module>` 段用业务模块自己的名字，
  业务脚本不得放进基座的 `system/`、`platform/` 目录，也不得修改基座的表结构（要改走 CP-13 的「先在基座加能力」）。
  业务自己的表用业务前缀，不得以 `sys_` 开头。

**为什么**：这三样都是「全局唯一」资源，撞了要到合并、启动或授权时才暴露：权限码撞了会让一个业务的角色悄悄拿到另一个业务的权限，
这是三者里唯一不会报错的，后果最重。

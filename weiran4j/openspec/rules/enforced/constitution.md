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

**为什么**：反过来的依赖不会立刻报错，只会让「换实现」这条自由度在某天悄悄消失。

### CP-3 · 持久化类型不跨层

`*DO`、`BaseMapper`、`IPage`、`Wrappers` 等 MyBatis-Plus 类型只允许出现在
`*-infrastructure` 模块内。端口签名、应用层与适配层一律用领域模型或 `weiran-common` 的契约类型。

**为什么**：端口签名上出现一个 `IPage`，这层反转就白做了——换 ORM 时要改的不再是一个模块，而是全部。

## 契约与共享层

### CP-4 · 版本号只有一个来源

所有第三方依赖版本由 `weiran-dependencies` BOM 决定；模块的 `build.gradle.kts` 里
**不允许出现版本号**。底座 wuli3 与 Spring Boot BOM 已经管住的依赖，
不在 `weiran-dependencies` 里复述。

**为什么**：复述一次就多一处会过期的事实，而过期的那处不会报错，只会在某次升级后行为分叉。

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

## 迁移期约束

### CP-7 · pam_* 表结构改动必须双向核对

任何涉及 `pam_account` / `pam_role` / `pam_permission` / `pam_permission_role` /
`pam_role_account` / `pam_token` 的结构改动，必须先核对
`/Users/duoli/Projects/duoli-weiran/weiran-v1` 的迁移文件与 Model，
并在 `proposal.md` 写明对 PHP 侧是否破坏性。

**为什么**：迁移期两套系统并行读写同一套表。只看 Java 侧等于只看了一半，
而另一半的故障会记在 PHP 项目的账上。

### CP-8 · 历史密码算法只用于校验，永不用于生成

PHP 时代的 `md5(sha1(明文 + 注册时间) + password_key)` 只允许出现在校验回落路径上。
新哈希一律 BCrypt；历史哈希验通后必须就地重哈希。

**为什么**：md5 与 sha1 均已破且无工作因子。保留它是为了不把存量用户锁在门外，
不是为了让这个算法继续产生新数据。

## 安全

### CP-9 · 凭据不进版本库、不进日志

密钥、令牌、密码哈希不得出现在仓库文件、日志输出或异常消息里。
配置一律走环境变量或 Jasypt 加密，仓内只放 `.env.example` 占位。

**为什么**：weiran-v1 的 `README.md` 里至今明文躺着阿里云 AccessKey 与推送 SECRET，
且已进入 git 历史无法撤销。这条是那次教训的落地。

### CP-10 · 认证失败不泄露账号存在性

「账号不存在」与「密码错误」必须返回同一个错误码与同一句 message。

**为什么**：两者可区分即构成账号枚举接口，攻击者可据此批量确认有效账号。

## 可观测性

### CP-11 · 错误码归属决定 HTTP 状态，不靠 Controller 判断

错误的 HTTP 状态由 `ErrorMetadata` 的 `origin` 与 `WebErrorStatusResolver` 决定。
Controller 不得手写状态码，也不得捕获业务异常自行转换。

**为什么**：状态码一旦在 Controller 里手写，同一个错误在不同入口就会返回不同状态，
而这种分叉只有前端会先发现。

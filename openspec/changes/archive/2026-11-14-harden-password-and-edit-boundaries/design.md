---
title: "认证节流、编辑冲突与模板契约纠偏"
status: "approved"
approved_by: "用户"
approved_at: "2026-11-14"
updated_at: "2026-11-14"
---

# Design

## Context

来源为 interview.md 的 AC-1～AC-8、explore.md 与 proposal.md；对应用户选定的审查项 1、2、5。基线 e10c7ac，当前单 checkout 串行推进，保留工作区其他既存改动。本文件已获用户 L3 批准，审批日期见 frontmatter。

现有 MySQL 8 承载新增密码节流状态，不引入 Redis；独立 edit_version 处理旧草稿覆盖，不复用 token_version。修订 config/schema/templates 实际注入链，不改历史归档，也不改变规则 ID 含义。短信、MFA、绑定挑战的内存状态和通用请求幂等不在范围内。

## 宪法对照

| 原则 | 判定 | 说明 |
|---|---|---|
| CP-1 领域层不依赖框架 | ☑ 符合 | 节流端口、策略和版本参数为纯 Java 类型，领域测试不启动 Spring |
| CP-2 依赖方向单向向内 | ☑ 符合 | 应用依赖领域端口，MySQL 与事务实现在 infrastructure；不向内泄露 Spring |
| CP-3 持久化类型不跨层 | ☑ 符合 | DO、Mapper、条件更新及行锁均封装在 infrastructure |
| CP-4 版本号只有一个来源 | ☐ 不涉及 | 不引入第三方依赖或框架版本 |
| CP-5 质量规则只在 build-logic 里配置 | ☑ 符合 | 不调整 Java 质量规则；提示词守卫属于现有 OpenSpec 检查体系 |
| CP-6 豁免必须最小且带理由 | ☑ 符合 | 不以模块级豁免解决检查失败，反射边界沿用就地空安全规范 |
| CP-7 表结构只经 Flyway 迁移变更，已发布的迁移永不修改 | ☑ 符合 | 只追加两份 system 脚本，新表与版本列同时覆盖空库和升级库 |
| CP-8 密码只用 BCrypt，令牌吊销只走 token_version | ☑ 符合 | 节流先于 BCrypt，edit_version 独立，旧草稿不得触发 token_version 副作用 |
| CP-9 凭据不进版本库、不进日志 | ☑ 符合 | 配置模板无真实凭据，计数键摘要化，密码和草稿不进日志或浏览器持久存储 |
| CP-10 认证失败不泄露账号存在性 | ☑ 符合 | 已知/未知账号使用相同账号桶策略，额度内仍统一 110101 |
| CP-11 错误码归属决定 HTTP 状态，不靠 Controller 判断 | ☑ 符合 | 100007/409 与 110108/429 在错误定义中指定，全局异常处理输出 |
| CP-12 依赖只能业务 → 基座 → 框架，反向与同层横向禁止 | ☑ 符合 | 改动限于框架通用错误与 system 基座，不新增反向依赖 |
| CP-13 业务只经基座的 weiran-system-api 接触基座 | ☑ 符合 | 对外 version 与错误定义经 system-api 发布，不暴露表与 Mapper |
| CP-14 错误码按号段分配，业务不得占用框架与基座的号段 | ☑ 符合 | 复用已登记的框架 10/00 和基座 11/01，实施前重查尾号唯一性 |
| CP-15 权限码、菜单 id 与 Flyway 模块段按层隔离 | ☑ 符合 | 无新增菜单/权限，基座迁移仅落 system 模块段 |

## Architecture

Controller 提取可信 ClientContext；应用服务组织密码尝试和编辑用例；domain 声明纯 Java 的尝试准入及条件更新端口；infrastructure 实现 MySQL 短事务、条件更新和关系持久化。既有模块自动配置装配，不增加模块或依赖聚合逻辑。前端通过现有 Query hooks 读写，docs 复用状态组件和本地模拟器。

## Data Flow

### 密码尝试

1. 所有本地密码登录入口（含 MFA 的密码第一阶段）在 BCrypt 前调用同一准入服务。账号按现有输入 strip 并按 Locale.ROOT 小写形成桶键；IP 只取既有可信解析后的 ClientContext.ip，不再次解析转发头。锁屏按当前已认证用户 ID 使用独立桶。
2. MySQL 独立短事务先锁定固定 guard 行，取数据库 UTC 时间，清理有限批过期桶，读取并锁定所需桶，检查容量和全部额度。全部满足才同时预占；任一不足则不增加另一桶。计数事务必须先提交，不得随外层登录失败回滚；BCrypt 和账号查验均在 guard 锁之外执行。
3. 额度内继续现有密码校验与 MFA 流程；账号不存在仍做既有虚拟哈希比较，错误口径不变。成功和失败都消耗预占额度，成功不清零；故意选择这种方式限制并发在途校验，而非事后累计失败留下超发窗口。
4. 超限统一 110108/429；数据库异常、锁等待超时及全局键容量耗尽统一 100006/503，停止密码比较。前端不自动重试，不清现有会话；提示稍后主动重试。此次不扩展响应包络或增加倒计时协议。

**本次 L3 已批准的默认值：**

| 配置（weiran.auth.throttle 下） | 默认 | 行为 |
|---|---|---|
| account-limit | 10 | 同一规范化账号每登录窗口最多 10 次 |
| ip-limit | 100 | 同一可信 IP 每登录窗口最多 100 次 |
| login-window | 15m | 账号/IP 桶分别从首次预占开始固定窗口 |
| lock-limit | 5 | 同一当前用户每锁屏窗口最多 5 次 |
| lock-window | 5m | 锁屏桶独立固定窗口 |
| max-keys | 10000 | 所有作用域桶行的硬上限 |

所有值必须为正，窗口合法且上限受配置校验约束；阈值和容量不得超过持久化整数范围。配置随应用启动固定，实例必须使用相同值，改动通过统一重启发布，不引入热更新。部署覆盖采用对应 WEIRAN_AUTH_THROTTLE_* 环境变量，application.yml 与 .env.example 同步，并由 EnvExampleTest 验证。对共享出口和高频正常用户可能产生短暂限流，部署文档说明调参及窗口含义；不永久锁号。

计数容量通过 guard 行中的 tracked_keys 与桶表在同一事务内更新保持一致。每次准入最多清理 500 条过期记录并扣减计数，桶已过期可原位重置，不重复增加键数；容量不足则拒绝新键，不淘汰活跃桶。空闲期间允许过期记录留存，但表始终有界，后续流量触发清理。无本机缓存、应用重启不重置。数据库时间避免节点时钟偏差。guard 锁采用有限等待并正确恢复连接会话设置，计数器更新异常回滚。

取舍：固定 guard 行使短计数事务串行，保证两桶与硬容量的可验证原子性；BCrypt 不在锁内。此设计面向后台现有规模，不承诺未经测量的吞吐；出现计数锁等待告警后单独评估分片或外部存储，不能通过失败放行绕过防护。对不存在账号制造桶的攻击受硬容量约束，满容量期间新桶会受服务不可用影响，这是明确的 fail-closed 选择。

### 编辑版本

读取返回 version；打开编辑时将字段、关联集合和 version 作为一份不可分的基准快照。保存时传原版本；后端先验证身份、权限、字段与授权范围，再以 `WHERE id = ? AND edit_version = ?` 更新对应字段且版本加一。CAS 未命中需区分资源已删除（404）与版本过期（409）；缺少/负数版本为 400，不补默认版本，也不查询最新版本替旧客户端提交。

用户资料 CAS、角色关系替换及必要 token_version 吊销处于同一用例事务；先赢得 CAS 才执行关系替换与吊销，后续失败全部回滚。角色资料与菜单授权共享 sys_role.edit_version；菜单保存先 CAS 推进角色版本再替换关联，角色失效或冲突不得先删关联。缓存只在成功提交后失效，不用缓存取版本作写前提。

| 写路径 | 版本规则 |
|---|---|
| 管理员用户完整更新（含 roleIds） | 必传用户 version；CAS 后一并更新标量和用户角色关系 |
| 管理员 username/phone 行内编辑 | 必传用户 version；条件更新对应字段并加一 |
| 本人资料更新（昵称/头像/性别） | /me 返回 version，提交必传；与管理编辑相互冲突 |
| 本人用户名原子修改、认证后绑定/修改手机号 | 保留既有挑战协议，写入对应字段时原子递增 edit_version；完整旧草稿随后被拒绝 |
| 角色资料、角色 assignMenus | 必传同一角色 version；资料或菜单变化均加一 |
| 用户/角色创建 | 不要求客户端 version，初始为 0 |
| 登录记录、密码/重置/吊销、偏好和收藏 | 不推进 edit_version；原有独立原子写入和 token_version 行为保持 |

版本使用数据库有符号 INT 与 Java int/TS number，递增需防溢出，不允许回绕或复用版本。个人安全字段原子操作不提供整个账户覆盖，因此不强行新增编辑版本参数，但必须推进版本让旧的整表单失效。删除保留既有确认语义。

前端新增持久冲突反馈：保留草稿与关闭保护，禁用保存；“重新加载最新数据”需确认丢弃草稿，成功才替换字段与版本并恢复编辑，取消或加载失败仍保留原输入与冲突状态。背景缓存更新不能悄悄更新 expectedVersion。角色菜单树的 checked 集合与详情 version 同时冻结；行内编辑和个人资料遵循同样规则。不可自动拿新版本重试旧输入。

## 跨模块契约变更(DS-1)

| 对象 | 动作 | 消费方 |
|---|---|---|
| CommonErrors.EDIT_CONFLICT | 新增候选 100007 / HTTP 409，通用资源编辑冲突 | 用户、角色应用用例，前端错误判定 |
| SystemAuthErrors.AUTH_RATE_LIMITED | 新增候选 110108 / HTTP 429 | 本地密码与锁屏认证、前端 |
| system-api 用户/角色视图与命令 | 读取 version、更新强制 expected version，CurrentUserView 同步 | adapter、application、manage 手工 TS 类型 |
| domain 原子准入与条件更新端口 | 仅纯 Java 参数/结果，失败区分限流/不可用/冲突 | 应用与 infrastructure |
| config/schema/templates/guard | 修订注入事实，新增守卫登记及其说明 | 所有现行 workflow artifact |

以上作为 Layer 0 串行冻结。不修改 PageResult 或统一响应 `{code, message, data}`，成功 code 为数字 0。

## API Design(DS-2)

沿用现有路由和 HTTP 方法，不新增业务入口；Controller/DTO 的 Springdoc OpenAPI 是路径、方法与 schema 的权威定义，现状契约文档只补跨接口行为和数据约束。

| 现有入口族 | 请求变化 | 返回/错误变化 | 权限与审计 |
|---|---|---|---|
| system/auth 登录（未鉴权入口）与 MFA 密码第一阶段 | 不增加凭据字段 | 110108/429，100006/503 | 沿用公开登录入口与登录日志 |
| system/auth verifyPassword | 不增加密码之外字段 | 同上，保留会话 | 必须登录，沿用既有审计策略，不记录密码 |
| system/user 完整编辑、updateAccountField | 必填非负 version | 409/100007；列表/详情含 version | 沿用既有 @RequiresPermission 与 @OperationLog |
| system/role 编辑、assignMenus | 必填非负 version | 409/100007；列表/详情含 version | 沿用既有权限与操作日志 |
| system/auth updateProfile、me | 更新必填 version，me 返回 version | 409/100007 | 沿用本人身份校验与既有日志 |
| 本人安全字段原子变更 | 既有挑战参数 | 不增加返回包络，更新编辑版本 | 既有认证、挑战和审计 |

400/100001 表示参数错误；404 使用现有资源不存在定义。权限校验仍先于数据变更，version 不是授权凭据。新增失败码由错误枚举决定 HTTP 状态；前端仅 100101 清会话，不能把 429/409/503 当令牌失效。密码类 mutation 禁自动重放。

## Database Design(DS-3)

| 表 | 动作与字段 | 索引/约束 |
|---|---|---|
| sys_auth_throttle | 新增 scope、subject_hash、attempts、window_started_at、expires_at；摘要仅用作计数键，不是密码哈希 | 联合主键(scope, subject_hash)，expires_at 索引 |
| sys_auth_throttle_guard | 新增单行 id=1、tracked_keys=0，锁定并维护总键数 | 主键 id，约束 id=1、tracked_keys 非负 |
| sys_user | 加 edit_version INT NOT NULL DEFAULT 0 | CAS 使用现有主键 + version 条件，无额外索引 |
| sys_role | 同上 | 同上 |

SHA-256 对作用域及规范化主体做确定性摘要，数据库不存原始账号/IP，摘要不声称不可反推低熵主体；不输出摘要到日志。时间统一 UTC，过期判定用 DB UTC_TIMESTAMP(6)，范围计数与 guard 必须事务一致。内部表只经 system infrastructure 写入，无后台 CRUD 或菜单。

追加脚本预留于 weiran-system-infrastructure 的 db/migration/system/：
- V202611141900__system_authentication_throttle.sql
- V202611141901__system_edit_versions.sql

实施前再查全库版本唯一性；不碰已发布迁移，包括当前工作区其他任务遗留的批处理兼容迁移。新表各自补 state/bizs 八段现状与 README 索引；用户/角色现状同步版本字段。

## 权限与已知缺口(DS-4)

不新增权限码、菜单 ID 或页面注册。管理员授权范围、内置角色/用户保护与本人安全挑战规则继续生效；操作日志不把冲突写成成功。登录尝试日志保留现有语义，新增限流日志只含作用域、结果、requestId，不含原始账号、IP、密码、令牌或哈希；避免每个被拒请求刷告警。

artifact.md#13 只部分解决“丢失更新”，请求幂等仍保留；artifact.md#25 的短信/MFA/绑定内存状态未解决，不宣称认证全链路多实例就绪。sys_user.md#01、artifact.md#27 与模板债务按完成事实更新，未做完不提前关闭。

## 分层与装配(DS-5)

维持 adapter → application → domain 与 infrastructure → domain；节流 port 定义在 domain，实现与短事务在 infrastructure。外层用现有自动配置和 .imports 接入，应用侧不加扫描。共享行锁相关框架类型不得出现在端口签名。无新 Gradle 模块、BOM 或第三方库。

## 前端设计(DS-6)

改现有登录、锁屏、用户/角色表单、用户行内编辑、RoleMenuSheet 和 ProfilePage，不新增 App.tsx 路由或菜单行。hooks 与 types/api.ts 同步版本字段；刷新列表不能改打开草稿的基准。先复用 useFormCloseGuard、QueryReadiness、ListFeedback 及现有表单组件；必要共用冲突状态组件按 components.md 登记，不复制业务表单。

docs/page-states.md 增加本地可交互演示，沿用 ClientOnly 和 Vue/React 挂载，复用真实冲突/限流呈现或共用判定逻辑，展示正常、提交中、限流、冲突、确认重载、成功/失败、禁用和权限变化。无真实服务请求、账号和生产数据。

## 工作流注入事实修订

修订 config.yaml、schemas/devops-workflow/schema.yaml 和该 schema 的现行模板，保持 CP/SL/WT/CC/PK/TG/DS ID 与意义；技术事实以 AGENTS.md、现行规则及真实实现为准。移除作为执行要求的旧底座、PHP 共库、无迁移工具、字符串成功码、硬编码菜单、其他项目 Hono/Drizzle/pg-boss 指令及自动 worktree 合并要求。HTTP 细节权威改为生成的 OpenAPI，不在现状契约重复接口目录。历史档案不重写。

新增 guards/workflow-contracts.mjs，按已有插件机制在 project.json 登记；规则文档及 design/CHANGELOG.md 同步。检查有限、明确的废止肯定断言并报告文件和位置，禁止仅按关键词一刀切。Node 回归测试放 openspec/tests，覆盖各源注入错误与允许的禁止/历史说明；真实 openspec instructions 各 artifact 的 context/instruction/rules/template 组合再验证，防止只改模板遗漏 schema。检查无法证明所有自然语言事实，人工设计审阅仍保留。

## Observability

沿用 requestId 与统一错误处理。分别统计准入/超限/容量不足/存储失败/锁等待超时和版本冲突，不把每个拒绝请求提升为错误堆栈告警；聚合计数及有限频率警告实现为现有日志能力，不新增监控服务。排障文档说明 429 与 503 区别、共享配置、过期清理和调参，禁止通过清活跃桶解除攻击期间的限制。编辑冲突显示常驻提示，不仅瞬时 toast。

## Test Plan

| AC | 验证范围与可观测断言 |
|---|---|
| AC-1 | 应用/领域单测：规范化、账号和 IP 双桶、未知账号统一错误、成功占额、锁屏独立、超限未调用比较器；前端 429 不退出不自动重放 |
| AC-2 | Testcontainers MySQL：两个独立适配器共享计数，并发额度不超发、重建对象不重置、数据库/锁超时 fail-closed、过期与硬容量，guard/table 计数一致 |
| AC-3 | 真数据库并发同版用户保存仅一成功；409 请求标量/关系/token_version 无副作用；缺失/负 version 为 400 |
| AC-4 | 同版角色资料与 assignMenus 竞争、本人资料与管理员竞争、行内与安全原子写入版本推进；登录/偏好/收藏与密码吊销不误改 edit_version |
| AC-5 | React 测试覆盖 5 类编辑入口，Query 刷新不改变草稿版本；409 保留且禁提交、确认取消、重载失败/成功和关闭保护 |
| AC-6 | docs 真浏览器操作全部新增状态，检查无业务接口调用；生产前端和文档站构建 |
| AC-7 | Node 守卫正反夹具 + 各 artifact 真实 CLI JSON 输出校验；规则槽、ID 与门禁说明一致 |
| AC-8 | 空库/既有库追加迁移回归、OpenAPI required version、TS 编译与既有全量门禁 |

命令以 openspec/project.json 的 commands 为执行依据。后端统一 JDK 21，先 spotlessApply 再 check --no-daemon（需要 Docker），不并行 clean。前端跑 lint/test/build 与 docs build；OpenSpec 全量检查和新增 Node 测试单独记录证据。L7 前固定基线，不用 stash 改变证据快照。

## Rollout Plan

1. Layer 0 冻结错误码、version 字段、端口与节流配置；确认预留迁移编号及资源尾号未占用。
2. 追加 Flyway 升级，验证空库与已有数据均初始 version=0，新节流表初始空；不手工 DDL/repair。
3. **前后端同步发布**，维护窗口切换且停止旧实例写入，所有实例使用相同节流配置；刷新浏览器旧标签。旧客户端缺版本必须明确报错，不提供无条件覆盖兼容分支。
4. 验证正常登录/超限/锁屏恢复与用户、角色菜单、个人资料冲突；同步 docs、部署说明、状态债务及流水线机制文档。观察计数短事务延迟与冲突率。

## Rollback Plan

revert 锚点为本 change 最终实施提交（L9 记录准确 hash），设计基线 e10c7ac；不能用基线复原工作区其他既存改动。保持新表/列，不删除已发布迁移。

发布前可撤回未部署代码；发布后若回退前端，必须同步回退后端，并暂停相关写入口及密码入口直至确认保护仍存在。旧后端不识别 edit_version、也不受新节流保护，不能仅回滚代码后声称安全边界仍有效。优先前滚修复；数据库结构保持可被旧代码忽略，但期间需维护窗口限制访问。回滚不清理活跃计数或重置 token_version。

## Open Questions

无未决业务歧义。上述默认阈值、成功尝试计数、MySQL 单 guard 短事务及前后端同步发布已在本次 L3 随设计获用户批准。

# artifact —— 架构与技术问题

> 不专属任何单一业务表的架构、共享组件、契约、测试、工具、门禁问题。
> 属于 `state/`,**只描述事实,不是规范**:过期不会被 `check.mjs` 拦截,以代码为准。
> 条目格式与编号规则见 [`README.md`](README.md)「编号约定」;盘点基线 `e23c511`(2026-09-26)。

## 已知问题汇总

- **#28 ⚠️ P3 七份既有主规格未通过 CLI 全量严格校验**
  症状：执行 `openspec validate --specs --strict --no-interactive` 时，admin-foundation、deployment、observability、system-file-storage、system-site-config、system-sms-sender 的需求正文超过 500 字符，system-media-library 的 Purpose 过短；普通警告在 strict 模式使全量命令返回 1。2026-11-15 归档 import-test-workflow-framework 时，在未改动的 HEAD 基线隔离副本复现相同 7 项；本次涉及的 test-workflows 和 continuous-integration 均通过，仓库 `node openspec/check.mjs` 通过。后续应在保留需求语义和场景标题的前提下整理正文，不通过关闭 strict 掩盖。证据见该归档的 exec/evidence/baseline-spec-validation.log 与 archive-spec-validation.log。


- **#01 ⚠️ P3 Gradle 配置缓存被迫关闭**
  症状:冷构建配置阶段慢几秒,所有开发者都受影响。
  Spotless 的 palantir-java-format 在配置缓存恢复的类加载器里拿不到 `--add-exports` 的模块开放,
  `IllegalAccessError` 被包成 `palantir-java-format(InvocationTargetException)` 随机报错
  (实测记录见 `packages/server/gradle.properties`)。
  关闭条件:Spotless 修复配置缓存兼容性,或改用不依赖 javac 内部 API 的格式化器。(原全局编号待办的第 1 条,随全局编号废止改为本编号)



- **#06 ⚠️ P3 前端产物未分包**
  症状:首屏需加载约 2.2 MB 静态资源(Semi UI 全量),弱网下登录页白屏时间长。
  `packages/manage/vite.config.ts` 没有任何 `manualChunks`(D-007 有意不照搬 mono4ts 的分包调优),等体积真成问题再处理。

- **#08 ⚠️ P3 登录并发回归测试未在旧实现上验证过**
  症状:`UserRoleIT.concurrentLoginsDoNotUndoPasswordResets` 是为「登录整行回写撤销改密」而写的竞态测试,
  但没有在旧实现上回跑过,不能证明它真能抓住这个回归(竞态本身是概率性的)。

> #10~#18 来自 2026-09-27 对照公司《Java 项目开发流程手册 v1.8》及其子规范(日志、接口 v2.0、错误码、
> 数据库 v1.2、Java 编码 v1.0、Git/CR v2.1、Auth 对接)的盘点。定位按独立底座(维持 D-008):
> 通用工程规则的缺口记为待处理,技术栈与接口约定的差异记为有意偏离(#17)。

- **#12 🔴 P1 没有分支保护与 PR / CR 流程**
  症状:任何人都能直接推 `main`,代码不经评审就进入主干;与 #05(没有 CI)叠加后,
  质量只取决于提交者本地是否跑过门禁。仓库只有 `main` 一个分支,提交历史全部直推。
  关闭条件:`main` 设为受保护分支,改为 feature/hotfix 分支 + PR 合并,CR 清单沿用公司 CR 规约的 P0~P3。

- **#13 ⚠️ P2 部分解决： 写接口请求幂等仍主要靠唯一键兜底**
  harden-password-and-edit-boundaries 已解决用户、本人资料、角色资料及菜单授权的旧草稿覆盖，独立编辑版本不等同请求幂等。
  剩余症状：重复创建请求，有唯一键的返回 100003，没有业务唯一键的写入仍可能重复；其他资源未普遍接入版本协议。
  后续关闭条件：按具体业务确定重复提交的稳定结果、唯一约束与必要的请求幂等协议，不能因本次编辑保护而宣称全平台完成。

- **#14 ❓ P2 列表关键字搜索使用全模糊 LIKE**
  症状:用户、角色、登录日志的 keyword 查询生成 `like '%x%'`,不走索引;登录日志持续增长,
  数据量上来后该查询会变成全表扫描。公司数据库规约把「页面搜索禁止左模糊 / 全模糊」列为强制。
  位置:`MybatisUserRepository`、`MybatisRoleRepository`、`MybatisLoginLogRepository` 的 `.like(...)`。
  待确认:改前缀匹配(`likeRight`),或把「后台小表允许全模糊」写进 #17 并注明数据量上限(登录日志不适用)。

- **#15 🔴 P3 建表规范与公司数据库规约不一致**
  症状:按公司规约审表的人会判为不合规;可空字段让查询与映射多一层空值分支。
  现状:主键为 `bigint`(规约要求 `bigint unsigned`);`email`、`phone`、`description`、`created_by` 等
  非时间 / text 字段可空(规约要求 not null + 默认值);布尔字段 `tinyint(1)` 无 unsigned。
  已合入的脚本按 CP-7 不能改。关闭条件:把规则写进 `rules/enforced/`,新表遵守;
  旧表是否追加迁移单独评估。

- **#16 🔴 P3 `*DO` 的含义与公司手册相反**
  症状:从公司其他项目过来的人会把本仓的 `Sys*DO` 当成领域对象,实际它是 MyBatis 表实体;
  公司手册里表实体叫 `*PO`、`DO` 指领域对象。读错分层会把持久化类型带进 domain(违反 CP-3)。
  关闭条件:新代码把表实体改为 `*PO`,或在 `AGENTS.md`「分层规矩」里显式写明本仓 `DO` = 表实体。

- **#17 ⚠️ P3 与公司《Java 项目开发流程手册》的有意偏离(独立底座,D-008)**
  症状:按公司手册做 CR 或对接的人会把下列各项判为不合规,或按手册格式对接时静默出错。
  以下为知情接受,决定接入公司微服务体系时需逐项重新评估:
  - 技术栈:Gradle(非 Maven + 私服 + archetype);自建 `weiran-framework`(非 wuli 二方库);
    MyBatis-Plus + Flyway(非 Raptor + PageHelper);无 Tesla RPC / MWP 网关 / Metabase / Vacuum / Spirit / Sentry;
    自建 JWT + RBAC(非 Auth / CAS 平台与 `@Permission` 启动上报)。
  - 响应体:`{code: 0, message, data}`(公司为 `{status, success, message, data, requestId}`;requestId 缺失见 #10)。
  - 错误码:6 位，服务、资源、错误各 2 位，HTTP 状态单独定义(公司为 9 位:异常类型 1 + 服务 3 + 领域 2 + 业务 3)。
  - URL 与方法:REST 风格 `/api/users/{id}` + PUT / DELETE(公司只用 GET / POST,
    路径 `/{服务}/{模块}/{资源}/v1/{动作}`,蛇形)。
  - 分页:入参 `page/pageSize`、返回 `list/total`(公司为 `current/size`、`records/total`)。
  - 权限码:`system:user:create`(公司为点分蛇形 `系统.模块.操作`,菜单节点需 `.page` / `.manage`)。
  - 类命名:`*Request` / `*View` / `*Command`(公司为 `*ReqDTO` / `*RespVO` / `*DomainService`);`DO` 含义见 #16。

- **#19 🔴 P3 `@SkipApiResponse` 用在 `/api/**` 上没有机械拦截**
  症状:有人在管理端 Controller 上标了 `@SkipApiResponse`(或其组合注解),该接口不再返回 `{code:0}`,
  前端 `request.ts` 把成功响应当失败处理——编译、单测、`check` 全绿,只在点到那个页面时暴露。
  目前只有 javadoc 与 `downstream-extension` FR-005 的规范约束(`downstream-extension-points` 判为本次不修:
  `supports()` 拿不到请求路径)。可选做法:启动时扫描 `/api/**` 映射的处理方法并断言没有该注解。

- **#20 🔴 P3 fork 下游往 `artifact.md` / `cross-biz.md` 登记问题仍要改上游文件**
  症状:下游在本目录的这两份公共文件里追加 `#NN` 条目后,上游再改同一文件时 `git merge` 冲突,
  且两边各自取「最大号 + 1」会撞号(`REPO/state-id-dup`)。`downstream-extension-points` 只给组件清单与 bizs 文件索引开了旁路文件,
  这两份留作本次不决定(见该 change 的 interview)。可选做法:约定下游写 `artifact.biz.md` / `cross-biz.biz.md`。

- **#21 🔴 P3 domain / api 只用 framework 纯 Java 契约包没有机械拦截**
  症状:D-016 之后 `*-domain` / `*-api` 依赖整个 `weiran-framework`。签名里带 Spring 类型的类在这两层编译不过,
  但不带的(如 `@RequiresPermission`、`LoginUser`、`OperationLogEvent`)能编译通过——有人在领域层引用认证或日志机制,
  `check` 全绿,CP-2「只能用 `error/page/response/status/text/tree`」只靠评审守。
  可选做法:Checkstyle `ImportControl` 或 ArchUnit 规则,限制 `*.domain..` / `*.api..` 只能 import 上述六个包。

- **#25 ⚠️ P2 短信登录、MFA 与手机号绑定挑战状态仅保存在单进程内**
  症状：`PhoneLoginApplicationService`、`MfaLoginApplicationService` 和 `PhoneBindingApplicationService` 使用进程内 Map 保存挑战及节流状态；验证码在 A 实例创建后，请求被分配到 B 实例可能被判无效，实例重启也会丢失未过期挑战，发送频控无法跨节点累加。`AuthSnapshotCache` 的权限失效也只作用于本节点（另见本文件 #02）。建议先明确单实例运行约束；有多实例需求时，为挑战与频控定义共享存储端口、原子消费和过期语义，并单独处理权限失效传播。2026-11-14 静态复查，未进行双实例验证。


## changelog

**2026-11-15**

- `cover-core-admin-api-workflows` 补齐8条业务API流程与核心匿名矩阵：用户/角色/菜单/字典/配置生命周期、同会话撤权、核心读取与地区只读；总计15条。写入显式允许，独立Cookie/CSRF、唯一资源写前登记和精确恢复；测试产物不保存真实业务响应。实际覆盖/真实执行边界见 docs/testing.md、tests/docs/coverage.md 与本change验收记录；不把合成通过当真实业务通过。

- `import-test-workflow-framework` 引入根 `tests/` 工作流：Playwright API/E2E、Bruno 与统一 CLI/注册表/严格证据复核，保留原 Gradle/Vitest 测试；CI 新增独立 Node 24 离线门禁。Cookie/CSRF 会话材料仅写 gitignore 的私有目录，正常登出验证 Cookie/缓存清除和匿名拒绝，不声明旧 JWT 已吊销。7 条系统流程已适配，离线与合成 Chromium 服务验证独立于真实业务通过结论；真实环境需专用账号与已启动服务。本次未运行真实业务流程。入口见 `docs/testing.md` 与 `tests/docs/coverage.md`。

**2026-11-14**

- **#02 ✅ P2 权限缓存已有跨实例修订号边界**
  由 harden-menu-and-authorization-contracts 解决：每次本地鉴权从 MySQL 读取共享 revision，以 userId/revision 为缓存键；权限加载与版本同视图。应用授权写与修订号同事务，回滚不发布；读失败拒绝旧权限。双缓存的用户角色、角色/菜单状态与授权变更回归通过；token_version 仍逐请求查库。

- **#04 ✅ P2 OpenAPI 已描述实际统一响应包络**
  由 harden-menu-and-authorization-contracts 解决：运行时与文档共用包装判定，成功只包一层，保留列表、分页、String、ApiResponse<Void> 和原始响应；失败 schema 含 requestId。真实 Springdoc/HTTP 及可选类路径测试通过，仍仅 local 默认开放文档。

- **#26 ✅ P2 其它会话改权已有前端校准与恢复**
  由 harden-menu-and-authorization-contracts 解决：单一身份/菜单快照，前台在线每 30 秒及恢复前台/联网校准；403/100102 去重校准不重放，100103 排除。失败保留旧快照并持续提示重试；旧会话响应不能清理或覆盖新会话。单测与 docs 浏览器通过，网络故障不承诺界面完成时限。


- **#27 ✅ P1 密码认证与锁屏已有共享尝试边界**
  harden-password-and-edit-boundaries：MySQL 双桶原子预占及用户锁屏额度，成功/失败均计数，可信来源、固定窗口、硬容量与有界清理，存储/锁等待失败拒绝 BCrypt。双适配器并发、重启、过期、容量、故障与真实 HTTP 429 会话保留已回归；不代表 #25 的短信/MFA 内存状态已解决。

- **#03 ✅ P2 客户端 IP 直接信任 `X-Forwarded-For`**
  原症状:登录日志与操作日志里的 IP 可被请求方任意伪造,安全回溯时拿到的是假地址。
  原实现：`weiran-framework` 的 `ClientIpResolver` 取 `X-Forwarded-For` 首个值,不校验请求是否来自可信代理。
  原关闭条件:配置可信代理网段,只有来自可信代理的请求才读该头。
  2026-11-14 设计复查补充：该值已不仅用于日志。`AuthController.clientOf` 将其放入 ClientContext，手机号登录与绑定手机号的发送/尝试限制使用 `client.ip()`；随意改变转发头会改变 IP 限流桶。仓内 Nginx 以 `$proxy_add_x_forwarded_for` 追加来访值，后端取首项，单靠这一默认反代配置不能消除伪造。启用短信能力时应按 P1 处理可信代理边界；不能据此声称手机号维度的限制也全部失效。本轮为静态代码链路核对，未进行攻击验证。
  由 `enforce-trusted-client-ip-boundary` 解决：可信代理默认空列表，按 socket peer 与显式 IP/CIDR 从右向左解析链；非法/重复/超限输入退回直接对端。日志和短信限流复用请求内缓存的规范化 IP，应用禁止标准先行改写，边缘 Nginx 覆盖访客声明。IPv4/IPv6、真实 HTTP 审计与变更伪造头的 IP 限流回归通过；部署前须显式配置实际代理范围，示例见 `docs/trusted-proxies.md`。

- **#23 ✅ P2 表单关闭保护尚未覆盖角色、菜单和字典编辑**
  原症状：用户和地区表单已接入 `useFormCloseGuard`，但 `RoleFormModal`、`MenuFormModal`、`DictFormModal` 与字典项编辑仍直接 `onCancel={onClose}`。编辑后取消或按 Esc 会丢失草稿；保存中仍有关闭入口，关闭后请求可能继续生效。应统一接入已有保护及保存期关闭限制。原审查为静态检查，未进行浏览器故障注入。
  由 `complete-admin-form-and-read-recovery` 解决；四类编辑弹窗已保护关闭与保存；角色、菜单和字典两侧查询已提供持续失败反馈、缓存保留与原地重试。

- **#24 ✅ P2 角色、菜单和字典读取失败缺少持续错误态**
  原症状：`RolesPage`、`MenusPage` 和 `DictsPage`（含字典项）主要使用 data/isFetching，未按 isError 呈现持续失败及就地恢复；首次失败时空数组回退可能显示成无记录，字典列表还会显示“暂无字典”。已有部分刷新入口，但无法持续区分失败、成功空结果和缓存数据刷新失败。应复用 `ListFeedback` / 成功空态模式；原审查未做浏览器故障注入。
  由 `complete-admin-form-and-read-recovery` 解决；四类编辑弹窗已保护关闭与保存；角色、菜单和字典两侧查询已提供持续失败反馈、缓存保留与原地重试。

- **#22 ✅ P2 前端缺少页面渲染与懒加载异常恢复边界**
  由 `recover-pages-and-sync-menu-permissions` 解决。页面和根部加入错误边界；每个路由实例独立重试，重建lazy加载实例；缓存/非缓存页和实际路由故障测试覆盖隔离与恢复。
  原症状：症状：`main.tsx` 与 `App.tsx` 使用 Suspense 处理加载等待，但没有 React 错误边界。页面渲染抛错或懒加载模块拒绝时，用户缺少应用自己的重试/返回入口，且可能连导航一起不可用。应在管理内容区设置错误边界并保留外壳；原审查时尚未做浏览器故障注入。

**2026-10-07**(D-016,common 并入 framework)

- **#07 ✅ P3 `*-api` / `*-domain` 模块被约定插件注入 `slf4j-api`**
  症状:宪法 CP-2 说这两层「只能依赖 `weiran-common`」(D-016 前的措辞),但 `build-logic` 的 `JavaConventionsPlugin`
  给所有 Java 模块都加了 `slf4j-api`,按字面读会以为违反了宪法。实际只是日志门面,不影响分层。
  关闭条件:要么在 CP-2 里写明 `slf4j-api` 例外,要么约定插件对 api/domain 不注入。
  **由 D-016(common 并入 framework)关闭**:CP-2 改写时写明 `slf4j-api` 是日志门面、不算框架依赖。

**2026-10-06**(`deploy-observability`)

- **#09 ✅ P2 `packages/server/.env.example` 仍是重写前的内容**
  症状:按它配置部署环境的人会拿到旧库名与已不存在的 PHP / `pam_*` 说明,且缺 `WEIRAN_JWT_TTL`。
  权限规则禁止 agent 读写 `.env*` 文件,需要人工更新。应列出:`WEIRAN_DB_URL`(库名 `weiran4j`)、
  `WEIRAN_DB_USERNAME`、`WEIRAN_DB_PASSWORD`、`WEIRAN_JWT_SECRET`(至少 32 字节)、`WEIRAN_JWT_TTL=12h`、
  `WEIRAN_PORT=5200`、`WEIRAN_LOG_LEVEL`。
  **由 `deploy-observability` 关闭**:整份重写,覆盖 `application.yml` 全部 `${WEIRAN_*}` 占位符(含 Cookie / 日志 / 停机)和 Compose 专用的 `WEIRAN_WEB_PORT`;`EnvExampleTest` 守住两边一致,漏改会让 `check` 失败。
- **#10 ✅ P1 日志体系缺失:无 requestId、无日志配置、关键节点不打日志**
  症状:线上出问题时运维和开发拿不到现场——无法用一个 ID 串起一次请求的全部日志,
  前端报错也给不出可检索的请求标识;异常只有响应里的错误码,服务端没有对应记录。
  现状:主代码只有 8 条日志语句;没有 `logback-spring.xml`;没有 MDC / requestId(`ApiResponse` 里也没有该字段);
  请求入口/出口、捕获异常处都不打日志;MyBatis 日志与业务日志未分离。
  公司规范要求格式 `[%d] [%contextName] [%X{requestId}] [%thread] [%level] [%logger{50}] --> %msg%n`。
  关闭条件:requestId 过滤器(写 MDC + 响应头 + 响应体字段,前端同步)、`logback-spring.xml`、
  拦截器打入口/出口摘要(脱敏、截断)、全局异常处理补 ERROR 日志。
  **由 `deploy-observability` 关闭**:
  - `RequestIdFilter` 负责请求号:写 MDC 和 `X-Request-Id` 响应头,合法的入站值沿用;
  - 失败体带 `requestId`,前端 Toast 显示前 8 位;
  - `logback-spring.xml` 按公司格式输出到控制台 + 按天滚动文件,SQL 单独一个文件;
  - `com.wulicode.weiran.access` 访问日志;
  - 异常日志分级:4xx 业务异常记 WARN,5xx 记 ERROR 带堆栈;
  - `MdcTaskDecorator` 让操作日志异步线程也带请求号。

  入口 / 出口只记摘要,不记请求体(写接口另有操作日志)。
- **#11 ✅ P2 未配置优雅停机**
  症状:发版重启时正在处理的请求被直接掐断,调用方拿到连接重置;操作日志异步队列里未落库的记录可能丢失。
  `application.yml` 没有 `server.shutdown=graceful` 与 `spring.lifecycle.timeout-per-shutdown-phase`。
  **由 `deploy-observability` 关闭**:显式配置 `server.shutdown: graceful` 与 `timeout-per-shutdown-phase`(`WEIRAN_SHUTDOWN_TIMEOUT`,默认 30s),操作日志线程池等待 10s ≤ 30s,`ObservabilityIT` 锁定;Compose 的 `stop_grace_period` 为 40s。容器实测 SIGTERM 后出现 `Commencing graceful shutdown`。
- **#18 ✅ P2 缺部署步骤文档**
  症状:第一次部署的人只能从 `AGENTS.md` 与 `application.yml` 自行拼出步骤(JDK、库、环境变量、前端产物放哪),
  且 #09 的 `.env.example` 本身是错的。公司手册「项目标准」把服务部署步骤文档列为高优先级交付物。
  **由 `deploy-observability` 关闭**:新增 `packages/server/docs/02-部署.md`,以及后端 / 前端 Dockerfile、`packages/manage/nginx.conf`(同源反代、透传头)、`docker-compose.yml`(含 MySQL 8)。已真实构建、启动,并经 Nginx 完成登录验证。

**2026-10-05**(`auth-seams-cookie-ci`)

- **#05 ✅ P1 没有 CI:门禁 ③ 不存在**
  症状:后端 `./gradlew check`(含 Testcontainers 集成测试)与前端 `lint/test/build` 只在本地跑;
  跳过 pre-commit(`--no-verify`)或没跑 `pnpm hooks:install` 的提交,没有任何一道关口会发现回归。
  仓库没有 `.github/workflows/`。关闭条件:加一个在 PR 上跑后端 `check`、前端 `lint/test/build`
  与 `node openspec/check.mjs` 的 workflow。
  **由 `auth-seams-cookie-ci` 关闭**:新增 `.github/workflows/ci.yml`,PR 与推送 main 时并行跑 backend(JDK 21 `./gradlew check`)、
  web(`pnpm lint/test/build`)、openspec(`node openspec/check.mjs`)三个 job。分支保护(要求 CI 通过才能合并)仍未配置,见 #12。
- 同批:#02 改为 🟡 部分解决:吊销判定不再经过缓存,剩余角色 / 权限的 30s 窗口仍在「已知问题汇总」。

**2026-09-26**(D-008 框架重写 + openspec 移到仓库根)

- 本文件建立,收纳原 `state/waitlist.md` 仍有效的「Gradle 配置缓存被迫关闭」(→ #01)与重写后盘点出的架构 / 技术问题。
- 原 `waitlist.md` 其余 6 条随 D-008 重写失效(wuli3 依赖、`pam_*` 表、Ban、`PamService` 均已不存在),
  不迁入本文件;原文见 git 历史 `packages/server/openspec/state/waitlist.md`。

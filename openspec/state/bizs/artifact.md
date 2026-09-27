# artifact —— 架构与技术问题

> 不专属任何单一业务表的架构、共享组件、契约、测试、工具、门禁问题。
> 属于 `state/`,**只描述事实,不是规范**:过期不会被 `check.mjs` 拦截,以代码为准。
> 条目格式与编号规则见 [`README.md`](README.md)「编号约定」;盘点基线 `e23c511`(2026-09-26)。

## 已知问题汇总

- **#01 ⚠️ P3 Gradle 配置缓存被迫关闭**
  症状:冷构建配置阶段慢几秒,所有开发者都受影响。
  Spotless 的 palantir-java-format 在配置缓存恢复的类加载器里拿不到 `--add-exports` 的模块开放,
  `IllegalAccessError` 被包成 `palantir-java-format(InvocationTargetException)` 随机报错
  (实测记录见 `weiran4j/gradle.properties`)。
  关闭条件:Spotless 修复配置缓存兼容性,或改用不依赖 javac 内部 API 的格式化器。(原全局编号待办的第 1 条,随全局编号废止改为本编号)

- **#02 ⚠️ P2 权限缓存只在单节点内生效**
  症状:多节点部署时,在 A 节点改了某用户的角色/菜单或吊销其令牌,B 节点在最长 30 秒内仍按旧权限放行。
  `TokenAuthenticator` 的实现用进程内 Caffeine 缓存(30s),失效只作用于本进程。
  单节点部署不受影响;上多节点前需要改成分布式失效(如 Redis 广播)或缩短 TTL。

- **#03 ⚠️ P2 客户端 IP 直接信任 `X-Forwarded-For`**
  症状:登录日志与操作日志里的 IP 可被请求方任意伪造,安全回溯时拿到的是假地址。
  `weiran-framework` 的 `ClientIpResolver` 取 `X-Forwarded-For` 首个值,不校验请求是否来自可信代理。
  关闭条件:配置可信代理网段,只有来自可信代理的请求才读该头。

- **#04 ⚠️ P3 OpenAPI 文档不体现统一响应包络**
  症状:按 `/v3/api-docs` 生成客户端的人拿到的返回类型是裸业务对象,实际响应外面还有 `{code, message, data}`。
  包装发生在 `ApiResponseBodyAdvice`(运行期),springdoc 只看 Controller 的声明返回类型。

- **#05 🔴 P1 没有 CI:门禁 ③ 不存在**
  症状:后端 `./gradlew check`(含 Testcontainers 集成测试)与前端 `lint/test/build` 只在本地跑;
  跳过 pre-commit(`--no-verify`)或没跑 `pnpm hooks:install` 的提交,没有任何一道关口会发现回归。
  仓库没有 `.github/workflows/`。关闭条件:加一个在 PR 上跑后端 `check`、前端 `lint/test/build`
  与 `node openspec/check.mjs` 的 workflow。

- **#06 ⚠️ P3 前端产物未分包**
  症状:首屏需加载约 2.2 MB 静态资源(Semi UI 全量),弱网下登录页白屏时间长。
  `web/vite.config.ts` 没有任何 `manualChunks`(D-007 有意不照搬 mono4ts 的分包调优),等体积真成问题再处理。

- **#07 ⚠️ P3 `*-api` / `*-domain` 模块被约定插件注入 `slf4j-api`**
  症状:宪法 CP-2 说这两层「只能依赖 `weiran-common`」,但 `build-logic` 的 `JavaConventionsPlugin`
  给所有 Java 模块都加了 `slf4j-api`,按字面读会以为违反了宪法。实际只是日志门面,不影响分层。
  关闭条件:要么在 CP-2 里写明 `slf4j-api` 例外,要么约定插件对 api/domain 不注入。

- **#08 ⚠️ P3 登录并发回归测试未在旧实现上验证过**
  症状:`UserRoleIT.concurrentLoginsDoNotUndoPasswordResets` 是为「登录整行回写撤销改密」而写的竞态测试,
  但没有在旧实现上回跑过,不能证明它真能抓住这个回归(竞态本身是概率性的)。

- **#09 🔴 P2 `weiran4j/.env.example` 仍是重写前的内容**
  症状:按它配置部署环境的人会拿到旧库名与已不存在的 PHP / `pam_*` 说明,且缺 `WEIRAN_JWT_TTL`。
  权限规则禁止 agent 读写 `.env*` 文件,需要人工更新。应列出:`WEIRAN_DB_URL`(库名 `weiran4j`)、
  `WEIRAN_DB_USERNAME`、`WEIRAN_DB_PASSWORD`、`WEIRAN_JWT_SECRET`(至少 32 字节)、`WEIRAN_JWT_TTL=12h`、
  `WEIRAN_PORT=3300`、`WEIRAN_LOG_LEVEL`。

> #10~#18 来自 2026-09-27 对照公司《Java 项目开发流程手册 v1.8》及其子规范(日志、接口 v2.0、错误码、
> 数据库 v1.2、Java 编码 v1.0、Git/CR v2.1、Auth 对接)的盘点。定位按独立底座(维持 D-008):
> 通用工程规则的缺口记为待处理,技术栈与接口约定的差异记为有意偏离(#17)。

- **#10 🔴 P1 日志体系缺失:无 requestId、无日志配置、关键节点不打日志**
  症状:线上出问题时运维和开发拿不到现场——无法用一个 ID 串起一次请求的全部日志,
  前端报错也给不出可检索的请求标识;异常只有响应里的错误码,服务端没有对应记录。
  现状:主代码只有 8 条日志语句;没有 `logback-spring.xml`;没有 MDC / requestId(`ApiResponse` 里也没有该字段);
  请求入口/出口、捕获异常处都不打日志;MyBatis 日志与业务日志未分离。
  公司规范要求格式 `[%d] [%contextName] [%X{requestId}] [%thread] [%level] [%logger{50}] --> %msg%n`。
  关闭条件:requestId 过滤器(写 MDC + 响应头 + 响应体字段,前端同步)、`logback-spring.xml`、
  拦截器打入口/出口摘要(脱敏、截断)、全局异常处理补 ERROR 日志。

- **#11 🔴 P2 未配置优雅停机**
  症状:发版重启时正在处理的请求被直接掐断,调用方拿到连接重置;操作日志异步队列里未落库的记录可能丢失。
  `application.yml` 没有 `server.shutdown=graceful` 与 `spring.lifecycle.timeout-per-shutdown-phase`。

- **#12 🔴 P1 没有分支保护与 PR / CR 流程**
  症状:任何人都能直接推 `main`,代码不经评审就进入主干;与 #05(没有 CI)叠加后,
  质量只取决于提交者本地是否跑过门禁。仓库只有 `main` 一个分支,提交历史全部直推。
  关闭条件:`main` 设为受保护分支,改为 feature/hotfix 分支 + PR 合并,CR 清单沿用公司 CR 规约的 P0~P3。

- **#13 🔴 P2 写接口幂等只靠唯一键兜底**
  症状:重复提交创建类请求时,有唯一键的表返回 `40900`,没有业务唯一键的写入会产生重复数据;
  两个管理员同时编辑同一条记录时后写覆盖先写,先写的人不会得到任何提示。
  公司 Java 编码规约把「同时插入 / 同时修改」两种幂等列为强制。
  关闭条件:定下统一策略(唯一键 + 乐观锁 `version` 列,或提交令牌),从用户、角色写接口开始落地。

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
  - 错误码:5 位、前三位即 HTTP 状态(公司为 9 位:异常类型 1 + 服务 3 + 领域 2 + 业务 3)。
  - URL 与方法:REST 风格 `/api/users/{id}` + PUT / DELETE(公司只用 GET / POST,
    路径 `/{服务}/{模块}/{资源}/v1/{动作}`,蛇形)。
  - 分页:入参 `page/pageSize`、返回 `list/total`(公司为 `current/size`、`records/total`)。
  - 权限码:`system:user:create`(公司为点分蛇形 `系统.模块.操作`,菜单节点需 `.page` / `.manage`)。
  - 类命名:`*Request` / `*View` / `*Command`(公司为 `*ReqDTO` / `*RespVO` / `*DomainService`);`DO` 含义见 #16。

- **#18 🔴 P2 缺部署步骤文档**
  症状:第一次部署的人只能从 `AGENTS.md` 与 `application.yml` 自行拼出步骤(JDK、库、环境变量、前端产物放哪),
  且 #09 的 `.env.example` 本身是错的。公司手册「项目标准」把服务部署步骤文档列为高优先级交付物。

## changelog

**2026-09-26**(D-008 框架重写 + openspec 移到仓库根)

- 本文件建立,收纳原 `state/waitlist.md` 仍有效的「Gradle 配置缓存被迫关闭」(→ #01)与重写后盘点出的架构 / 技术问题。
- 原 `waitlist.md` 其余 6 条随 D-008 重写失效(wuli3 依赖、`pam_*` 表、Ban、`PamService` 均已不存在),
  不迁入本文件;原文见 git 历史 `weiran4j/openspec/state/waitlist.md`。

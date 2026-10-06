---
title: "部署与可观测性 · 集成与校验"
status: "done"
updated_at: "2026-10-06"
---

# Verify

> **L6 集成 + L8 规格一致性**。执行者:orchestrator(E1 / E2 / E4 的实现者;E3 由 subagent 实现,已读完其收尾笔记)。

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成。E3 由 subagent 与 orchestrator 交替推进,文件集按 plan §5 不相交,没有冲突。
**执行单元数**:4 个

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全(E1-framework-request-id、E2-app-logging-shutdown、E3-web-request-id、E4-deploy)
- [x] Layer 0 已完成,且契约没有再变动
- [x] 自测通过

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| 请求号头名 `X-Request-Id` | 后端 `RequestIdFilter.HEADER`、前端 `request.ts`、`nginx.conf` | 三处都保留 | — | ☑(跨语言、跨配置无法共享;契约 §4 是唯一定义,后端与前端都有测试锁定) |

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 给 `ApiResponse` 加可空的 `requestId` | design | common 不依赖 Jackson,成功体会出现 `requestId: null` |
| 访问日志放在拦截器里 | E1 | 拿不到异常处理之后的最终状态码和完整耗时 |
| logback 里直接写 `${WEIRAN_LOG_DIR}` | E2 | `EnvExampleTest` 看不到这两个变量;改由 `application.yml` 统一承载 |
| Dockerfile 先拷构建脚本、单独做一层依赖缓存 | E4 | `settings.gradle.kts` 按目录自动发现模块,缺目录就跑不起来;改用 BuildKit 缓存挂载 |
| Nginx 固定传 `$request_id` | E4 | 会覆盖外层网关的请求号;改为 `map`:上游传了就沿用 |
| 每条 compose 命令都带 `--env-file` | E4 | 漏带就报错;文档改为推荐 `COMPOSE_ENV_FILES` |
| `ENV TZ` 设时区 | E4 | JRE 镜像没有 tzdata;改为 `-Duser.timezone` |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `weiran4j/.dockerignore` | `E4` | 必要连带:后端镜像的构建上下文是 `weiran4j/`,根目录的 `.dockerignore` 管不到;不加的话本地 `config/*.yml`(含密钥)会进入构建上下文 | 保留 |
| `weiran4j/.env`(临时) | `E4` | 必要连带:Compose 验证需要它;已删除,且被 gitignore | 已删除 |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| `build` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿(exit=0) | `evidence/build.log` |
| `test` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿(exit=0;集成测试 8 个类 44 条;前端 27 文件 / 244 条) | `evidence/test.log` |
| `lint` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿(exit=0) | `evidence/lint.log` |

证据在全部代码改完之后产生。之后只改了 `sourcePaths` 之外的文件(本文件、`tasks.md`),`node openspec/check.mjs` 复核通过。没有红灯,不需要基线对比。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 1.1 | `E1` | `web/ErrorResponse.java`;`GlobalExceptionHandler` 五个返回类型;`ApiResponseBodyAdvice` 放行 | ☑ |
| 1.2 | `E1` | `web/RequestIdFilter.java`;`WeiranFrameworkAutoConfiguration` 中的 `FilterRegistrationBean` | ☑ |
| 1.3 | `E1` | `AuthInterceptor.USER_ID_ATTRIBUTE`;`RequestIdFilter.logAccess` | ☑ |
| 1.4 | `E1` | `GlobalExceptionHandler.handleBiz` | ☑ |
| 1.5 | `E1` | `log/MdcTaskDecorator.java` | ☑ |
| 1.6 | `E1` | 契约 §3(三行)、§4(示例与请求号段落) | ☑ |
| 2.1 | `E2` | `PlatformApplicationAutoConfiguration` 的 `setTaskDecorator` | ☑ |
| 2.2 | `E2` | `application.yml` 的 `server.shutdown`、`spring.lifecycle.timeout-per-shutdown-phase` | ☑ |
| 2.3 | `E2` | `logback-spring.xml`;`application.yml` 的 `logging.file.path`、`logging.logback.rollingpolicy.max-history` | ☑ |
| 3.1 | `E3` | `web/src/utils/request.ts`、`web/src/types/api.ts` | ☑ |
| 4.1 | `E4` | `weiran4j/.env.example` | ☑ |
| 4.2 | `E4` | `weiran4j/Dockerfile`、`web/Dockerfile`、`web/nginx.conf`、`docker-compose.yml`、`.dockerignore` ×2、根 `.gitignore` | ☑ |
| 4.3 | `E4` | `weiran4j/docs/02-部署.md`;`AGENTS.md` 三处;契约 §4 链接 | ☑ |
| 4.4 | `E4` | `artifact.md`:#09 / #10 / #11 / #18 → §7 2026-10-06 | ☑ |
| 5.1 | `E1` | `RequestIdFilterTest`(4)、`MdcTaskDecoratorTest`(2)、`WebLayerTest`(+2) | ☑ |
| 5.2 | `E2` | `ObservabilityIT`(4) | ☑ |
| 5.3 | `E2` | `EnvExampleTest` | ☑ |
| 5.4 | `E3` | `request.test.ts`(+6) | ☑ |
| 5.5 | `E4` | 见 E4 笔记「自测结果」,摘要见下 | ☑ |
| 6.1 | `E4` | `02-部署.md` §2、§7 | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 7.1 写 `artifacts.md` | 上线后动作,在 L9 签字后、归档前写 | ☑ |

### 容器验证摘要(5.5)

- 用 `docker compose build` 构建前后端镜像。前两次失败:一次是 Dockerfile 的分层设计不可用,一次是容器内访问 Maven Central 出现 TLS 中断;都已处理,第三次成功。
- `up -d` 后:
  - MySQL 进入 healthy;
  - `id -u` 为 10001,即后端以非 root 运行;
  - 经 Nginx(18080 端口)用 Cookie 模式登录 `admin/admin123`,`/me` 返回 code 0;
  - 缺少 CSRF 头的 PUT 请求返回 40302,失败体带 `requestId`,与响应头一致;
  - SPA 深链接返回 200。
- `weiran4j.log`:6 条访问日志全部匹配规定格式;日志里出现 `secret` 0 次。
- 把日志级别临时设为 DEBUG:SQL 只进 `weiran4j-sql.log`(3057 字节,带 requestId),主日志里没有 SQL。
- `stop backend`:依次出现 `Commencing graceful shutdown` 和 `Graceful shutdown complete`。
- 验证结束后执行 `down -v`,并删除临时 `.env`。

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法 CP-2 / CP-12 | 新类在框架,基座只引用装饰器 | 一致 | ☑ |
| 宪法 CP-9 | 不写密钥;访问日志不记请求体和查询值;入站 ID 白名单 | 一致(容器内实测 `secret` 出现 0 次);根 `.gitignore` 已忽略 `.env`,两份 `.dockerignore` 都排除密钥 | ☑ |
| 宪法 CP-11 | 失败体由异常处理器按错误码产生 | 一致 | ☑ |
| DS-1 契约 | 失败体、响应头、MDC 键、装饰器、环境变量 | 一致 | ☑ |
| DS-5 | 过滤器以最高优先级、`/*` 注册;logback 按 profile 分流 | 一致 | ☑ |
| DS-6 | Toast 显示前 8 位,console 输出完整值 | 一致(E3) | ☑ |
| 部署产物设计 | 后端多阶段构建、非 root;前端在根目录构建上下文中构建;Nginx 透传头;Compose 三个服务、`stop_grace_period: 40s` | 一致。另有三处实现调整,见下方「不一致项」 | ☑ |
| Data Flow 第 6 步 | 停机时先等在途请求,再等日志线程池 | 一致(`ObservabilityIT` 加容器实测) | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| admin-foundation/FR-001 成功响应的业务码是数字 0 | 成功体没有 `requestId` | `ObservabilityIT.successBodyHasNoRequestId`、`WebLayerTest.errorBodyCarriesRequestId` | ☑ |
| admin-foundation/FR-001 参数校验失败 | 40000,`requestId` 等于响应头 | `ObservabilityIT.errorBodiesCarryRequestId`(400) | ☑ |
| admin-foundation/FR-001 拦截器拒绝时的失败体也带请求号 | 40100 / 40300 带 `requestId` | 同上(401、403,外加 404) | ☑ |
| observability/FR-001 沿用合法的入站请求号 | 原样返回 | `ObservabilityIT.reusesValidInboundRequestId`、`RequestIdFilterTest`、容器经 Nginx 实测 | ☑ |
| observability/FR-001 不合法或缺失时生成新请求号 | 32 位十六进制,两次互不相同 | `RequestIdFilterTest.resolvesRequestId` | ☑ |
| observability/FR-001 请求结束后不串号 | MDC 被清理 | `RequestIdFilterTest.scopesMdcToRequest` | ☑ |
| observability/FR-002 操作日志线程带请求号 | 执行时还原,执行后恢复 | `MdcTaskDecoratorTest`(2 条) | ☑ |
| observability/FR-003 写接口的访问日志不含请求内容 | 一行 INFO,不含 `secret` | `RequestIdFilterTest.logsAccessWithoutQueryValues` + 容器日志 | ☑ |
| observability/FR-003 健康检查不出现在 INFO | DEBUG | `RequestIdFilterTest.levelsAndScope` | ☑ |
| observability/FR-004 4xx 业务异常记 WARN | WARN,无堆栈 | `WebLayerTest.logsExceptionsBySeverity` + 容器日志 | ☑ |
| observability/FR-004 未预期异常记 ERROR | ERROR,有堆栈 | 同上 | ☑ |
| observability/FR-005 容器内生成日志文件 | 格式正确且带 requestId | 容器验证(6/6 行匹配) | ☑ |
| observability/FR-006 停机配置生效 | GRACEFUL、30s、线程池等待 ≤ 30s | `ObservabilityIT.gracefulShutdownConfigured` + 容器实测 | ☑ |
| deployment/FR-001 清单与配置一致 | 变量集合相等(含 Compose 专用变量) | `EnvExampleTest` | ☑ |
| deployment/FR-002 Compose 起一套可登录的环境 | 登录后 `/me` 返回 0 | 容器验证(curl 加 cookie jar 经 Nginx) | ☑ |
| deployment/FR-002 后端以非 root 运行并优雅停机 | uid ≠ 0;出现停机日志 | 容器验证(10001;停机日志) | ☑ |
| deployment/FR-003 文档覆盖必需章节 | 规定的各项都有对应章节;AGENTS.md 与契约有链接 | 见下表 | ☑ |

**FR-003 逐项对应 `02-部署.md` 的章节**:

| 规定内容 | 所在章节 |
|---|---|
| 前置条件 | §1 |
| 环境变量 | §3 |
| Compose 启动、升级、停止 | §2 / §7 |
| HTTPS 与 `WEIRAN_COOKIE_SECURE` | §5 |
| 透传头 | §4 |
| 日志与 requestId 排障 | §6 |
| 优雅停机 | §7 |
| 修改 admin 密码 | §8 |
| 升级注意事项 | §7 |
| `X-Forwarded-For` 风险 | §6 / §9 |

链接:`AGENTS.md` 中 3 处(常用命令、仓库结构、密钥与本地配置);契约 §4 请求号段落。

**interview 验收标准**:AC-1 至 AC-15 都已被以上内容覆盖。AC-15 中「GitHub CI 全绿」要在 PR 上确认(合并前)。

## 越界检查

`git status` 的文件集对照 plan §5 的所有权:所有改动文件都属于对应单元拥有的范围;`weiran4j/.dockerignore` 已在 E4 笔记中申报(必要连带)。**没有未申报的越界**。

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | design 写的是 Nginx `proxy_set_header X-Request-Id $request_id`,实现改为 `map`(上游传了就沿用,没传才生成) | **验证中发现的缺陷,代码已修**:原写法会覆盖外层网关的请求号,与 observability/FR-001「合法的入站请求号沿用」的意图冲突;修复后意图更一致 | 已修(E4),容器内复测通过 |
| 2 | design 写的启动方式是 `--env-file`,文档改为推荐 `COMPOSE_ENV_FILES` | **表述可细化,实现合理**:两种方式都有效,推荐写法避免了后续命令漏带参数 | 已在部署文档里同时说明两种方式 |
| 3 | design 写「Dockerfile 多阶段构建」,未提时区;实现加了 `-Duser.timezone` | 实现补充,不违背设计意图 | 无需处理 |
| 4 | plan 只列了根目录的 `.dockerignore` | plan 遗漏;已作为必要连带补上 `weiran4j/.dockerignore` | 已申报 |

---

## 遗留问题

- [x] 容器构建依赖外网(Maven Central、Docker Hub)。受限网络需要配置镜像源,部署文档前置条件已写明,不登记。
- [x] 镜像构建没有接进 CI(interview「本次不决定」),不登记。
- [x] `.env.example` 头部注释仍写 `--env-file` 用法(会话权限禁止读 `.env*`,无法局部修改;该用法本身正确),不登记。
- [x] 会话过期时,每个请求都会打一行 40100 WARN(E1 笔记)。这是预期行为,不登记。

## 流程反馈

- 「整份重写 + 一致性测试」的做法,让 agent 不能读 `.env*` 的限制不再成为问题。以后改 `.env.example` 都按这个套路:按 `application.yml` 生成,由 `EnvExampleTest` 校验。

## 结论

- [x] 集成完成
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design / specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff

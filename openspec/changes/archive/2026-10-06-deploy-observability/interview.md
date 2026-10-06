---
title: "部署与可观测性(#09 / #10 / #11 / #18)"
status: "done"
updated_at: "2026-10-06"
---

# Interview

> **L0 · 消歧**。

## 一句话需求

> 用户原话,不要改写。

- 「处理 #18, #9, #10, #11, 实现第二期内容」(本 change 只承接前四项;「第二期」= 外部身份登录,用户已决定拆成下一个 change)

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 拆成几个 change | 拆两个 | 本 change `deploy-observability` 做 #09 / #10 / #11 / #18;外部身份登录(CAS + OIDC)另开 change |
| 2 | `.env.example` 怎么重写(会话权限禁止读 `.env*`) | 按配置整份重写 | 以 `application.yml` 全部 `${WEIRAN_*}` 占位符(含本 change 新增的)为准生成完整新文件,直接覆盖、不读旧文件;L9 看 diff 确认 |
| 3 | requestId 怎么返回 | 头 + 失败体 | 所有 `/api/**` 响应带 `X-Request-Id` 头;**只有失败响应**体加 `requestId` 字段;前端错误 Toast 显示它;成功响应包络 `{code, message, data}` 不变 |
| 4 | 日志输出到哪、什么格式 | 控制台 + 滚动文件 | 公司规范的文本格式 `[%d] [%contextName] [%X{requestId}] [%thread] [%level] [%logger{50}] --> %msg%n`;控制台 + 按天滚动文件(目录 `WEIRAN_LOG_DIR`);MyBatis SQL 日志单独一个文件 |
| 5 | 部署文档覆盖哪种方式 | Docker Compose | 新增后端 Dockerfile、前端 Nginx 镜像(同源反代 `/api`)、`docker-compose.yml`(含 MySQL 8);部署文档以 Compose 为主线 |

### 由 agent 判定、记录在案的技术决策

- **入站 requestId**:请求带 `X-Request-Id` 且只含 `[A-Za-z0-9_-]`、长度 ≤ 64 时沿用(便于网关 / Nginx 串联),否则生成新的 32 位十六进制 UUID;不合法的值一律丢弃,不写日志(防日志注入)。
- **requestId 的作用范围**:Servlet 过滤器,覆盖所有请求(不止 `/api/**`),最高优先级,确保拦截器、异常处理、操作日志都拿得到;请求结束时清理 MDC。操作日志的异步线程也带上发起请求的 requestId。
- **访问日志**:每个 `/api/**` 请求结束时打一行 INFO:方法、路径、状态码、业务 code(若有)、耗时 ms、userId(未登录为 `-`)、客户端 IP。**不打请求体**(写接口已有操作日志并脱敏),不打查询串里的值(只打参数名)。健康检查 `/api/health` 降为 DEBUG。
- **异常日志口径**:业务异常(`BizException`)按 HTTP 状态分级:4xx 为 WARN、不带堆栈,5xx 为 ERROR、带堆栈。(explore 修正:现状是 4xx 业务异常**完全不打日志**,只有 5xx 打 ERROR,因此本条实际是给 4xx 补上一行 WARN,而 requestId 能把它和访问日志串起来。)
- **优雅停机**:Spring Boot 3.5 默认已是 `server.shutdown=graceful`;本次显式写出 `server.shutdown: graceful` 与 `spring.lifecycle.timeout-per-shutdown-phase`(默认 30s,`WEIRAN_SHUTDOWN_TIMEOUT` 可调),并让操作日志线程池的等待时间不超过它。
- **镜像**:后端多阶段构建(JDK 21 构建 → JRE 21 运行,非 root 用户);前端多阶段构建(pnpm build → nginx);Compose 只做「单机试运行 / 预发」参考,生产的 HTTPS 终止放在外层(文档说明)。

## 边界

### 要做

- #10 日志体系:
  - requestId 过滤器(MDC + `X-Request-Id` 响应头);
  - 失败响应体 `requestId` 字段;
  - `logback-spring.xml`(控制台 + 滚动文件 + SQL 单独文件,`local` profile 只输出到控制台);
  - 访问日志;
  - 异常日志分级;
  - 操作日志异步线程传递 requestId;
  - 前端错误 Toast 显示 requestId。
- #11 优雅停机:显式配置并加测试锁定。
- #09:整份重写 `weiran4j/.env.example`。
- #18 部署:
  - `weiran4j/Dockerfile`、`web/Dockerfile` + `web/nginx.conf`、仓库根 `docker-compose.yml`(含 MySQL 8)、`.dockerignore`;
  - 部署文档 `weiran4j/docs/02-部署.md`,写明 D-014 的硬要求:同源、反代透传 `Cookie` / `Set-Cookie` / `X-CSRF-Token`、HTTPS 下 `WEIRAN_COOKIE_SECURE=true`、配置键改名、合入后旧令牌失效,以及本 change 新增的日志与停机配置。
- 契约(§3 / §4)、AGENTS.md「常用命令 / 密钥与本地配置」、state(artifact.md #09 / #10 / #11 / #18)同步。

### 明确不做

- 不处理 #03(`X-Forwarded-For` 可信代理):部署文档只提示风险,不改 `ClientIpResolver`。
- 不做外部身份登录(CAS / OIDC,下一个 change)。
- 不引入链路追踪系统(OpenTelemetry / SkyWalking)、不做指标(Micrometer / Prometheus 端点)、不做 JSON 日志。
- 不改成功响应的包络,不给 `ApiResponse`(`weiran-common`)加字段。
- 不做 K8s 清单、不做 CI 构建 / 推送镜像、不做 HTTPS 证书配置(文档说明由外层负载均衡终止)。
- 访问日志不记请求体和响应体。

### 本次不决定(留给后续 change)

- 生产环境的日志采集方案(ELK / SLS)。
- 是否把镜像构建接进 CI。

## 验收标准

- [ ] AC-1 任一 `/api/**` 响应都带 `X-Request-Id` 头。请求带合法 `X-Request-Id`(`[A-Za-z0-9_-]{1,64}`)时原样返回;带不合法值或不带时,返回新生成的 32 位小写十六进制 ID。有集成测试覆盖这三种情况。
- [ ] AC-2 失败响应体是 `{code, message, data:null, requestId}`,`requestId` 与响应头一致;成功响应体仍只有 `{code, message, data}`,**不含** `requestId` 键。覆盖 400 / 401 / 403 / 404 / 500 五类,包括拦截器抛出的 401 和 403。
- [ ] AC-3 同一请求处理过程中打出的日志都带同一个 requestId(MDC);请求结束后 MDC 被清理,同一线程处理下一个请求时不会串号。单测验证。
- [ ] AC-4 操作日志异步落库线程里打出的日志带发起请求的 requestId。单测验证。
- [ ] AC-5 每个 `/api/**` 请求结束时有一行 INFO 访问日志,包含方法、路径、状态码、耗时、userId(或 `-`)、IP,不包含请求体和查询参数的值;`/api/health` 不出现在 INFO 级别。测试用日志捕获验证。
- [ ] AC-6 `BizException` 映射出 4xx 时打 WARN、无堆栈;映射出 5xx 时打 ERROR、有堆栈;未知异常打 ERROR、有堆栈。单测验证。
- [ ] AC-7 `logback-spring.xml` 存在。默认 profile 输出到控制台和 `${WEIRAN_LOG_DIR:-logs}/weiran4j.log`(按天滚动,保留天数可配置);MyBatis Mapper 的 SQL 日志只写 `weiran4j-sql.log`,不进主日志;`local` profile 只输出到控制台;格式符合公司规范。启动验证:在 Docker Compose 里看到文件生成。
- [ ] AC-8 `application.yml` 显式包含 `server.shutdown: graceful` 与 `spring.lifecycle.timeout-per-shutdown-phase: ${WEIRAN_SHUTDOWN_TIMEOUT:30s}`;操作日志线程池的等待时间不超过该值。有测试断言这两个配置生效。
- [ ] AC-9 前端失败 Toast 在有 `requestId` 时显示「(请求号 xxxxxxxx)」,截取前 8 位,完整值记进 console;`ApiError` 带上 `requestId` 字段。vitest 覆盖。
- [ ] AC-10 `weiran4j/.env.example` 整份重写:列出 `application.yml` 中**全部** `${WEIRAN_*}` 占位符(每个附说明与默认值,必填项标注),不再出现 PHP / `pam_*` / 旧库名;有一个脚本或测试比对两边的变量集合一致。
- [ ] AC-11 Docker 产物:
  - `docker compose build` 成功;
  - `docker compose up` 后,经前端 Nginx(`http://localhost:<port>`)能用 `admin/admin123` 登录(Cookie 模式),`/api/auth/me` 返回 0;
  - 后端容器以非 root 运行;
  - `docker compose down` 时后端日志出现优雅停机。
- [ ] AC-12 `weiran4j/docs/02-部署.md` 存在,至少覆盖以下内容,并在 AGENTS.md 与契约中被引用:
  - 前置条件;
  - 环境变量表(引用 `.env.example`);
  - Compose 启动步骤、HTTPS / 外层负载均衡说明;
  - 同源与反代透传头(`Cookie` / `Set-Cookie` / `X-CSRF-Token` / `X-Request-Id` / `X-Forwarded-*`)、`WEIRAN_COOKIE_SECURE`;
  - 日志位置与 requestId 排障方法、优雅停机;
  - 首次部署后改 admin 密码;
  - 升级注意事项(D-014 令牌失效、配置键改名);
  - #03 风险提示。
- [ ] AC-13 契约 §4 写明 `X-Request-Id` 与失败体的 `requestId`;§3 登记 requestId 过滤器;`web/src/types/api.ts` 同步。
- [ ] AC-14 artifact.md 中 #09、#10、#11、#18 移入 §7 changelog(✅,注明由本 change 关闭);若有只做了一部分的,留在 §6 并标 🟡。
- [ ] AC-15 L7 三道门禁全绿,GitHub CI 全绿。

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| requestId 放哪 | 响应头 + 失败体 | 所有响应体;只放响应头 | 用户决定:成功包络不变,失败时用户截图能看到请求号 |
| 失败体字段由谁加 | `weiran-framework` 的错误响应类型 | 给 `weiran-common` 的 `ApiResponse` 加可空字段 | common 不依赖 Jackson,加字段要么成功体也出现 `requestId: null`,要么 common 引入注解;错误响应本来就只由框架的异常处理产生 |
| 入站 ID | 合法则沿用 | 总是新生成 | 能和 Nginx / 网关日志串起来;格式白名单防日志注入 |
| 日志 | 公司文本格式 + 滚动文件 | JSON | 用户决定,符合公司规范 |
| 部署 | Docker Compose | jar + systemd | 用户决定;可一键复现、可在 AC-11 里真实验证 |
| 优雅停机 | 显式配置 + 测试 | 只登记「框架默认已开」 | 默认值随 Boot 版本变化(3.4 才改),显式写出并用测试锁住 |

## 未决歧义

- 无

## 对下游的硬约束

- 契约先行:先改 `weiran4j/docs/01-架构与接口契约.md`,再改代码;`web/src/types/api.ts` 手动同步。
- 成功响应包络不得变化(FR-001 的成功场景保持原样)。
- 日志里不得出现令牌、密码、Cookie、CSRF 值(CP-9);访问日志不记查询参数的值和请求体。
- 不新增 Maven 依赖(Logback、MDC 是 Spring Boot 自带的)。如果确实需要新依赖,回 L3。
- `.env.example` 不写任何真实密钥;`docker-compose.yml` 中的密钥一律走 `.env` 变量(提供 `.env.example`),不写死。
- 本次没有 Flyway 迁移。

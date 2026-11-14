---
status: "active"
---

# observability Specification

## Purpose
本能力长期负责「线上出问题时能拿到现场」:每个请求有一个可在前后端、访问日志、异常日志、异步任务之间串联的请求号;
日志按统一格式输出并可滚动保存;异常按严重程度分级记录;发版重启时不掐断进行中的请求与审计写入。

## Requirements

### Requirement: [FR-001] 请求号

每个 HTTP 请求 **MUST** 有一个请求号,写入日志上下文(MDC 键 `requestId`),并通过响应头 `X-Request-Id` 返回。
入站请求带 `X-Request-Id` 且只含 `[A-Za-z0-9_-]`、长度 1–64 时 **MUST** 沿用它;否则 **MUST** 生成 32 位小写十六进制的新值,不合法的入站值 **MUST NOT** 进入日志。
请求结束后日志上下文 **MUST** 被清理。

#### Scenario: 沿用合法的入站请求号
- **WHEN** 带 `X-Request-Id: gw-123_abc` 调用 `GET /api-backend/n/health`
- **THEN** 响应头 `X-Request-Id` 为 `gw-123_abc`
- **判据**:集成测试断言响应头

#### Scenario: 不合法或缺失时生成新请求号
- **WHEN** 分别不带该头、带 `X-Request-Id: bad id\n` 调用 `GET /api-backend/n/health`
- **THEN** 两次响应头都是 32 位小写十六进制,且互不相同
- **判据**:集成测试用正则 `^[0-9a-f]{32}$` 断言

#### Scenario: 请求结束后不串号
- **WHEN** 同一线程先后处理两个请求
- **THEN** 第二个请求处理期间的 MDC `requestId` 是它自己的值,请求结束后 MDC 中没有 `requestId`
- **判据**:过滤器单测在 FilterChain 内外读取 `MDC.get("requestId")`

### Requirement: [FR-002] 异步任务继承请求号

由请求触发、提交到应用线程池的异步任务(目前是操作日志落库)**MUST** 在执行期间带有发起请求的 MDC。

#### Scenario: 操作日志线程带请求号
- **WHEN** 在 MDC `requestId=r1` 的线程里向经过 `MdcTaskDecorator` 装饰的执行器提交任务
- **THEN** 任务内 `MDC.get("requestId")` 为 `r1`,任务结束后该工作线程的 MDC 被恢复
- **判据**:`MdcTaskDecorator` 单测

### Requirement: [FR-003] 访问日志

每个 `/api-backend/**` 请求结束时 **MUST** 以 logger `com.wulicode.weiran.access` 打一行 INFO 日志,包含方法、路径(不含查询串)、HTTP 状态码、耗时毫秒数、userId(未登录为 `-`)、客户端 IP。
**MUST NOT** 包含请求体、响应体或查询参数的值。`/api-backend/n/health` **MUST** 降为 DEBUG。

#### Scenario: 写接口的访问日志不含请求内容
- **WHEN** 已登录用户调用 `PUT /api-backend/auth/profile?x=secret`,请求体含昵称
- **THEN** 产生一行 INFO,含 `PUT /api-backend/auth/profile 200`、耗时、userId、IP;不含 `secret` 与请求体
- **判据**:集成测试或过滤器单测捕获 `com.wulicode.weiran.access` 日志并断言

#### Scenario: 健康检查不出现在 INFO
- **WHEN** 调用 `GET /api-backend/n/health`
- **THEN** `com.wulicode.weiran.access` 没有 INFO 级别记录
- **判据**:同上,断言 INFO 事件数为 0

### Requirement: [FR-004] 异常日志分级

异常处理 **MUST** 按严重程度记日志:映射为 4xx 的业务异常记 WARN,不带堆栈;映射为 5xx 的业务异常、未预期异常、框架内部 5xx 记 ERROR,带堆栈。日志 **MUST NOT** 包含请求体、令牌或密码。

#### Scenario: 4xx 业务异常记 WARN
- **WHEN** 一个接口抛出 `BizException(CONFLICT)`
- **THEN** 有一条 WARN,含错误码与提示语,没有异常堆栈
- **判据**:框架单测捕获 `GlobalExceptionHandler` 日志事件,断言级别为 WARN 且 `throwableProxy` 为空

#### Scenario: 未预期异常记 ERROR
- **WHEN** 一个接口抛出 `IllegalStateException`
- **THEN** 有一条 ERROR 且带堆栈;响应 message 不暴露异常细节
- **判据**:同上,断言级别为 ERROR 且 `throwableProxy` 非空

### Requirement: [FR-005] 日志输出

默认 profile 下应用日志 **MUST**:
- 同时输出到控制台和 `${WEIRAN_LOG_DIR}/weiran4j.log`;
- 按天滚动,保留天数由 `WEIRAN_LOG_MAX_HISTORY` 配置;
- 格式为 `[%d] [%contextName] [%X{requestId}] [%thread] [%level] [%logger{50}] --> %msg%n`。

MyBatis Mapper 的 SQL 日志 **MUST** 只写入 `weiran4j-sql.log`。`local` 与 `test` profile **MUST** 只输出到控制台。

#### Scenario: 容器内生成日志文件
- **WHEN** 用 Docker Compose 启动后端并发出一次请求
- **THEN** 日志卷里有 `weiran4j.log`,其中的行符合规定格式且带 requestId
- **判据**:`docker compose exec` 读取文件,用正则断言行格式

### Requirement: [FR-006] 优雅停机

应用 **MUST** 显式配置 `server.shutdown=graceful` 与 `spring.lifecycle.timeout-per-shutdown-phase`(默认 30s,`WEIRAN_SHUTDOWN_TIMEOUT` 可调)。
操作日志线程池在关闭时 **MUST** 等待已提交的任务完成,等待时长 **MUST NOT** 超过停机阶段超时。

#### Scenario: 停机配置生效
- **WHEN** 启动应用上下文
- **THEN** `server.shutdown` 解析为 `GRACEFUL`,`spring.lifecycle.timeout-per-shutdown-phase` 解析为 30 秒;操作日志线程池的等待时长不超过 30 秒
- **判据**:集成测试读取 `Environment` / `ServerProperties` / `LifecycleProperties` 断言,并检查线程池配置

### Requirement: [FR-007] 可信客户端 IP

客户端 IP 解析 **MUST** 以直接连接对端为信任起点，仅在对端命中显式配置的可信代理 IP/CIDR 时读取转发头；默认可信列表为空，**MUST NOT** 隐式信任 loopback 或私网。访问日志、登录日志、操作日志与短信 IP 限流 **MUST** 使用同一解析结果。

可信代理提交的单个 X-Forwarded-For 头 **MUST** 按从右向左的顺序剥离可信地址，并在第一个不可信地址停止；若全部地址可信则取最左地址。仅在 XFF 完全缺失时，**MUST** 允许可信对端提交单个合法 X-Real-IP。解析 **MUST** 仅接受 IPv4/IPv6 字面量，不解析 DNS；等价 IPv6 和 IPv4-mapped IPv6 **MUST** 归一为一致键值。地址列表 **MUST NOT** 接受端口、方括号、zone id 或主机名。

转发头超过 4096 字符、超过 32 跳、出现重复同名头，或者参与判定的地址为空/非法时，解析 **MUST** 退回直接对端，**MUST NOT** 改读较弱的头。到达第一个不可信地址后，其左侧声明 **MUST NOT** 影响结果。非法可信代理配置 **MUST** 阻止启动；应用 **MUST** 禁止容器或 Spring 在该策略之前根据转发头改写对端地址。

#### Scenario: 默认忽略伪造头
- **WHEN** 同一不可信对端携带任意 XFF、X-Real-IP 或 Forwarded
- **THEN** 解析 IP 始终为规范化后的直接对端，短信 IP 桶保持相同
- **判据**:参数化单测断言解析结果；短信回归以不同手机号隔离手机号限额并变更伪造头，断言仍触发同一 IP 限额

#### Scenario: 可信代理链定位
- **WHEN** 对端 10.0.0.2、可信范围 10.0.0.0/24，XFF 为 192.0.2.66, 203.0.113.7, 10.0.0.3
- **THEN** 结果为 203.0.113.7，忽略最左伪造声明
- **判据**:策略单测覆盖此链、全部可信链、单层链及 IPv6 CIDR

#### Scenario: 地址表示一致
- **WHEN** 同一地址分别以压缩/展开 IPv6 或 IPv4/IPv4-mapped IPv6 输入
- **THEN** 同一地址的输出与可信范围匹配结果一致
- **判据**:参数化单测比较输出和 CIDR 匹配，包括 IPv4 /0 /32 与 IPv6 /0 /128 边界

#### Scenario: 非法与超限输入安全回退
- **WHEN** 可信对端提交参与判定的非法地址、空项、重复头、超长或超过跳数上限的 XFF，或提交空 XFF 加合法 X-Real-IP
- **THEN** 返回直接对端，不降级信任 X-Real-IP
- **判据**:参数化测试断言回退；另测 XFF 缺失时合法单值 X-Real-IP 可用

#### Scenario: 配置与容器边界检查
- **WHEN** 配置非法 IP/CIDR，或启用 native/framework 转发处理，或注册 ForwardedHeaderFilter
- **THEN** 应用上下文启动失败并提示配置冲突
- **判据**:上下文测试验证失败原因；默认配置正常启动

#### Scenario: 消费者口径一致
- **WHEN** 一个可信代理请求进入登录/短信端点或带操作日志的写接口
- **THEN** 过滤器缓存的解析 IP 被相应日志和登录上下文原样消费
- **判据**:真实 HTTP/集成测试捕获访问日志、查询登录与操作日志记录，断言 IP；短信场景验证共用上下文与限流行为

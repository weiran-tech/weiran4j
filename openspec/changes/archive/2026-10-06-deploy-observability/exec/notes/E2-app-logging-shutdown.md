# E2: app-logging-shutdown

## 完成的 tasks.md 条目

- `2.1` 操作日志线程池 `MdcTaskDecorator`
- `2.2` 优雅停机配置
- `2.3` `logback-spring.xml`
- `5.2` `ObservabilityIT`(4 条)
- `5.3` `EnvExampleTest`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-base-application/.../platform/application/autoconfigure/PlatformApplicationAutoConfiguration.java` | 改造 | `setTaskDecorator(new MdcTaskDecorator())`;注释写明等待 10s ≤ 停机阶段 30s |
| `weiran-app/src/main/resources/application.yml` | 改造 | `spring.lifecycle.timeout-per-shutdown-phase: ${WEIRAN_SHUTDOWN_TIMEOUT:30s}`、`server.shutdown: graceful`、`logging.file.path: ${WEIRAN_LOG_DIR:logs}`、`logging.logback.rollingpolicy.max-history: ${WEIRAN_LOG_MAX_HISTORY:30}` |
| `weiran-app/src/main/resources/logback-spring.xml` | 新增 | `local \| test` 只输出到控制台;其它 profile 为控制台 + FILE + SQL_FILE(Mapper 包 `additivity=false`) |
| `weiran-app/src/test/.../ObservabilityIT.java` | 新增 | 400 / 401 / 403 / 404 的失败体 requestId 与响应头一致;成功体没有 requestId;入站 ID 沿用 / 重新生成;停机配置值与线程池等待时长 |
| `weiran-app/src/test/.../EnvExampleTest.java` | 新增 | 两边变量集合比对;Compose 专用变量 `WEIRAN_WEB_PORT` 显式登记 |

## 为什么这么做

- 日志目录与保留天数走 `application.yml`(`logging.file.path` / `logging.logback.rollingpolicy.max-history`),`logback-spring.xml` 用 `<springProperty>` 读取:环境变量只有一个来源,`EnvExampleTest` 也能覆盖到。放弃的方案是在 logback 里直接写 `${WEIRAN_LOG_DIR}`:那样一致性测试就看不到这两个变量了。
- SQL 日志按 Mapper 包名分流:MyBatis 以 Mapper 接口全名作为 logger 名。
- 线程池等待时长用反射读取(`ReflectionTestUtils`):线程池由记录器自己持有,不是 Bean(原有设计,刻意不注册成 `Executor` Bean)。

## 依赖的契约

- plan §4:失败体、`X-Request-Id`、MDC 键、`MdcTaskDecorator`、环境变量。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- [ ] `logback-spring.xml` 的文件输出在 `local` / `test` profile 下不生效,所以只能靠 E4 的容器验证来证明(AC-7)。

## 自测结果

- `./gradlew :weiran-app:test --tests EnvExampleTest --tests ObservabilityIT`:5 条全部通过(第一次编译时 NullAway 报 `requestIdHeader` 返回可空值,改为 `Objects.requireNonNull` 后通过)
- `./gradlew :weiran-base-application:check`:通过

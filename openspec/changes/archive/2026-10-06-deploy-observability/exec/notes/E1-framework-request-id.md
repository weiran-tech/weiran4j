# E1: framework-request-id

## 完成的 tasks.md 条目

- `1.1` `ErrorResponse` + `GlobalExceptionHandler` / `ApiResponseBodyAdvice`
- `1.2` `RequestIdFilter` + 自动配置注册
- `1.3` `AuthInterceptor.USER_ID_ATTRIBUTE` + 访问日志
- `1.4` 异常日志分级
- `1.5` `MdcTaskDecorator`
- `1.6` 契约 §3 / §4
- `5.1` framework 单测

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-framework/.../web/ErrorResponse.java` | 新增 | `record(code, message, data, requestId)`,`of(ErrorCode, String)` 从 MDC 读请求号,缺失时为 `-` |
| `weiran-framework/.../web/RequestIdFilter.java` | 新增 | 白名单 `[A-Za-z0-9_-]{1,64}`;进入链路前设置响应头;finally 中打访问日志并 `MDC.remove` |
| `weiran-framework/.../log/MdcTaskDecorator.java` | 新增 | 提交时拷贝 MDC,执行时还原,执行后恢复工作线程原先的 MDC |
| `weiran-framework/.../web/GlobalExceptionHandler.java` | 改造 | 五个返回类型改为 `ResponseEntity<ErrorResponse>`;4xx 业务异常记 WARN 无堆栈 |
| `weiran-framework/.../web/ApiResponseBodyAdvice.java` | 改造 | 放行 `ErrorResponse` |
| `weiran-framework/.../auth/AuthInterceptor.java` | 改造 | 认证成功时写 `USER_ID_ATTRIBUTE` 请求属性 |
| `weiran-framework/.../autoconfigure/WeiranFrameworkAutoConfiguration.java` | 改造 | `FilterRegistrationBean<RequestIdFilter>`,`HIGHEST_PRECEDENCE`,`/*` |
| `weiran-framework/src/test/.../web/RequestIdFilterTest.java`、`.../log/MdcTaskDecoratorTest.java` | 新增 | 见 5.1 |
| `weiran-framework/src/test/.../web/WebLayerTest.java` | 改造 | MockMvc 挂上过滤器;新增失败体 requestId 与日志分级两个用例 |
| `weiran4j/docs/01-架构与接口契约.md` | 改造 | §3 登记三个组件;§4 统一响应示例与请求号约定 |

## 为什么这么做

- `ErrorResponse` 放在框架而不是给 `ApiResponse` 加字段:common 不依赖 Jackson,加可空字段会让成功体也出现 `requestId: null`。
- 响应头在 `chain.doFilter` 之前设置:响应一旦提交就加不上头了,出错路径也同样适用。
- 访问日志放在过滤器而不是拦截器:要拿到最终状态码和完整耗时(包括异常处理);userId 通过请求属性传递,因为 `CurrentUser` 在拦截器的 afterCompletion 里就已经清掉了。
- 放弃的方案:用 `HandlerInterceptor` 打访问日志(拿不到异常处理之后的状态码);对每个失败 Controller 单独处理(容易漏)。

## 依赖的契约

- 本单元是 plan §4 的定义方。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- [ ] 未登录请求的 401 现在也会打一行 WARN(业务异常 40100),会话过期时每个请求一行。量不大,并且有请求号可以聚合;嫌多的话可以把 `GlobalExceptionHandler` 的 logger 调成 ERROR。

## 自测结果

- `./gradlew spotlessApply :weiran-framework:check --no-daemon -q`:通过(第一次即通过)

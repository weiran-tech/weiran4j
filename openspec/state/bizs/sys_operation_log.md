# sys_operation_log 操作日志

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `weiran4j/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`OperationLogController.java`](../../../weiran4j/weiran-platform/weiran-platform-adapter/src/main/java/com/weiran/platform/adapter/web/OperationLogController.java)、
> [`OperationLogApplicationService.java`](../../../weiran4j/weiran-platform/weiran-platform-application/src/main/java/com/weiran/platform/application/operationlog/OperationLogApplicationService.java) /
> [`AsyncOperationLogRecorder.java`](../../../weiran4j/weiran-platform/weiran-platform-application/src/main/java/com/weiran/platform/application/operationlog/AsyncOperationLogRecorder.java)、
> [`MybatisOperationLogRepository.java`](../../../weiran4j/weiran-platform/weiran-platform-infrastructure/src/main/java/com/weiran/platform/infrastructure/persistence/MybatisOperationLogRepository.java)、
> [`OperationLog.java`](../../../weiran4j/weiran-framework/src/main/java/com/weiran/framework/log/OperationLog.java) /
> [`OperationLogAspect.java`](../../../weiran4j/weiran-framework/src/main/java/com/weiran/framework/log/OperationLogAspect.java) /
> [`SensitiveDataMasker.java`](../../../weiran4j/weiran-framework/src/main/java/com/weiran/framework/log/SensitiveDataMasker.java) /
> [`ClientIpResolver.java`](../../../weiran4j/weiran-framework/src/main/java/com/weiran/framework/web/ClientIpResolver.java)、
> [`V202609260101__platform_init_schema.sql`](../../../weiran4j/weiran-platform/weiran-platform-infrastructure/src/main/resources/db/migration/platform/V202609260101__platform_init_schema.sql)、
> [`OperationLogsPage.tsx`](../../../web/src/pages/logs/OperationLogsPage.tsx)（页面与内嵌 `OperationLogDetail`）、
> [`hooks/queries/logs.ts`](../../../web/src/hooks/queries/logs.ts)、[`types/api.ts`](../../../web/src/types/api.ts)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_operation_log`（只追加，无更新 / 删除） |
| 菜单 | 日志审计 › 操作日志（`sys_menu.id = 11`） |
| 路由 | `/logs/operation` |
| 页面组件 | `logs/OperationLogsPage`（详情侧滑 `OperationLogDetail`） |
| 后端模块 | 写入：`weiran-framework` 的 `OperationLogAspect` → SPI `OperationLogRecorder` → `weiran-platform` 的 `AsyncOperationLogRecorder`；查询：`OperationLogController` → `OperationLogApplicationService` |
| 接口 | `GET /api/operation-logs`、`GET /api/operation-logs/{id}`（只读） |
| 权限码 | `system:operation-log:list`（列表与详情共用；种子里没有对应按钮节点） |

## 1. 列表

接口 `GET /api/operation-logs`，**按 `id` 倒序**；无排序参数。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 操作人 | `username` | 空值 `—` |
| 2 | 模块 | `module` | 原值 |
| 3 | 描述 | `description` | 原值 |
| 4 | 请求 | `method` + `path` | 方法 `Tag` + 路径 |
| 5 | 结果 | `success` | `StatusTag`（布尔 → 成功 / 失败） |
| 6 | 耗时 | `duration_ms` | `N ms` |
| 7 | IP | `ip` | 空值 `—` |
| 8 | 时间 | `created_at` | 原值 |
| 9 | 操作 | — | 「详情」，恒显示（无额外权限码） |

列表接口也返回 `requestBody`、`responseCode`、`errorMessage`、`userAgent`，但列表未展示，详情侧滑展示。

**筛选项**（「查询」生效，「重置」清空）：

| 控件 | 参数 | 后端口径 |
| --- | --- | --- |
| 输入框「操作人」 | `username` | `LIKE` 模糊 |
| 输入框「模块」 | `module` | `LIKE` 模糊 |
| 下拉「结果」 | `success` | 前端传 `true/false` 字符串，后端按 `Boolean` 绑定后等值 |
| `DatePicker type=dateTimeRange` | `startTime` / `endTime` | 格式 `yyyy-MM-dd HH:mm:ss`；两端含 |

**分页**：`page` 默认 1、`pageSize` 默认 20（上限 200）；前端可切换条数、显示总数。

**详情侧滑**（宽 640，`GET /api/operation-logs/{id}`，不存在 40400）：操作人、模块、描述、请求、结果、响应码、耗时、IP、
User-Agent、时间、错误信息（有才显示）；请求体是 JSON 时格式化展示，否则原样，空显示「（无）」。

## 2. 字段与表单

本模块无表单。记录由切面采集，各列来源如下。

| 列 | 类型 | 来源 |
| --- | --- | --- |
| `user_id` / `username` | `bigint null` / `varchar(64) null` | 方法执行**前**取的 `CurrentUser`；未登录为空；用户名截断到 64 |
| `module` / `description` | `varchar(64)` / `varchar(128)` | `@OperationLog(module, description)`，按列宽截断 |
| `method` / `path` | `varchar(16)` / `varchar(256)` | `request.getMethod()` / `request.getRequestURI()`（不含查询串），截断 |
| `request_body` | `varchar(4096) null` | 标了 `@RequestBody` 的参数重新序列化为 JSON 后脱敏，截断到 4096（超长以 `...` 结尾）；无请求体为 `NULL` |
| `response_code` | `int` | 成功 0；`BizException` 取其错误码；其它异常 50000 |
| `success` | `tinyint(1)` | 是否未抛异常 |
| `error_message` | `varchar(512) null` | `BizException` 的 message（截断到 512）；其它异常固定为通用 500 文案，不暴露堆栈 |
| `duration_ms` | `bigint` | 方法执行耗时 |
| `ip` | `varchar(64)` | `ClientIpResolver`（同登录日志） |
| `user_agent` | `varchar(512)` | 请求头，截断到 512 |
| `created_at` | `datetime` | 请求**开始**时间 |

**脱敏规则**（`SensitiveDataMasker`）：字段名（忽略大小写）包含 `password`，或等于 `token` / `accesstoken` /
`refreshtoken` / `secret` / `apikey` / `authorization` 时值替换为 `******`，递归处理嵌套对象与数组。

## 3. 动作

页面本身只有查询与详情。产生记录的是所有标了 `@OperationLog` 的 Controller 方法：

| 模块（`module`） | 记录的操作（`description`） |
| --- | --- |
| 用户管理 | 新增用户、修改用户、删除用户、重置密码 |
| 角色管理 | 新增角色、修改角色、删除角色、分配菜单 |
| 菜单管理 | 新增菜单、修改菜单、删除菜单 |
| 部门管理 | 新增部门、修改部门、删除部门 |
| 字典管理 | 新增字典、修改字典、删除字典、新增字典项、修改字典项、删除字典项 |
| 系统配置 | 新增配置、修改配置、删除配置 |
| 个人中心 | 修改个人资料、修改密码 |

**不产生记录**的情况：登录 / 登出（只写登录日志）；`@Valid` 参数校验失败（发生在方法调用之前）；
拦截器层的 401 / 403（未进入 Controller 方法）；全部查询接口。

**写入方式**：切面组装事件后交给 `AsyncOperationLogRecorder`，提交到本类持有的独立线程池异步落库；线程池满或写库失败
只记 `warn` 并丢弃该条，不影响业务请求结果。容器关闭时按线程池配置等待已提交任务写完。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`、`StatusTag`
- 工具函数（非组件）：`utils/date.ts` 的 `toTimeRange`

## 5. 说明与建议

- **IP 可被伪造**：与登录日志同一 `ClientIpResolver`，优先信任 `X-Forwarded-For`；该跨表问题登记在 `artifact.md#03`。
- **成功与否以「是否抛异常」为准**：Controller 正常返回即记成功，`response_code=0`。
- 详情接口与列表接口共用 `system:operation-log:list`，能看列表就能看请求体（已脱敏）。
- 建议：为本表规划保留期或归档任务（#01）；在契约里写清哪些写操作不进操作日志（#02）。

## 6. 已知问题汇总

- **#01 🚧 P3 无保留期与清理机制，表只增不减**
  后端只有 `append`、按 ID 查询与分页查询，没有删除接口、定时清理或归档；每次后台写操作新增一行，`request_body` 最长 4096。
- **#02 ❓ P3 契约 §6「写操作均带 @OperationLog」与代码不符**
  契约 §6 开头写「写操作均带 `@OperationLog`」。代码中 `POST /api/auth/login`、`POST /api/auth/logout` 不带该注解
  （`AuthController` 类注释：只写登录日志，不重复记操作日志）；此外 `@Valid` 校验失败与 401 / 403 拒绝的写请求也不会产生记录。
  以代码为准，契约需补记例外。
- **#03 ⚠️ P3 异步写入在线程池满或写库失败时丢弃日志**
  `AsyncOperationLogRecorder.record` 捕获 `RejectedExecutionException`、`append` 捕获 `RuntimeException`，都只记 `warn`。
  设计上「审计日志丢一条，不能让业务请求失败」（类注释），属知情接受；后果是操作日志不保证完整。
- **#04 🔴 P3 前端 `OperationLogView` 类型注释已过期**
  `web/src/types/api.ts` 注释写「契约 §6.9 未逐字段列出，按 §5 sys_operation_log 列的 camelCase 形式」，但契约 §6.9 已逐字段列出
  `OperationLogView`；类型里 `requestBody` 标为可选、`ip` / `userAgent` 标为可空，而后端 `ip` / `userAgent` 恒为非空字符串。
  不影响运行，只是注释与可空性口径不准。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-09-26**
- **#05 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_operation_log` 的列表、采集口径与已知问题。

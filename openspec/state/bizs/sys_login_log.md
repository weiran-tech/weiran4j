# sys_login_log 登录日志

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 契约文档 `packages/server/docs/01-架构与接口契约.md` 只作索引；它与代码不一致的地方以代码为准写在下文，并在 §6 登记。
>
> 事实源：
> [`LoginLogController.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/LoginLogController.java)、
> [`AuthController.java`](../../../packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/packages/manage/AuthController.java)（写入入口）、
> [`AuthApplicationService.java`](../../../packages/server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/auth/AuthApplicationService.java)（`login` / `logout` / `appendLog`）、
> [`LoginLogApplicationService.java`](../../../packages/server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/loginlog/LoginLogApplicationService.java)、
> [`LoginLog.java`](../../../packages/server/weiran-system/weiran-system-domain/src/main/java/com/wulicode/weiran/system/domain/loginlog/LoginLog.java)、
> [`MybatisLoginLogRepository.java`](../../../packages/server/weiran-system/weiran-system-infrastructure/src/main/java/com/wulicode/weiran/system/infrastructure/persistence/MybatisLoginLogRepository.java)、
> [`ClientIpResolver.java`](../../../packages/server/weiran-framework/src/main/java/com/wulicode/weiran/framework/packages/manage/ClientIpResolver.java) /
> [`UserAgentParser.java`](../../../packages/server/weiran-framework/src/main/java/com/wulicode/weiran/framework/packages/manage/UserAgentParser.java)、
> [`V202609260001__system_init_schema.sql`](../../../packages/server/weiran-system/weiran-system-infrastructure/src/main/resources/db/migration/system/V202609260001__system_init_schema.sql)、
> [`LoginLogsPage.tsx`](../../../packages/manage/src/pages/logs/LoginLogsPage.tsx)、[`hooks/queries/logs.ts`](../../../packages/manage/src/hooks/queries/logs.ts)、
> [`utils/date.ts`](../../../packages/manage/src/utils/date.ts)。
>
> 盘点基线：`e23c511`（2026-09-26，D-008 框架重写后的首次盘点）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_login_log`（只追加，无更新 / 删除） |
| 菜单 | 日志审计 › 登录日志（`sys_menu.id = 10`） |
| 路由 | `/logs/login` |
| 页面组件 | `logs/LoginLogsPage` |
| 后端模块 | `weiran-system`；查询 `LoginLogController` → `LoginLogApplicationService`；写入在 `AuthApplicationService`（含本地验证码发码） |
| 接口 | `GET /api/login-logs`（只读） |
| 权限码 | `system:login-log:list`（种子里没有对应的按钮节点，本页只读） |

## 1. 列表

接口 `GET /api/login-logs`，**按 `id` 倒序**；无排序参数。

| # | 列表列 | 来源 | 渲染 |
| --- | --- | --- | --- |
| 1 | 用户名 | `username`（登录时提交的用户名，不一定是真实存在的用户） | 原值 |
| 2 | 事件 | `event_type` | 登录（蓝）/ 登出（灰）/ 验证码（橙）`Tag` |
| 3 | 结果 | `status` | `StatusTag`（成功绿 / 失败红） |
| 4 | IP | `ip` | 空值 `—` |
| 5 | 浏览器 | `browser` | 空值 `—` |
| 6 | 操作系统 | `os` | 空值 `—` |
| 7 | 信息 | `message` | 单行省略；悬停提示显示完整 message，本地验证码明文可在此查看 |
| 8 | 时间 | `created_at` | 原值 |

`userId` 接口返回但未展示。无详情接口、无行操作。

**筛选项**（「查询」生效，「重置」清空）：

| 控件 | 参数 | 后端口径 |
| --- | --- | --- |
| 输入框「用户名」 | `username` | `LIKE` 模糊（已转义通配符） |
| 下拉「事件」 | `eventType` | 等值 `login` / `logout` / `sms_code`；传其它值不报错，只是查不到 |
| 下拉「结果」 | `status` | 等值 `success` / `fail`；同上 |
| `DatePicker type=dateTimeRange` | `startTime` / `endTime` | 格式 `yyyy-MM-dd HH:mm:ss`；`created_at >= startTime` 且 `<= endTime`（两端含） |

**分页**：`page` 默认 1、`pageSize` 默认 20（上限 200）；前端可切换条数、显示总数。

## 2. 字段与表单

本模块无表单。记录由认证流程写入，各列来源如下。

| 列 | 类型 | 写入来源 |
| --- | --- | --- |
| `user_id` | `bigint null` | 用户名存在时为该用户 ID；用户名不存在的失败登录为 `NULL` |
| `username` | `varchar(64)` | 请求体提交的用户名（去首尾空白，截断到 64） |
| `ip` | `varchar(64)` 默认 `''` | `ClientIpResolver`：`X-Forwarded-For` 第一个 → `X-Real-IP` → `remoteAddr`，截断到 64 |
| `user_agent` | `varchar(512)` 默认 `''` | 请求头 `User-Agent`，截断到 512 |
| `browser` / `os` | `varchar(64)` 默认 `''` | `UserAgentParser` 解析结果，截断到 64 |
| `event_type` | `varchar(16)` | `login` / `logout` / `sms_code` |
| `status` | `varchar(16)` | `success` / `fail` |
| `message` | `varchar(256)` 默认 `''` | 登录、登出的结果说明；`local` 发码成功时为 `local 模式登录验证码：<6 位明文>，手机号：<脱敏手机号>` |
| `created_at` | `datetime` | 应用时钟 `LocalDateTime.now(clock)` |

## 3. 动作

页面本身只有查询。产生记录的动作在认证接口上：

| 触发 | 接口 | 权限 | `@OperationLog` | 写入的记录 |
| --- | --- | --- | --- | --- |
| 登录成功 | 密码登录、外部身份回调或手机二次验证完成 | 免登录 | 否 | `login / success`；启用多因素认证时须完成短信验证后才写成功记录，并定向更新 `sys_user.last_login_at/ip` |
| 用户名不存在或密码错误 | 同上 | 免登录 | 否 | `login / fail`「用户名或密码错误」；两种情况同一错误码 110101、同一文案，用户名不存在时仍空跑一次 BCrypt 以抹平耗时差 |
| 账号已禁用 | 同上 | 免登录 | 否 | `login / fail`「账号已禁用」；返回 110103 |
| 登出 | `POST /api/auth/logout` | 仅登录 | 否 | `logout / success`「登出成功」 |
| 本地验证码发送成功 | `POST /api-backend/n/system/auth/sendPhoneCode` | 免登录 | 否 | `sms_code / success`，记录关联用户、客户端信息及明文验证码；非 `local` 模式不写该事件 |
| 查询 | `GET /api/login-logs` | `system:login-log:list` | 否 | — |

`login` 刻意不开事务：失败分支先写日志再抛异常，日志不会随异常回滚。写入是同步的。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`（`conditions` / `onRefresh`）、`StatusTag`
- 工具函数（非组件）：`utils/date.ts` 的 `toTimeRange`（时间范围 → `startTime/endTime`）

## 5. 说明与建议

- 列表区分加载、首次失败、缓存刷新失败和成功空态；重试保留当前筛选与分页，无匹配结果可清空条件回第一页。

- **IP 可被伪造**：`ClientIpResolver` 优先信任 `X-Forwarded-For`，未校验来源代理，客户端可自填；该问题跨登录日志与操作日志，
  登记在 `artifact.md#03`。本表 `ip` 只宜作展示，不能用于访问控制或审计取证。
- **用户名列是提交值**：失败登录会原样记录攻击者提交的任意字符串（≤64 字符）。
- 登录 / 登出只写本表，**不写**操作日志（`AuthController` 的类注释明示）。
- 本地验证码发送成功后也写本表，且 `message` 有明文验证码；此模式只应在受控开发环境启用，登录日志查询权限仅授给联调人员。记录在验证码过期后仍会保留，直到按保留/归档策略清理。
- 手机二次验证的待验证状态不会写登录成功记录；验证码通过并交付会话时才记录成功。
- 建议：为本表规划保留期或归档任务（#01）。

## 6. 已知问题汇总

- **#01 🚧 P3 无保留期与清理机制，表只增不减**
  后端只提供 `append` 与分页查询，没有删除接口、定时清理或归档；每次登录 / 登出（含失败登录）都新增一行。
  长期运行后表体积持续增长，按 `created_at`、`username` 的查询依赖现有索引。

## 7. changelog

**2026-11-14**

- **#04 ✅ P2 列表读取失败缺少持续错误态**
  原症状：`LoginLogsPage` 只消费 `data/isFetching`，首次请求失败后 `data?.list ?? []` 呈现为空表格，用户无法持续区分读取失败与成功空结果；缓存刷新失败时也缺少旧数据提示。建议复用 `ListFeedback` 和仅在查询成功时显示的空态。原审查于 2026-11-14 静态确认，未进行浏览器故障注入。
  由 `complete-admin-form-and-read-recovery` 解决；登录日志列表已提供持续失败反馈、缓存保留与原参数重试。


新条目插在本节最上方（按日期倒序，新在上）。

**2026-10-24**
- 本地模式手机号验证码发送成功后追加 `sms_code` 记录，登录日志页面可筛选事件并查看明文验证码。

**2026-09-27**
- **#03 ✅ P3 登录日志列表按 `rules/advisory/list-view.md` 约定改造**
  加刷新按钮与「已选条件」（用户名、事件 / 结果名称、时间范围）；清空日期选择器不再留下空的时间条件。

**2026-09-26**
- **#02 ✅ P? D-008 框架重写时建立本文件**
  按 `e23c511` 的代码首次盘点 `sys_login_log` 的列表、写入来源与已知问题。

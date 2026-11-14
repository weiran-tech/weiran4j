# 测试工作流

根 `tests/` 管理 Playwright API/E2E、Bruno 请求及流程执行器。执行器迁自 kr-alang-mono4j 的 tests/，已按本项目的数字错误码、HttpOnly Cookie、CSRF 和授权快照适配。包内 Vitest 与后端 Gradle/Testcontainers 测试继续保留。

## 安装与离线检查

测试工作流使用 **Node 24**，依赖由仓库根 pnpm 和唯一锁文件管理。

```bash
pnpm install --frozen-lockfile
pnpm test:flows:check
pnpm test:flows list
pnpm test:integration:list
```

`test:flows:check` 校验流程声明、共享步骤、TypeScript、Playwright 用例发现、Bruno 语法，并运行框架与系统步骤离线回归。无需真实账号、业务服务或下载浏览器；部分框架回归会创建并关闭隔离的本地合成 HTTP 服务。

CI 使用独立 Node 24 job 执行这项检查。原前端 `pnpm test` 和后端 `./gradlew check` 的职责不变。

## 浏览器框架回归

```bash
pnpm exec playwright install chromium
pnpm test:flows:browser
```

此命令使用真实 Chromium 和随机本地端口的合成服务，验证会话、执行器、严格报告和系统流程接线。它不访问真实业务账号，**不能替代真实业务通过记录**；合成服务和浏览器在结束时关闭。

## 运行真实流程

纯 API 流程只需操作者启动 `pnpm dev:server`；浏览器流程还需启动 `pnpm dev:web`，准备本项目独立数据库及本地配置。测试不会自动启停已有服务。

默认 API 为 `http://localhost:5200`，后台为 `http://localhost:5202`。地址来自 `tests/envs/local.json`，支持 CLI 的 `--api-base-url` / `--web-base-url` 和 `TEST_API_BASE_URL` / `TEST_WEB_BASE_URL` 覆盖。Cookie 复用要求同一 hostname，不要混用 localhost 和 127.0.0.1。

```bash
pnpm test:flows:doctor --env local
pnpm test:flows run system/health --env local
pnpm test:flows run system/access-boundary --env local
pnpm test:flows run system/login-entry --env local --headless
pnpm test:flows:smoke
```

存活检查验证 `/api-backend/n/health` 返回 HTTP 200、数字 `code=0` 和 `status=UP`。该接口**不检查数据库、缓存或第三方依赖健康**。

认证流程仅使用操作者明确提供的专用密码测试账号，不自动采用种子密码，不修改操作者账号或密码。业务写入流程会在显式允许后创建并清理独立的临时账号/资源。环境必须满足密码登录前提；短信/MFA/SSO 另行编写流程。

```bash
mkdir -p tests/.local
# 创建 tests/.local/admin.json，填写专用测试账号的 username、password。
chmod 600 tests/.local/admin.json
pnpm test:flows run system/admin-session --env local
pnpm test:flows run system/admin-browser --env local --headless
```

凭据也可通过进程环境 `FLOW_ADMIN_USERNAME`、`FLOW_ADMIN_PASSWORD` 或显式 `FLOW_ADMIN_PASSWORD_FILE` 提供。不要将实际密码写在可被记录的命令行参数中。

## 会话与清理

```bash
pnpm test:flows session login --env local --role admin
pnpm test:flows session check --env local --role admin
pnpm test:flows session clear --env local --role admin
pnpm test:flows session recover --env local --role admin
```

`session login --manual` 可打开独立的人工登录窗口。缓存保存在被忽略、权限受限的 `tests/.local/`，复用前同时核对环境、角色、两端地址、有效期和远端主体；原始 Cookie 不进普通报告。

清理调用正常 logout、确认 Cookie 被清除和匿名访问重新被拒，再删除对应本地缓存。当前产品的普通登出**不会吊销旧 JWT**，测试不宣称旧 JWT 立即失效，也不会改密、禁用账号或递增 token_version 来满足断言。旧 JWT 仍按产品 TTL 到期。

清理失败会使流程失败，并保留私有恢复材料；服务恢复后运行 `session recover`。真实登录/退出产生的审计日志保留，不把退出会话称为业务数据回滚。

## 报告与范围

执行器为选择生成批次摘要，为实际执行项生成独立 runId。结果、报告和附件位于被忽略的 `tests/.artifacts/`；首次验证与后续复核分别保存。skipped、flaky、断言降级、空跑或证据缺失均不能通过。

当前登记 **15 条流程**：原有 7 条基础流程，加 8 条业务 API 流程（11 条 Playwright API、2 条 E2E、2 条 Bruno）。核心用户/角色/菜单/字典/配置 CRUD 和一个受限角色授权生命周期已有流程；完整角色矩阵、短信/MFA/SSO、媒体/文件/批处理、地区写入与导出尚未覆盖。真实业务通过仅以明确环境的实际报告为准。

完整操作和编写规范位于仓库 `tests/docs/running.md`、`tests/docs/writing-flows.md`；实际覆盖和验证边界见 `tests/docs/coverage.md`。


## 核心业务 API 测试

| 流程 ID | 覆盖 |
|---|---|
| system/core-read | 用户/角色/菜单/字典/配置/登录日志/操作日志的列表、详情和响应形状；分页边界与非法参数 |
| system/user-lifecycle | 创建、检索、修改、重复用户名、陈旧版本拒绝与删除复查 |
| system/role-lifecycle | 普通角色资料/菜单授权的共享版本冲突，有关联用户时拒绝删除 |
| system/menu-lifecycle | 临时禁用目录、父子关系、陈旧版本、防环和非叶删除保护 |
| system/dict-lifecycle | 字典/项 CRUD、重复值、排序、只取启用项、级联删除 |
| system/config-lifecycle | 临时分组/配置 CRUD、非空分组保护、自定义配置拒绝匿名读取；内置公开标题仅读 |
| system/permission-boundary | 临时用户/角色，允许用户读取、拒绝角色读取、同一会话撤权后403和修订变化 |
| region/read | 公开树、后台树/平铺数组/详情、登录 lookup 与匿名管理拒绝 |

无需 Chromium 即可运行这些 API 流程。所有流程使用数字 code、隔离 Cookie/CSRF 和脱敏状态证据；不保存整条用户、配置或审计响应。正常空数据允许通过，读取失败不能伪装空列表。

```bash
# 不依赖真实业务环境的协议装配；运行真实CLI/Playwright并创建隔离合成HTTP服务。
pnpm test:api:synthetic

# 真实只读流程：先配置专用管理账号与实际API地址。
pnpm test:flows run system/core-read --env local
pnpm test:flows run region/read --env local

# 写入显式允许。首次登录或业务写入前检查开关，缺失/false都失败。
FLOW_ALLOW_WRITE=true pnpm test:flows run system/user-lifecycle --env local
FLOW_ALLOW_WRITE=true pnpm test:flows run --tag api-business --env local
# 全部API（含原有健康/认证）
FLOW_ALLOW_WRITE=true pnpm test:api
```

业务资源使用本次随机唯一标记，仅经现有 API 创建普通用户/角色、禁用菜单目录、字典/项、配置/分组。权限流程只在临时角色中引用既有权限定义，绝不改内置角色或操作者授权。审计日志保留。

写前把创建意图记入 `tests/.local/api-resources/<env>/<资源runId>.json`（0600），完成后逆序核验身份/父级并删除、复查；创建响应不确定时不重发 POST。清理失败或进程中断可能留下私有清单，后续用恢复入口精确处理：

```bash
FLOW_ALLOW_WRITE=true pnpm test:api:cleanup --env local --run-id <24位资源runId>
```

这里是错误消息/清单文件中的 **24 位资源 runId**，与 CLI 报告的运行编号不同。恢复重新验证专用管理员及目标环境，按固定资源类型和清单身份清理；错误地址/主体、内置资源、ID或父级不符、损坏/权限过宽清单都会失败并保留材料，不进行前缀批删。该命令不重放创建、不修改密码、不删除审计。普通 `session recover` 只处理会话材料，不能代替业务资源清理。

合成验证包含8条业务流程、扩充后的匿名矩阵、写前提拒绝、实际清理失败与恢复入口、普通产物凭据扫描；它不证明真实数据库/部署环境通过。没有专用凭据时，真实业务用例记录未运行。

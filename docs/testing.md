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

先由操作者分别启动 `pnpm dev:server`、`pnpm dev:web`，准备本项目独立数据库及本地配置。测试不会自动启停已有服务。

默认 API 为 `http://localhost:5200`，后台为 `http://localhost:5202`。地址来自 `tests/envs/local.json`，支持 CLI 的 `--api-base-url` / `--web-base-url` 和 `TEST_API_BASE_URL` / `TEST_WEB_BASE_URL` 覆盖。Cookie 复用要求同一 hostname，不要混用 localhost 和 127.0.0.1。

```bash
pnpm test:flows:doctor --env local
pnpm test:flows run system/health --env local
pnpm test:flows run system/access-boundary --env local
pnpm test:flows run system/login-entry --env local --headless
pnpm test:flows:smoke
```

存活检查验证 `/api-backend/n/health` 返回 HTTP 200、数字 `code=0` 和 `status=UP`。该接口**不检查数据库、缓存或第三方依赖健康**。

认证流程仅使用操作者明确提供的专用密码测试账号，不自动采用种子密码，也不创建或改密账号。环境必须满足密码登录前提；短信/MFA/SSO 另行编写流程。

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

首批登记 7 条系统流程：5 条 Playwright（存活、匿名鉴权、登录入口、API 会话、浏览器会话），2 条 Bruno（存活、匿名鉴权）。当前不覆盖合同/返利/STS，也不代表全部角色权限矩阵、短信/MFA/SSO 或业务 CRUD 已验证。

完整操作和编写规范位于仓库 `tests/docs/running.md`、`tests/docs/writing-flows.md`；实际覆盖和验证边界见 `tests/docs/coverage.md`。

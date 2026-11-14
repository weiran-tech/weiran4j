# 运行指南

使用 Node 24，在仓库根运行 `pnpm test:flows --help` 查看实际入口。依赖由根 pnpm 安装，tests/ 不创建独立 package.json、锁文件或 node_modules。

## 选择与执行

```bash
pnpm test:flows list --json
pnpm test:flows show system/health
pnpm test:flows check --deep
pnpm test:flows doctor --env local
pnpm test:flows run system/health --env local
pnpm test:flows run --tag smoke --env local
pnpm test:flows run system/admin-browser --env local --headless
pnpm test:flows run system/health --env local --dry-run
```

CLI 提供 runner/project/tag/step/portal 等筛选。dry-run 不执行，不能算通过。原生 Playwright 只用来 `--list`，运行通过统一 CLI 才能生成完整批次和严格复核。

默认 API localhost:5200、后台 localhost:5202；`--api-base-url`、`--web-base-url` 优先于 TEST_API_BASE_URL / TEST_WEB_BASE_URL，再优先于 tests/envs/local.json。无独立 Actuator 地址。其他环境需增加 envs/<name>.json 并在所需流程的 envs 中登记。地址不能含凭据、query 或 fragment。

真实服务由操作者启动；doctor 只探测服务和工具，不启动它们。健康接口只表示存活。认证流程必须明确提供专用账号，不能用当前项目的种子密码默认登录，也不读取任何源项目的私有文件。

## 认证

本地凭据放 tests/.local/<role>.json，字段为 username、password，权限必须是 0600。admin 可使用 FLOW_ADMIN_USERNAME、FLOW_ADMIN_PASSWORD、FLOW_ADMIN_PASSWORD_FILE。秘密不能传入可被记录的命令行参数。

```bash
pnpm test:flows session login --env local --role admin
pnpm test:flows session login --manual --env local --role admin
pnpm test:flows session check --env local --role admin
pnpm test:flows session clear --env local --role admin
pnpm test:flows session recover --env local --role admin
```

人工登录使用独立非持久窗口，不读取个人浏览器 profile。会话保存 HttpOnly Cookie storageState，不使用 localStorage 主体或 Bearer/Wuli3 头。缓存同时绑定环境、角色、API/web 地址、过期时间和远端身份；Cookie 复用要求相同 hostname。

普通复用型用例可通过 run 的 `--role` 使用经过核验的缓存。system/admin-session 和 system/admin-browser 用来验证登录本身，创建自己的上下文，运行前需清理同角色缓存；不要把登录验证用例当成长期保活操作。借用的缓存不由业务 fixture 擅自撤销。

清理成功表示 Cookie 和对应本地缓存已清除、匿名请求被拒；**不代表旧 JWT 被吊销**。产品普通登出不递增 token_version。测试不改密、禁用用户或变更吊销版本。失败清理保留私有恢复记录，服务恢复后 recover；登录/退出日志不会被删除。

## 证据、复核与恢复

```bash
pnpm test:flows history
pnpm test:flows stats
pnpm test:flows verify <runId>
pnpm test:flows report <runId> --dry-run
pnpm test:flows feedback <flowId> --verdict useful --run-id <runId>
```

首次执行记录在 tests/.artifacts/，后续 verify 写独立复核文件，不覆盖原始结论。跳过、flaky、数量不符、断言降级、空跑、损坏或缺失附件均失败。取消/超时也会产生明确失败记录并回收执行器的子进程组。

认证过程禁用自动 trace/video/失败截图，敏感输入失败只给固定错误；可显式保存挑选的非敏感页面及白名单状态。不得保存密码、Cookie、token、请求认证头或完整 storageState 作为普通附件。缓存与恢复文件在 tests/.local/，普通产物在 tests/.artifacts/，二者均忽略。

`pnpm test:flows:browser` 仅访问其隔离的随机端口合成服务，结束时关闭所有资源。它证明框架接线，不证明真实业务服务可用。[覆盖边界](coverage.md) 中必须分别记录三类结果。

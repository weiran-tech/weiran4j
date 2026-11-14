## MODIFIED Requirements

### Requirement: [FR-002] 容器化部署

仓库 **MUST** 提供可直接使用的容器化部署产物:
- 后端镜像:以非 root 用户运行 JRE 21;
- 前端镜像:Nginx 提供静态文件,并把 `/api-backend/` 同源反代到后端,透传 `Cookie`、`Set-Cookie`、`X-CSRF-Token`、`X-Request-Id`，默认作为边缘代理时以 `$remote_addr` 覆盖 `X-Forwarded-For` 与 `X-Real-IP`、清除访客 `Forwarded`，并设置 `X-Forwarded-Proto`;
- `docker-compose.yml`:编排 MySQL 8、后端、前端,密钥一律来自 `server/.env`,不写死。

#### Scenario: Compose 起一套可登录的环境
- **WHEN** 准备好 `server/.env` 后执行 `docker compose --env-file server/.env up -d --build`
- **THEN** 经前端端口用浏览器 Cookie 模式登录 `admin/admin123` 成功,随后 `GET /api-backend/auth/me` 返回 `code 0`
- **判据**:用 `curl` 加 cookie jar 经前端端口走「登录 → `/me`」,断言 `code` 为 0,并记录在 verify

#### Scenario: 后端以非 root 运行并优雅停机
- **WHEN** 执行 `docker compose exec backend id -u`,再执行 `docker compose stop backend`
- **THEN** uid 不为 0;后端日志出现 `Commencing graceful shutdown`
- **判据**:命令输出与容器日志,记录在 verify

### Requirement: [FR-003] 部署文档

`server/docs/02-部署.md` **MUST** 覆盖以下内容:
- 前置条件;
- 环境变量(引用 `.env.example`);
- Compose 启动、升级、停止步骤;
- HTTPS 由外层终止,以及 `WEIRAN_COOKIE_SECURE`;
- 同源与反代必须透传的请求头;
- 日志位置与按 requestId 排障;
- 优雅停机;
- 首次部署后修改 admin 密码;
- 升级注意事项(配置键改名、旧令牌失效);
- 可信代理参数 `WEIRAN_TRUSTED_PROXIES`（默认空列表）、IP/CIDR 格式与最小信任范围；
- 直连、单层 Nginx、多层可信负载均衡代理的可复制示例与输入/解析结果表；
- `server.forward-headers-strategy=none`，禁止启用先行改写 peer 的过滤器/容器组件；
- 外层 Nginx 仅通过 `set_real_ip_from` 信任实际上游，使用 `real_ip_recursive on` 后再覆盖转发头；
- 发布前验证实际后端连接对端、转发头伪造不能换 IP、未配信任时限流桶退化为代理地址的风险。

`AGENTS.md` 与契约 **MUST** 链接到它。

#### Scenario: 文档覆盖必需章节
- **WHEN** 检查 `02-部署.md`
- **THEN** 上述每一项都有对应小节或段落
- **判据**:verify 中逐项列出所在章节标题;`grep -n "02-部署.md" AGENTS.md server/docs/01-架构与接口契约.md` 都有匹配

#### Scenario: 可信代理部署示例
- **WHEN** 按文档分别配置直连、单层代理和具有指定可信上游的多层代理
- **THEN** 合法链解析为预期地址，不可信直连伪造头仍解析为直接对端
- **判据**:文档含三类输入/结果示例；对应 HTTP 回归与 Nginx 配置检查的证据记录在 verify

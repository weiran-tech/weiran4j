## Purpose

本能力长期负责「只依赖仓库里的产物就能部署一套可用环境」:环境变量清单与应用配置保持一致,容器镜像可构建、可运行,
前端与后端经同源反向代理对外,部署文档覆盖首次部署、升级与排障所需的全部约束。

## ADDED Requirements

### Requirement: [FR-001] 环境变量清单一致

`weiran4j/.env.example` **MUST** 列出 `weiran-app` 的 `application.yml` 中出现的全部 `${WEIRAN_*}` 占位符,每一项都附说明;除此之外只允许出现 Compose 专用变量(目前只有 `WEIRAN_WEB_PORT`,在一致性测试里显式登记)。**MUST NOT** 包含任何真实密钥。

#### Scenario: 清单与配置一致
- **WHEN** 运行一致性测试
- **THEN** `.env.example` 中声明的变量名集合,等于 `application.yml` 中 `${WEIRAN_*}` 占位符的变量名集合加上登记过的 Compose 专用变量
- **判据**:`weiran-app` 的 JUnit 测试比对两个集合,不一致时列出差集并失败

### Requirement: [FR-002] 容器化部署

仓库 **MUST** 提供可直接使用的容器化部署产物:
- 后端镜像:以非 root 用户运行 JRE 21;
- 前端镜像:Nginx 提供静态文件,并把 `/api/` 同源反代到后端,透传 `Cookie`、`Set-Cookie`、`X-CSRF-Token`、`X-Request-Id`、`X-Forwarded-*`;
- `docker-compose.yml`:编排 MySQL 8、后端、前端,密钥一律来自 `weiran4j/.env`,不写死。

#### Scenario: Compose 起一套可登录的环境
- **WHEN** 准备好 `weiran4j/.env` 后执行 `docker compose --env-file weiran4j/.env up -d --build`
- **THEN** 经前端端口用浏览器 Cookie 模式登录 `admin/admin123` 成功,随后 `GET /api/auth/me` 返回 `code 0`
- **判据**:用 `curl` 加 cookie jar 经前端端口走「登录 → `/me`」,断言 `code` 为 0,并记录在 verify

#### Scenario: 后端以非 root 运行并优雅停机
- **WHEN** 执行 `docker compose exec backend id -u`,再执行 `docker compose stop backend`
- **THEN** uid 不为 0;后端日志出现 `Commencing graceful shutdown`
- **判据**:命令输出与容器日志,记录在 verify

### Requirement: [FR-003] 部署文档

`weiran4j/docs/02-部署.md` **MUST** 覆盖以下内容:
- 前置条件;
- 环境变量(引用 `.env.example`);
- Compose 启动、升级、停止步骤;
- HTTPS 由外层终止,以及 `WEIRAN_COOKIE_SECURE`;
- 同源与反代必须透传的请求头;
- 日志位置与按 requestId 排障;
- 优雅停机;
- 首次部署后修改 admin 密码;
- 升级注意事项(配置键改名、旧令牌失效);
- `X-Forwarded-For` 可伪造的风险提示。

`AGENTS.md` 与契约 **MUST** 链接到它。

#### Scenario: 文档覆盖必需章节
- **WHEN** 检查 `02-部署.md`
- **THEN** 上述每一项都有对应小节或段落
- **判据**:verify 中逐项列出所在章节标题;`grep -n "02-部署.md" AGENTS.md weiran4j/docs/01-架构与接口契约.md` 都有匹配

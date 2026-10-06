# E4: deploy

## 完成的 tasks.md 条目

- `4.1` 整份重写 `.env.example`
- `4.2` Dockerfile / nginx / Compose / dockerignore / gitignore
- `4.3` `02-部署.md` + AGENTS.md / 契约链接
- `4.4` artifact.md #09 / #10 / #11 / #18
- `5.5` 容器验证
- `6.1` 发布说明

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/.env.example` | 重写 | 不读旧文件,直接覆盖(用户决定);13 个 `application.yml` 占位符 + `WEIRAN_WEB_PORT` |
| `weiran4j/Dockerfile` | 新增 | 多阶段构建;BuildKit 缓存挂载 `/root/.gradle`;运行用户 uid 10001;`-Duser.timezone=Asia/Shanghai` |
| `weiran4j/.dockerignore` | 新增(计划外,见越界) | 后端镜像的构建上下文是 `weiran4j/`,根目录的 `.dockerignore` 管不到它 |
| `web/Dockerfile`、`web/nginx.conf` | 新增 | pnpm 工作区构建;Nginx 同源反代,`map` 优先沿用上游的 `X-Request-Id` |
| `docker-compose.yml`、`.dockerignore`、`.gitignore`(根) | 新增 / 改造 | 三个服务,密钥来自 `weiran4j/.env`;根目录补忽略 `.env` |
| `weiran4j/docs/02-部署.md` | 新增 | 10 节 |
| `AGENTS.md` | 改造 | 常用命令、仓库结构、密钥与本地配置三处链接到部署文档 |
| `openspec/state/bizs/artifact.md` | 改造 | 四条 ✅ 移入 §7 |

## 为什么这么做

- **Dockerfile 一开始想先拷构建脚本、单独做一层依赖缓存**:失败了。`settings.gradle.kts` 按目录自动发现模块(D-012),缺少模块目录就跑不起来。改为整份拷贝,依赖缓存改用 BuildKit 缓存挂载。
- **Nginx 原设计是 `X-Request-Id $request_id`**:容器验证发现它会覆盖外层网关传来的请求号。改为 `map`:上游传了就沿用,没传才生成(verify 记为验证中发现的问题)。
- **文档原写法是每条命令都带 `--env-file`**:容器验证发现 `docker compose ps/logs/exec` 漏带就报变量缺失。改为推荐 `export COMPOSE_ENV_FILES=weiran4j/.env`。
- **`ENV TZ=Asia/Shanghai` 改为 JVM 参数 `-Duser.timezone`**:JRE 镜像没有 tzdata,`TZ` 不一定生效。本次实测宿主机正好也是同一时区,两种写法看不出差别,改为不依赖系统 tzdata 的写法。
- **`.env.example` 头部仍写 `--env-file`**:会话权限禁止读 `.env*`,不能做局部修改。这种写法本身仍然正确,与部署文档推荐的 `COMPOSE_ENV_FILES` 并不冲突。

## 依赖的契约

- plan §4:`X-Request-Id`、访问日志 logger、环境变量清单。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 是否可能影响其他单元 |
|---|---|---|---|
| `weiran4j/.dockerignore` | 不加的话本地 `build/`、`config/*.yml`(含本地密钥)会被拷进后端构建上下文 | 必要连带(plan 只写了根 `.dockerignore`,没考虑到后端用独立的构建上下文) | 否 |
| `weiran4j/.env`(临时,已删除) | 验证 Compose 必须有它;内容由 `.env.example` 生成,密钥是随机值,`WEIRAN_COOKIE_SECURE=false` | 必要连带,验证结束后已删除(gitignore) | 否 |

## 埋的坑 / 遗留

- [ ] 第一次构建时,容器内访问 Maven Central 出现 TLS 握手中断(宿主机走代理),重试一次成功。网络受限的环境可能需要配置 Gradle 镜像源,部署文档的前置条件里已写明需要外网。
- [ ] 镜像构建没有接进 CI(interview「本次不决定」)。

## 自测结果

| 步骤 | 结果 |
|---|---|
| `docker compose build` | 第一次失败:依赖层设计不可用;第二次失败:网络中断;第三次成功(后端 BUILD SUCCESSFUL in 1m14s) |
| `up -d` | mysql healthy;经 Nginx 访问 health 返回 200(约 9s) |
| `exec backend id -u` | 10001 |
| 经 Nginx 登录(curl 加 cookie jar) | 响应体 `{tokenType, expiresIn, userId}`,下发两个 Cookie,属性正确;`/me` 返回 code 0 |
| 失败请求(缺 CSRF) | `40302` 且带 `requestId`,与响应头一致 |
| 入站 `X-Request-Id: verify-abc_1` | 改用 map 后原样返回;不带时为 32 位十六进制 |
| SPA 深链接 `/system/users` | 200 text/html |
| `weiran4j.log` 格式 | 6 条访问日志全部匹配规定格式;WARN 带 requestId;`secret` 出现 0 次 |
| SQL 分离(临时 `WEIRAN_LOG_LEVEL=DEBUG`) | `weiran4j-sql.log` 3057 字节,带 requestId;主日志里 `Preparing` 出现 0 次 |
| `stop backend` | `Commencing graceful shutdown` → `Graceful shutdown complete` → HikariPool 关闭 |
| 清理 | `down -v`;删除临时 `.env`;没有残留卷 |

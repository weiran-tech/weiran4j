# deploy-observability · 验收摘要

**做了什么**:关掉 `artifact.md` 的 #09 / #10 / #11 / #18。
- 请求号(`X-Request-Id`、失败体 `requestId`、错误提示显示前 8 位);
- 访问日志 `com.weiran.access`;
- 异常日志分级;
- `logback-spring.xml`(控制台 + 按天滚动文件,SQL 单独一个文件);
- 异步操作日志带请求号;
- 显式配置优雅停机;
- `.env.example` 整份重写,并由 `EnvExampleTest` 守住;
- Docker Compose 部署(后端 / 前端镜像、Nginx 同源反代、MySQL 8);
- 部署手册 `weiran4j/docs/02-部署.md`。

逐条核对与结论见 `exec/verify.md`。

**运行时 / 手工验证**(verify.md 只记了结论,这里记操作):
- 临时生成 `weiran4j/.env`:随机密钥,`WEIRAN_COOKIE_SECURE=false`,`WEIRAN_WEB_PORT=18080`。依次执行 `docker compose build`、`docker compose up -d`。
- 用 `curl` 加 cookie jar 经 `http://localhost:18080` 验证:
  - 登录 → `/me` 正常;
  - 缺少 CSRF 头的写请求返回 40302,失败体带 `requestId`;
  - 带入站 `X-Request-Id` 的请求原样回显;
  - SPA 深链接返回 200。
- 在容器内检查:`id -u` 为 10001;`/app/logs/weiran4j.log` 用正则校验行格式。
- 临时把 `.env` 里的 `WEIRAN_LOG_LEVEL` 改为 DEBUG:SQL 只进 `weiran4j-sql.log`。
- `docker compose stop backend`:出现优雅停机日志。
- 最后执行 `docker compose down -v`,并删除临时 `.env`。

**验证中改掉的问题**:
- Nginx 原先会用自己的请求号覆盖外层网关传来的,已改为上游有就沿用;
- `docker compose ps`、`logs`、`exec` 漏带 `--env-file` 时会报错,文档改为推荐 `COMPOSE_ENV_FILES`;
- 后端 Dockerfile 的「单独依赖层」写法与模块自动发现冲突,改用 BuildKit 缓存挂载。

**已知缺口**:
- 镜像构建依赖外网(Maven Central / Docker Hub);受限网络需要自行配置镜像源;
- 镜像构建没有接进 CI;
- `artifact.md#03`(`X-Forwarded-For` 可伪造,访问日志的 IP 同样受影响)。

**交给使用者的注意事项**:
- 部署照 `weiran4j/docs/02-部署.md` 做:先 `export COMPOSE_ENV_FILES=weiran4j/.env`,再执行 compose 命令。
- 生产保持 `WEIRAN_COOKIE_SECURE=true` 并走 HTTPS;首次部署后立刻修改 `admin` 的密码。
- 用户报障时让对方提供错误提示里的「请求号」,在 `weiran4j.log` 里检索。
- 以后新增 `${WEIRAN_*}` 配置项,必须同步 `weiran4j/.env.example`,否则 `check` 失败。

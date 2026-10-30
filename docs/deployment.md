# 部署与运维

本页提供 Docker Compose 部署、配置、日志采集和排障步骤。跨接口规则见[接口与数据约定](/contracts)，本地开发见[使用指南](/usage)。具体 HTTP 路径和字段以运行中的 [OpenAPI 文档](/openapi) 为准。

## 1. 前置条件

- Docker 24+、Docker Compose v2（`docker compose version`）。
- 使用阿里云 SLS 采集 Docker 日志时，部署机须为运行 Docker Engine 的 Linux 主机，能访问同地域 SLS 接入地址；采集器版本须兼容宿主机 Docker API（见 §6a）。
- 部署机能访问 Docker Hub，拉取 `eclipse-temurin:21-jdk/jre`、`node:22-alpine`、`nginx:1.27-alpine`、`mysql:8.4`。
- 生产环境要有一个对外提供 **HTTPS** 的入口（云负载均衡 / 网关 / 外层 Nginx），由它终止 TLS 后转发到本 Compose 的前端端口。

## 2. 快速开始（Docker Compose）

将[环境变量模板](/environment)保存为 `server/.env` 并填写必填项。拿到仓库源码时，也可直接从 `server/.env.example` 复制：

```bash
# 仓库根目录
cp server/.env.example server/.env
#   必填：WEIRAN_DB_PASSWORD、WEIRAN_JWT_SECRET（openssl rand -base64 48）
#   只用 http 访问（本机试运行）时：WEIRAN_COOKIE_SECURE=false
export COMPOSE_ENV_FILES=server/.env   # 之后的 docker compose 命令都读这份变量（Compose v2.24+）
docker compose up -d --build
docker compose ps        # mysql 变成 healthy、backend 与 web 为 running
```

> 每个 `docker compose` 命令都需要读到 `server/.env`（MySQL 密码、前端端口要做变量替换），
> 所以要么像上面一样设置 `COMPOSE_ENV_FILES`，要么每条命令都带上 `--env-file server/.env`。
> 否则会报 `required variable WEIRAN_DB_PASSWORD is missing a value`。

需要通过 YAML 配置 Docker 后端时，profile 名由 `.env` 中的 `SPRING_PROFILES_ACTIVE` 指定。完整示例见[环境变量与配置模板](/environment)。以 `prod` 为例，复制配置样例并启用 profile：

```bash
cp server/config/application-prod.yml.example server/config/application-prod.yml
# 在 server/.env 中设置 SPRING_PROFILES_ACTIVE=prod
```

Compose 会只读挂载 `server/config/`，Spring 根据 `SPRING_PROFILES_ACTIVE` 加载对应的 `application-<profile>.yml`；不设置时只使用应用默认配置。密钥继续保存在 `.env`，YAML 用 `${WEIRAN_DB_PASSWORD}` 等占位符引用，避免重复维护。

打开 `http://<主机>:${WEIRAN_WEB_PORT}`（默认 5202），用 `admin` / `admin123` 登录，**然后立刻按 §8 改掉默认密码**。

Compose 起三个服务：

| 服务 | 镜像 | 说明 |
| --- | --- | --- |
| `mysql` | `mysql:8.4` | 库 `weiran4j`，root 密码取自 `WEIRAN_DB_PASSWORD`；数据在卷 `mysql-data`。首次启动由后端的 Flyway 建表并写入种子数据 |
| `backend` | 由 `server/Dockerfile` 构建 | JRE 21，以 uid 10001 的非 root 用户运行；只在容器网络内暴露 5200；日志在卷 `backend-logs`（容器内 `/app/logs`） |
| `web` | 由 `backend/Dockerfile` 构建 | Nginx：提供前端静态文件，并把 `/api-backend/` 同源反代到 `backend:5200`；对外端口 `WEIRAN_WEB_PORT` |

`backend`、`web`、`mysql` 的控制台日志使用 Docker `json-file` 驱动，每个容器最多保留 5 个 10 MB 文件；容器标签 `com.wulicode.weiran.sls.service` 分别为 `backend`、`web`、`mysql`，供 SLS 精确筛选。后端的 `/app/logs` 卷仍按应用自身的滚动策略保留日志。

> `.env` 与 `config/*.yml` 都被 gitignore，并被 `.dockerignore` 排除在镜像之外；密钥不进仓库或镜像。Compose 会将 `server/config/` 只读挂载到容器 `/app/config/`，由 `.env` 的 `SPRING_PROFILES_ACTIVE` 选择加载 `application-<profile>.yml`。可复制 `server/config/application-prod.yml.example` 作为样例；在 YAML 中引用 `${WEIRAN_DB_PASSWORD}`、`${WEIRAN_JWT_SECRET}` 等 `.env` 变量，避免重复维护。
> 只想用已有的 MySQL：去掉 `mysql` 服务，在 `.env` 里把 `WEIRAN_DB_URL` 指向它，并删掉 `docker-compose.yml` 中 `backend.environment` 对 `WEIRAN_DB_URL` 的覆盖。

## 3. 环境变量

完整变量清单和可复制模板见[环境变量与配置模板](/environment)；下面列出部署时最常用的选项。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `WEIRAN_DB_PASSWORD` | ✅ | 数据库密码（Compose 下同时是 MySQL root 密码） |
| `WEIRAN_JWT_SECRET` | ✅ | ≥ 32 字节，缺失或过短时后端启动失败；**更换它会让所有已登录用户掉线** |
| `WEIRAN_COOKIE_SECURE` | — | 默认 `true`。**只有在通过 http 访问时**才设为 `false`，否则浏览器不保存认证 Cookie，表现为「登录成功后马上又回到登录页」 |
| `WEIRAN_LOG_LEVEL` / `WEIRAN_LOG_DIR` / `WEIRAN_LOG_MAX_HISTORY` | — | 见 §6 |
| `WEIRAN_SHUTDOWN_TIMEOUT` | — | 见 §7 |
| `WEIRAN_STORAGE_MODE` | — | 资源库存储模式：`disabled` 默认拒绝上传，`local` 仅供开发/测试，`aliyun` 使用阿里云 OSS |
| `WEIRAN_STORAGE_LOCAL_*` | — | `local` 模式的本地根目录与访问前缀 |
| `WEIRAN_STORAGE_ALIYUN_*` | `aliyun` 模式必填 | Endpoint、Bucket、RAM 子账号凭据与公网访问前缀；凭据只放环境变量 |
| `WEIRAN_SMS_MODE` | — | 短信发送模式：`disabled` 默认；`local` 记录替换变量后的短信正文与参数用于受控开发/测试联调；`aliyun` 调用阿里云 |
| `WEIRAN_SMS_ALIYUN_ACCESS_KEY_ID`、`WEIRAN_SMS_ALIYUN_ACCESS_KEY_SECRET` | `aliyun` 模式必填 | 阿里云短信 RAM 子账号凭据；凭据只放环境变量，建议仅授予 SendSms 权限。签名与验证码模板在「短信配置」页面维护 |
| 其余 | — | 数据库地址与账号、端口、令牌有效期、令牌签发方 / 受众、前端端口 |

启用阿里云短信前，先在阿里云短信服务创建并审核签名与模板，再为应用创建最小权限 RAM AccessKey。设置 `WEIRAN_SMS_MODE=aliyun` 并注入 `WEIRAN_SMS_ALIYUN_*` 后重启应用；在「短信配置」页面填写阿里云签名与验证码模板 CODE。SDK 单次调用不自动重试。短信参数由业务模块通过 `SmsService` 传入，短信验证码生命周期和频率限制由业务模块负责；system 不提供公网发送接口。AccessKey 不要写入仓库或日志。

本地开发可将 `WEIRAN_SMS_MODE=local`，并在「短信配置」将 `sms.system_tpl.captcha_local` 设为包含 `${code}` 的正文，例如 `你的验证码是 ${code} , 5 分钟有效, 请不要告知他人`。发送调用会替换占位符，把实际短信正文和参数写入应用日志、返回 `LOGGED`，不会调用短信服务；手机号登录发码成功后还会在「登录日志」产生「验证码」事件，其信息列显示明文验证码，可按事件筛选。模板参数可能含验证码或个人信息，此模式仅用于受控开发/测试环境；应限制应用日志和登录日志的访问与保留时间。生产环境使用 `disabled` 或 `aliyun`。

## 4. 同源与反向代理（D-014 的硬要求）

前端页面与 `/api-backend` **必须同源**：认证 Cookie 是 `SameSite=Strict`，后端不提供 CORS。`VITE_API_BASE_URL` 写成 `http(s)://` 绝对地址时，前端构建会直接失败。

自带的 `backend/nginx.conf` 已满足下面的要求。如果在它前面再加一层代理，或者改用自己的网关，**每一层都要**：

- 把 `/api-backend/`（包含 `/api-backend/n/`）转发到后端，保持同一个域名和端口对外；
- **原样透传**这些头，**不要**用 `proxy_hide_header` 之类的配置剥掉：
  - `Cookie`、`Set-Cookie`：认证；
  - `X-CSRF-Token`：Cookie 认证的写请求必须带，被剥掉会得到 403 / `100103`；
  - `X-Request-Id`：请求号，见 §6；
- 设置 `X-Forwarded-For`、`X-Forwarded-Proto`。
- 视频上传配置允许最大 1024 MB；外层代理的请求体限制须大于 1024 MB，并为上传临时文件预留足够磁盘空间。自带 Nginx 限制为 `1030m`，后端 multipart 单文件限制为 `1024MB`、请求限制为 `1025MB`。

## 5. HTTPS 与 Cookie

- TLS 由外层终止，Compose 内部走 http。外层要设置 `X-Forwarded-Proto: https`。
- 生产必须保持 `WEIRAN_COOKIE_SECURE=true`（默认值）：HTTPS 下浏览器才会携带带 `Secure` 的 Cookie。
- 认证 Cookie 是 `weiran_token`（HttpOnly，`Path=/api-backend`）和 `weiran_csrf`（`Path=/`），有效期等于 `WEIRAN_JWT_TTL`。

## 5a. 外部身份提供方（CAS / OIDC，D-015）

不配置任何提供方时，行为与只有密码登录时完全一样。接入步骤：

1. **确定对外地址**：设置 `WEIRAN_PUBLIC_BASE_URL`，即浏览器地址栏里的协议、域名和端口，例如 `https://admin.example.com`。回调地址和登出回跳地址都用它拼，后端**不会**根据请求头推断。
2. **在提供方处登记**（`<id>` 为下面配置的提供方 id）：

   | 协议 | 要登记的地址 |
   | --- | --- |
   | OIDC | 重定向 URI `<WEIRAN_PUBLIC_BASE_URL>/api-backend/n/system/auth/callbackSso/<id>`；登出后重定向 URI `<WEIRAN_PUBLIC_BASE_URL>/login`；客户端类型为机密（confidential），启用授权码流程，PKCE 用 S256 |
   | CAS | 服务（service）白名单允许 `<WEIRAN_PUBLIC_BASE_URL>/api-backend/n/system/auth/callbackSso/<id>?state=*`；需要支持 CAS 3.0 的 `/p3/serviceValidate` 和 `format=JSON` |

3. **配置环境变量**（`<ID>` 为 id 的大写形式，id 只能用小写字母、数字和横线）：

   | 变量 | OIDC | CAS | 说明 |
   | --- | --- | --- | --- |
   | `WEIRAN_AUTH_PROVIDERS_<ID>_TYPE` | `oidc` | `cas` | 必填 |
   | `…_NAME` | ✓ | ✓ | 登录页按钮上显示的名称 |
   | `…_ISSUER` | 必填 | — | 例如 `https://sso.example.com/realms/xx`；各端点从它的 `/.well-known/openid-configuration` 获取 |
   | `…_CLIENT_ID` / `…_CLIENT_SECRET` | 必填 / 机密客户端必填 | — | 密钥只写进 `.env` |
   | `…_SERVER_URL` | — | 必填 | 例如 `https://cas.example.com/cas` |
   | `…_AUTO_PROVISION` | ✓ | ✓ | 默认 `false`：只认管理员预先绑定的外部账号；`true`：首次登录时自动开通本地用户（没有本地密码） |
   | `…_DEFAULT_ROLES` | ✓ | ✓ | 自动开通时赋予的角色编码，多个用逗号分隔 |
   | `…_LOGOUT` | ✓ | ✓ | 默认 `true`：登出本系统时跳到提供方一并登出 |
   | `…_ENABLED` | ✓ | ✓ | 默认 `true` |

   配置不完整时（缺 issuer、类型写错、id 不合法），后端**启动失败**，并在报错里指出是哪一项。
4. **重启后端**。登录页会出现「使用 <名称> 登录」按钮。
5. **开通账号**，有两种方式：
   - 管理员在「用户管理 → 外部身份」里填写提供方和外部用户标识完成绑定。外部用户标识：OIDC 是 `sub`，CAS 是登录名。
   - 用户先用密码登录，再到「个人中心 → 外部账号」里点「绑定」。

   **本地已有同名用户不会被自动关联**，必须用上面两种方式之一显式绑定，防止有人在提供方注册同名账号冒用本地账号。
6. **（可选）关闭密码登录**：设置 `WEIRAN_PASSWORD_LOGIN_ENABLED=false`。之后只有内置超管 `admin` 还能用密码登录，留作提供方故障时的应急入口，所以它的密码务必改强。

用户回到登录页时如果看到错误提示，对应的错误码如下：

| 错误码 | 含义 | 处理 |
| --- | --- | --- |
| `110102` | 外部身份校验失败（票据或授权码无效、超时、state 不符） | 让用户重试；反复出现时，在 `weiran4j.log` 里查 `外部登录失败` 和 `OIDC` / `CAS` 开头的 WARN |
| `110104` | 账号未开通 | 管理员绑定该外部账号，或给该提供方打开自动开通 |
| `110103` | 本地账号已禁用 | 管理员启用该账号 |

## 6. 日志与排障（requestId）

**位置**：容器内 `/app/logs`（卷 `backend-logs`），同时输出到 `docker compose logs backend`。

| 文件 | 内容 |
| --- | --- |
| `weiran4j.log` | 应用日志：访问日志、业务 WARN、异常 ERROR，按天 + 100MB 滚动，保留 `WEIRAN_LOG_MAX_HISTORY` 天 |
| `weiran4j-sql.log` | MyBatis SQL，只在 `WEIRAN_LOG_LEVEL=DEBUG` 时有内容 |

**格式**：`[时间] [weiran4j] [requestId] [线程] [级别] [logger] --> 消息`。访问日志的 logger 是 `com.wulicode.weiran.access`，每个 API 前缀下的请求一行：

```text
[2026-10-06 10:00:00.123] [weiran4j] [3f1c9a…] [http-nio-5200-exec-1] [INFO] [com.wulicode.weiran.access] --> PUT /api-backend/system/auth/updateProfile 200 12ms user=1 ip=172.18.0.4
```

**按请求号排障**：
1. 用户的错误提示末尾有「（请求号 3f1c9a2b）」，这是请求号的前 8 位。
2. 用它检索：
   ```bash
   docker compose exec backend grep -h "3f1c9a2b" /app/logs/weiran4j.log
   ```
   命中的行里有完整的 32 位请求号。
3. 再用完整请求号检索，能串起这次请求的访问日志、异常日志和异步写入的操作日志。
4. 自带 Nginx 的处理方式：上游（外层网关）传了 `X-Request-Id` 就原样转给后端，没传就用 Nginx 自己的 `$request_id`。所以网关、Nginx 和应用日志能用同一个值串起来；后端仍会校验格式，不合法的值会被重新生成。

**说明**：
- 访问日志**不记**请求体和查询参数的值。写接口的请求体已经在「操作日志」里脱敏落库。
- 访问日志中的 `ip` 取自 `X-Forwarded-For`，可能被请求方伪造，安全追溯时不要只信它。
- 查看实时日志：`docker compose logs -f backend`。临时调高日志级别：在 `server/.env` 里改 `WEIRAN_LOG_LEVEL=DEBUG`，然后执行 `docker compose up -d backend`。注意要改文件：在 shell 里 `WEIRAN_LOG_LEVEL=DEBUG docker compose …` 不会生效，因为 `env_file` 里的值优先。

### 6a. 阿里云 SLS 采集 Docker 日志（可选）

仓库根目录提供 `docker-compose.sls.yml` 作为可选部署叠加文件。它在同一台 Docker 宿主机上运行阿里云 LoongCollector；基础 Compose 单独启动时不加载采集器。**默认采集 Docker stdout/stderr**：后端的主应用日志和 Nginx 访问/错误日志都从容器输出读取，`weiran4j.log` 是本地留存副本，不要再配置它的文件采集，否则 SLS 会收到重复事件。MyBatis SQL 只写入 `weiran4j-sql.log`，需要收集时按下文另建文件规则。

采集器使用宿主机 `/var/run/docker.sock` 与 `/:/logtail_host:ro` 发现容器和读取日志，不需要在应用里配置 SLS AccessKey。Docker socket 具有宿主机管理权限，采集器只部署在可信主机；不要把 socket 暴露为网络端口，也不要把账号凭据写入 Compose 文件。Docker 标准输出采集要求 `json-file` 日志驱动，仓库已经在 `backend`、`web` 服务上显式设置。[阿里云容器采集说明](https://help.aliyun.com/en/sls/collect-docker-container-text-logs)、[Docker json-file 说明](https://docs.docker.com/engine/logging/drivers/json-file/)。

**1. 创建 SLS 资源并填写部署参数**

在阿里云 SLS 控制台创建与采集器接入地域一致的 Project，并创建 `weiran4j-backend`、`weiran4j-web` 两个 Logstore；需要数据库容器或 SQL 日志时可另建 `weiran4j-mysql`、`weiran4j-sql`。按查询和保留需求设置索引、保存天数和容量。随后只在部署机的 `server/.env` 末尾添加以下变量；这些是可选叠加文件专用变量，不属于 Spring 应用配置，也不写入 `.env.example` 的应用变量清单：

```dotenv
# 示例：Project 在 cn-hangzhou，ECS 与 Project 同地域时走阿里云内网。
WEIRAN_SLS_IMAGE=aliyun-observability-release-registry.cn-hangzhou.cr.aliyuncs.com/loongcollector/loongcollector:v3.0.12.0-25723a1-aliyun
WEIRAN_SLS_UPLOAD_CHANNEL=cn-hangzhou
WEIRAN_SLS_ACCOUNT_ID=<拥有该 Project 的阿里云主账号 ID>
WEIRAN_SLS_MACHINE_ID=weiran4j-prod-01
```

| 变量 | 填法 |
| --- | --- |
| `WEIRAN_SLS_IMAGE` | 选阿里云官方提供的**完整镜像地址和固定版本标签**；上面是官方文档给出的示例版本。Docker Engine ≥ 29 或最低 API ≥ 1.42 时，必须改用 **LoongCollector ≥ 3.2.4** 的对应镜像，不要照抄示例旧版本。其他宿主机也应核对[当前兼容要求](https://help.aliyun.com/en/sls/collect-docker-container-text-logs)再选择版本。 |
| `WEIRAN_SLS_UPLOAD_CHANNEL` | 与 Project 地域一致：同地域阿里云 ECS 填地域 ID（如 `cn-hangzhou`）；跨地域、自建机或其他云填 `cn-hangzhou-internet`；确需跨境加速时按阿里云文档选 `-acceleration`。此值进入 `ALIYUN_LOGTAIL_CONFIG` 的路径。 |
| `WEIRAN_SLS_ACCOUNT_ID` | **主账号 ID**，不是 AccessKey ID；对应 Project 的所有者。 |
| `WEIRAN_SLS_MACHINE_ID` | 本地域内唯一的机器标识；多台部署机每台使用不同值，并在 SLS 机器组登记相同值。 |

先用 `docker version` 核对宿主机版本，再在仓库根目录启动采集器（已有后端和前端会继续运行）：

```bash
docker compose --env-file server/.env -f docker-compose.yml -f docker-compose.sls.yml config --quiet
docker compose --env-file server/.env -f docker-compose.yml -f docker-compose.sls.yml up -d loongcollector
docker compose --env-file server/.env -f docker-compose.yml -f docker-compose.sls.yml ps loongcollector
```

之后在 SLS Project 的「资源组 → 机器组」创建**自定义标识**机器组，填入 `WEIRAN_SLS_MACHINE_ID`，确认心跳为 OK。多主机时把各主机的唯一标识加入同一机器组。采集器的上传通道要指向这个 Project 所在地域；心跳失败先检查地域、网络出口及采集器日志。[阿里云机器组配置步骤](https://help.aliyun.com/en/sls/collect-docker-container-text-logs)。

**2. 在 SLS 控制台创建采集规则**

在各 Logstore 的「导入数据 / Logtail 配置」选择 Docker 标准输出模板，绑定上述机器组，并按下表设置容器标签白名单。控制台若显示“Docker 标准输出（旧版）”，使用该模板即可；配置页面名称可能随 SLS 版本变化。标签筛选使用 Docker 容器的真实 label，不能把预览字段 `_container_name_` 当作 label。[阿里云容器筛选说明](https://help.aliyun.com/en/sls/what-do-i-do-if-an-error-occurs-when-i-use-logtail-to-collect-logs-from-containers)。

| Logstore / 规则示例 | 来源 | 容器标签白名单 | 采集内容与处理 |
| --- | --- | --- | --- |
| `weiran4j-backend` / `weiran-backend-stdout` | Docker 标准输出 | `com.wulicode.weiran.sls.service` = `^backend$` | 采集 stdout；启用多行合并，首行正则 `^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]`，把 Java 异常堆栈合并到上一行。 |
| `weiran4j-web` / `weiran-web-stdout` | Docker 标准输出 | `com.wulicode.weiran.sls.service` = `^web$` | Nginx 访问日志在 stdout，错误日志在 stderr；如需两者都收集，启用 stdout 与 stderr 并根据 `stream`/`_source_` 区分。两条流之间不保证严格顺序。 |
| `weiran4j-mysql` / `weiran-mysql-stdout`（可选） | Docker 标准输出 | `com.wulicode.weiran.sls.service` = `^mysql$` | 收集 MySQL 容器启动和错误输出；数据库慢查询日志不在该规则内。 |

为 Logstore 开启全文索引；若要按日志级别、requestId、HTTP 状态等字段检索，再按实际日志样本添加解析规则和字段索引。后端首行格式见 §6。SLS 新旧标准输出模板的容器元数据字段位置可能不同，查询前在预览里确认 `_container_name_` 或 `__tag__:_container_name_` 的实际位置。[阿里云字段说明](https://help.aliyun.com/en/sls/collect-docker-container-text-logs)。

需要 SQL 日志时，在 `weiran4j-sql` Logstore **另建 Docker 文件采集规则**：容器路径 `/app/logs/weiran4j-sql.log`，标签 `com.wulicode.weiran.sls.service=^backend$`，按 §6 的首行正则合并多行。只有 `WEIRAN_LOG_LEVEL=DEBUG` 且 Mapper 实际产生日志时才有数据。SQL 可能含个人数据，不应长期保持 DEBUG；给该 Logstore 单独设置较短保留期与访问权限。**不要**再采集 `/app/logs/weiran4j.log`，也不要把 Docker `json-file` 原始目录配置成额外文件规则。

**3. 验证与排障**

```bash
docker compose --env-file server/.env -f docker-compose.yml -f docker-compose.sls.yml logs --tail=50 loongcollector
docker inspect "$(docker compose --env-file server/.env -f docker-compose.yml ps -q backend)" --format '{{.HostConfig.LogConfig.Type}} {{json .Config.Labels}}'
docker compose --env-file server/.env logs --tail=20 backend
```

确认后端的驱动为 `json-file`、标签为 `com.wulicode.weiran.sls.service=backend`，机器组心跳 OK。**绑定规则后再发一个实际 API 请求**，从响应头复制 `X-Request-Id`，用该值在 `weiran4j-backend` 检索；LoongCollector 主要采集规则生效后的新增日志，旧日志不一定回补。查不到时依次核对容器有新输出、标签与规则一致、采集器版本兼容 Docker API、Project 地域与上传通道一致、Logstore 索引已开启。可在 SLS 控制台查看采集诊断信息。[阿里云采集异常排查](https://help.aliyun.com/en/sls/loongcollector-collection-exception-troubleshooting)。

升级时先更新 `.env` 中的采集器镜像固定版本，再执行上述 `up -d loongcollector`；应用升级继续按 §7 的基础 Compose 命令执行。SLS 采集失败不会阻止应用启动；本地 `docker compose logs` 和 `/app/logs` 可用于排障，但 Docker stdout 的滚动上限意味着长时间采集故障后早期日志可能已被清理。

## 7. 优雅停机与升级

- **停机过程**：后端收到 SIGTERM 后先停止接收新请求，再等在途请求处理完，最多 `WEIRAN_SHUTDOWN_TIMEOUT`（默认 30s）；之后等操作日志线程池把已提交的审计写完，最多 10s。Compose 的 `stop_grace_period` 是 40s，比上面的等待时间长，所以不会在中途强杀。
- **自定义编排时**（K8s、systemd）：强杀时限（`terminationGracePeriodSeconds` / `TimeoutStopSec`）要**大于** `WEIRAN_SHUTDOWN_TIMEOUT`。
- **升级步骤**：
  ```bash
  git pull
  docker compose up -d --build     # 已 export COMPOSE_ENV_FILES=server/.env
  ```
  Flyway 会自动执行新增的迁移，已执行过的迁移永不修改。升级前建议先备份 `mysql-data` 卷。
- **从 2026-10-06 之前的版本升级**（D-014）：
  - 配置键 `weiran.system.jwt.*` 已改为 `weiran.auth.jwt.*`。环境变量名不变；如果自己写过 yml，需要改名；
  - 升级后已签发的令牌全部失效（旧令牌没有 `iss`），所有用户需要重新登录；
  - 新增可选变量 `WEIRAN_COOKIE_SECURE`、`WEIRAN_JWT_ISSUER`、`WEIRAN_JWT_AUDIENCE`、`WEIRAN_LOG_DIR`、`WEIRAN_LOG_MAX_HISTORY`、`WEIRAN_SHUTDOWN_TIMEOUT`。

## 8. 首次部署检查清单

- [ ] `WEIRAN_JWT_SECRET` 是新生成的随机值（≥ 32 字节），没有从别的环境复制过来。
- [ ] 生产环境 `WEIRAN_COOKIE_SECURE=true`，并且通过 HTTPS 访问。
- [ ] **登录后立即修改 `admin` 的默认密码 `admin123`**：右上角头像 →「个人中心」→「修改密码」。
- [ ] 外层代理按 §4 透传了 `Cookie`、`Set-Cookie`、`X-CSRF-Token`、`X-Request-Id`。
- [ ] `docker compose exec backend id -u` 输出不为 0。
- [ ] `docker compose exec backend ls /app/logs` 能看到 `weiran4j.log`。
- [ ] 接入了外部身份提供方的：`WEIRAN_PUBLIC_BASE_URL` 与浏览器地址完全一致（协议、端口都要对），回调地址已在提供方登记（§5a）。

## 9. 已知风险

- **`X-Forwarded-For` 可被伪造**：登录日志、操作日志和访问日志里的 IP 取的是该头的第一个值，后端不校验请求是否来自可信代理。最外层代理应当**覆盖**这个头，而不是追加。
- **角色和权限变更有延迟**：多实例部署时，角色或权限的修改最多 30 秒后才在所有实例生效。账号吊销（改密、禁用）不受影响，立即生效。
- **Compose 只是参考**：它是单机部署，没有高可用，MySQL 也没有备份策略。

## 10. 镜像版本

基础镜像的标签写在 `server/Dockerfile`、`backend/Dockerfile` 和 `docker-compose.yml` 里，不在 Gradle 版本体系内。升级 JDK、Node、Nginx 或 MySQL 时，应一并核对这些文件和本节。

| 用途 | 镜像 |
| --- | --- |
| 后端构建 / 运行 | `eclipse-temurin:21-jdk` / `eclipse-temurin:21-jre` |
| 前端构建 / 运行 | `node:22-alpine` / `nginx:1.27-alpine` |
| 数据库 | `mysql:8.4` |

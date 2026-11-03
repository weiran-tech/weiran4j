# 环境变量与配置模板

部署时将以下模板保存为 `packages/server/.env`，填写密码和密钥，再按[部署与运维](/deployment)启动。`.env` 不应提交到版本库。未填写的可选项可以删除，以使用应用默认值。

```dotenv
# 数据库；Compose 内的数据库地址由 Compose 覆盖
WEIRAN_DB_URL=jdbc:mysql://127.0.0.1:3306/weiran4j?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false
WEIRAN_DB_USERNAME=root
WEIRAN_DB_PASSWORD=

# 服务地址与端口
WEIRAN_PORT=5200
WEIRAN_WEB_PORT=5202
WEIRAN_PUBLIC_BASE_URL=http://localhost:5202

# 认证：JWT 密钥必填，至少 32 字节；可用 openssl rand -base64 48 生成
WEIRAN_JWT_SECRET=
WEIRAN_JWT_TTL=12h
WEIRAN_JWT_ISSUER=weiran4j
WEIRAN_JWT_AUDIENCE=weiran4j
WEIRAN_COOKIE_SECURE=true
WEIRAN_PASSWORD_LOGIN_ENABLED=true

# 资源存储：disabled / local / aliyun
WEIRAN_STORAGE_MODE=disabled
WEIRAN_STORAGE_LOCAL_ROOT=uploads
WEIRAN_STORAGE_LOCAL_URL_PREFIX=/system-uploads
WEIRAN_STORAGE_ALIYUN_ENDPOINT=
WEIRAN_STORAGE_ALIYUN_BUCKET=
WEIRAN_STORAGE_ALIYUN_ACCESS_KEY_ID=
WEIRAN_STORAGE_ALIYUN_ACCESS_KEY_SECRET=
WEIRAN_STORAGE_ALIYUN_PUBLIC_BASE_URL=

# 短信：disabled / local / aliyun
WEIRAN_SMS_MODE=disabled
WEIRAN_SMS_ALIYUN_ACCESS_KEY_ID=
WEIRAN_SMS_ALIYUN_ACCESS_KEY_SECRET=

# 日志与停机
WEIRAN_LOG_LEVEL=INFO
WEIRAN_LOG_DIR=logs
WEIRAN_LOG_MAX_HISTORY=30
WEIRAN_SHUTDOWN_TIMEOUT=30s

# 可选的生产 profile
# SPRING_PROFILES_ACTIVE=prod
```

`WEIRAN_DB_PASSWORD` 和 `WEIRAN_JWT_SECRET` 必填。`WEIRAN_STORAGE_MODE=aliyun` 时还需填写所有 `WEIRAN_STORAGE_ALIYUN_*` 项；`WEIRAN_SMS_MODE=aliyun` 时需填写两个短信凭据。`local` 短信模式会记录明文验证码，只用于受控开发环境。仅通过 HTTP 做本机试运行时可将 `WEIRAN_COOKIE_SECURE=false`；生产 HTTPS 环境应保持 `true`。

## 可选的生产 YAML

需要按 profile 覆盖应用配置时，将下列内容保存为 `packages/server/config/application-prod.yml`，并在 `.env` 中设置 `SPRING_PROFILES_ACTIVE=prod`。Compose 会把这个配置目录只读挂载到后端容器。密钥继续放在 `.env` 中，YAML 只引用环境变量。

```yaml
spring:
  datasource:
    # Compose 默认连接内置 MySQL；改用外部数据库时再设置 url
    # url: jdbc:mysql://db.example.com:3306/weiran4j?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    password: ${WEIRAN_DB_PASSWORD:}

weiran:
  auth:
    jwt:
      secret: ${WEIRAN_JWT_SECRET:}
```

Compose 自带 MySQL 时，后端数据库地址已由 Compose 注入；使用外部数据库时再取消 `url` 注释，并确认地址能从后端容器访问。无需额外覆盖时，可以不创建生产 YAML，也不设置 `SPRING_PROFILES_ACTIVE`。

## 外部身份提供方

每个提供方用一组 `WEIRAN_AUTH_PROVIDERS_<ID>_*` 环境变量配置，`<ID>` 是提供方 ID 的大写形式。以下为 OIDC 和 CAS 示例，按需选用；回调地址、可选字段和账号开通规则见[部署与运维的外部身份章节](/deployment#_5a-外部身份提供方-cas-oidc-d-015)。

```dotenv
# OIDC：id 为 keycloak
WEIRAN_AUTH_PROVIDERS_KEYCLOAK_TYPE=oidc
WEIRAN_AUTH_PROVIDERS_KEYCLOAK_NAME=统一身份
WEIRAN_AUTH_PROVIDERS_KEYCLOAK_ISSUER=https://sso.example.com/realms/example
WEIRAN_AUTH_PROVIDERS_KEYCLOAK_CLIENT_ID=weiran4j
WEIRAN_AUTH_PROVIDERS_KEYCLOAK_CLIENT_SECRET=
WEIRAN_AUTH_PROVIDERS_KEYCLOAK_AUTO_PROVISION=false
WEIRAN_AUTH_PROVIDERS_KEYCLOAK_DEFAULT_ROLES=

# CAS：id 为 cas
WEIRAN_AUTH_PROVIDERS_CAS_TYPE=cas
WEIRAN_AUTH_PROVIDERS_CAS_NAME=统一认证
WEIRAN_AUTH_PROVIDERS_CAS_SERVER_URL=https://cas.example.com/cas
```

日志采集专用的 `WEIRAN_SLS_*` 变量见[阿里云 SLS 采集说明](/deployment#_6a-阿里云-sls-采集-docker-日志-可选)。

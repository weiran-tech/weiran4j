# 使用指南

## 环境要求

- JDK 21
- Node.js 22.13 或更高版本、pnpm 12
- MySQL 8；也可以用仓库提供的 Docker Compose 部署方式

## 本地启动

在仓库根目录执行：

```bash
mysql -uroot -e "CREATE DATABASE weiran4j DEFAULT CHARACTER SET utf8mb4"
cp packages/server/config/application-local.yml.example packages/server/config/application-local.yml
```

编辑 `packages/server/config/application-local.yml`，填写数据库密码，并用 `openssl rand -base64 48` 生成 JWT 密钥。
然后启动：

```bash
pnpm install
pnpm dev
```

打开后台 `http://localhost:5202`。文档站运行在 `http://localhost:5209`。首次登录账号为 `admin`，密码为 `admin123`；部署到共享环境后应立即修改。

首次启动时 Flyway 会在空库中建表并写入种子数据。请勿将本地配置指向已有业务库。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 同时启动后端、后台前端和文档站 |
| `pnpm dev:server` | 只启动后端 |
| `pnpm dev:web` | 只启动后台前端 |
| `pnpm dev:docs` | 只启动 VitePress 文档站 |
| `pnpm build` | 通过 Turbo 构建前端和文档站 |
| `pnpm test` | 运行前端测试 |
| `pnpm lint` | 检查前端代码 |
| `cd packages/server && ./gradlew check --no-daemon` | 运行后端检查；需使用 JDK 21，集成测试需 Docker |
| `pnpm openspec:check` | 检查 OpenSpec 需求文档结构 |

后端也可在 `packages/server/` 下单独运行 Gradle 命令。所有 Gradle 构建使用 JDK 21。

## 短信联调

短信发送默认关闭。受控的本地开发环境可设置 `WEIRAN_SMS_MODE=local`：系统会将替换变量后的短信正文写入应用日志，不会发送短信；手机号验证码还会明文写入登录日志。日志可能含验证码或个人信息，不要在生产环境启用此模式。阿里云凭据使用 `WEIRAN_SMS_ALIYUN_*`；短信签名与本地/阿里云验证码模板在单独的「短信配置」页面维护。

短信模板在阿里云短信控制台创建并审核，不在本项目配置模板正文。业务模块调用 `SmsService.send` 时，将阿里云模板 CODE 填入 `SmsSendCommand.templateCode`，模板变量填入 `templateParameters`。验证码的生成、校验、过期和发送频率由业务模块负责；system 只负责按模板发送。

## 部署与接口

- [部署与运维](/deployment)：Docker Compose、阿里云 SLS 容器日志采集、环境变量和反向代理。
- [环境变量与配置模板](/environment)：可复制的部署变量与生产配置示例。
- [接口与数据约定](/contracts)：数据库、权限码、错误码与跨接口规则。
- [OpenAPI 与 Swagger UI](/openapi)：查看本地接口定义和交互页面。
- [批处理任务](/batch-processing)：Excel、ZIP 演示与业务处理器接入。
- [自增序号](/sequence)：按类型分配持久化唯一序号。
- [关键设计决策](/design-decisions)：架构分层、认证与扩展方式。

## 页面状态

[页面状态演示](./page-states)提供权限分配、设置读取恢复与角色变更后的权限同步示例，可在文档站直接操作。

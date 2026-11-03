# weiran4j

Java 21 + Spring Boot 与 React 的模块化后台管理框架。

## 文档

https://weiran-tech.github.io/weiran4j/

## 开始使用

准备 JDK 21、Node.js 22.13+、pnpm 12 和 MySQL 8。创建空库并准备本地配置：

```bash
mysql -uroot -e "CREATE DATABASE weiran4j DEFAULT CHARACTER SET utf8mb4"
cp packages/server/config/application-local.yml.example packages/server/config/application-local.yml
```

在本地配置中填写数据库密码和随机 JWT 密钥，然后运行：

```bash
pnpm install
pnpm dev
```

后台地址为 http://localhost:5202，项目文档为 http://localhost:5209。更多步骤见 [使用指南](docs/usage.md)。

## 文档

- [使用指南](docs/usage.md)：本地启动、常用命令和部署入口
- [架构说明](docs/architecture.md)：模块关系、后端分层和请求流程
- [文档站首页](docs/index.md)：VitePress 文档入口
- [架构、数据库与业务约束](packages/server/docs/01-架构与接口契约.md)
- [部署手册](packages/server/docs/02-部署.md)
- [版本发布](docs/releases.md)：GitHub Packages 组件包与 GHCR 完整 Demo 镜像
- [开发约定](AGENTS.md)

文档站由 Turbo 管理：`pnpm dev:docs` 单独启动，`pnpm build:docs` 构建。

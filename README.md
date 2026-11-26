# weiran4j

Java 21 + Spring Boot 与 React 的模块化后台管理框架。

## 文档

https://weiran4j.wulicode.com/

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

Turbo 同时启动后端（5200）、后台（http://localhost:5202）、项目文档（http://localhost:5209）和原型工程（http://localhost:5208）。更多步骤见 [使用指南](docs/usage.md)。

## 文档

- [使用指南](docs/usage.md)：本地启动、常用命令和部署入口
- [架构说明](docs/architecture.md)：模块关系、后端分层和请求流程
- [文档站首页](docs/index.md)：VitePress 文档入口
- [架构、数据库与业务约束](packages/server/docs/01-架构与接口契约.md)
- [部署手册](packages/server/docs/02-部署.md)
- [版本发布](docs/releases.md)：GitHub Packages 组件包与 GHCR 后台体验镜像
- [测试框架基线](docs/testing/index.md)：目录、Turbo 检查、流程、证据与资源恢复约定
- [业务定义](docs/biz/index.md)：按业务域组织规则、场景和验收定义
- [项目测试入口](docs/testing.md)：API/E2E/Bruno、离线检查与 Cookie 会话管理
- [开发约定](AGENTS.md)

文档站由 Turbo 管理：`pnpm dev:docs` 单独启动，`pnpm build:docs` 构建。

文档站在 Vercel 使用仓库根目录构建，配置见 `vercel.json`，域名为 `weiran4j.wulicode.com`。
Markdown 中的 `mermaid` 代码块会显示为图表。


原型源码位于 `packages/rp`，通过 Git subtree 同步至 [rp-example](https://github.com/weiran-tech/rp-example)。`main` 上涉及原型的推送会触发 GitHub Actions 自动同步，也可在 Actions 页面手动运行；本地手动重试使用 `pnpm sync:rp`。

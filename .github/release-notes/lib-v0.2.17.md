Java 组件包 `0.2.17` 发布至 GitHub Packages。

## 本版改动

- 接入 Wuli3 1.1.1 BOM、core 与 MySQL starter，统一 Boot 3.5.15 / MyBatis-Plus 3.5.16 基线。
- 保留 Weiran 数字错误码、响应、认证、权限、分页与审计协议；修复 MyBatis 默认聚合引发的分页链装配冲突。
- GitHub Packages 仓库限定制品 group；补齐本地、CI 和 Docker BuildKit secret 认证配置。
- 同步近期组件文档、原型 Rp 命名和代码扫描修复；前端 npm 包沿各自标签独立发布。

## 验证

后端框架 88 项、应用集成 99 项、Manage 490 项测试通过；构建、lint、文档站、OpenSpec 与 Docker 镜像验证通过。四个 domain/api 编译类路径未暴露 Spring/MyBatis/starter。

## 消费提示

消费本版本需配置 `https://maven.pkg.github.com/weiran-tech/weiran4j` 与 `https://maven.pkg.github.com/weiran-tech/wuli3`，使用具有相应包 `read:packages` 权限的身份。详见仓库 `docs/releases.md` 与后端部署指南 §1a。

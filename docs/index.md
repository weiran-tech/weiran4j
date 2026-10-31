---
layout: home

hero:
  name: weiran4j
  text: 管理后台基础框架
  tagline: Java 21 后端 · React 管理端 · 模块化架构
  actions:
    - theme: brand
      text: 开始使用
      link: /usage
    - theme: alt
      text: 查看架构
      link: /architecture

features:
  - title: 快速启动
    details: 准备 JDK、MySQL 和本地配置后，一条命令启动前后端与文档站。
  - title: 清晰分层
    details: 后端按框架、system 基座与业务模块组织，业务模块采用五层结构。
  - title: 统一管理
    details: 用户、角色、菜单、字典、系统配置与地区管理由统一后台承载。
---

# 项目文档

- [使用指南](/usage)：本地环境、启动方式、常用命令和部署入口。
- [架构说明](/architecture)：仓库结构、前后端关系、后端分层和请求流程。
- [系统配置](/configuration)：分组 Tab、动态表单字段、校验与配置键前缀。
- [OpenAPI 与 Swagger UI](/openapi)：本地接口定义与交互页面的访问方式。
- [接口与数据约定](/contracts)：认证、错误码、数据关系与跨接口规则。
- [部署与运维](/deployment)：Docker Compose、环境变量、反向代理与 SLS 日志采集。
- [环境变量与配置模板](/environment)：完整的 `.env` 和可选生产 YAML 示例。
- [版本发布](/releases)：GitHub Packages 组件包与 GHCR Demo 镜像。
- [公共组件](/components/)：逐个查看组件包的形态、交互和接入示例。
- [关键设计决策](/design-decisions)：模块分层、认证和下游扩展的取舍。
- [资源库引用与删除设计](/资源库引用与删除设计)：资源引用登记与删除校验。

HTTP 接口的路径、参数和字段以运行中的 OpenAPI 为准。

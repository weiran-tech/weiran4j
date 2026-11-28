---
title: "Wuli3 发布制品与基座边界调研"
status: "draft"
updated_at: "2026-11-27"
---

# Explore

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| framework | packages/server/weiran-framework/build.gradle.kts、WeiranFrameworkAutoConfiguration.java | 框架依赖和现有基础设施 |
| system | packages/server/weiran-system/ | 认证、权限及审计契约的消费方；不更换业务实现 |
| web | packages/manage/src/types/api.ts | 固定数字 code 与分页输出；本次不改前端 |
| Wuli3 | ../wuli3-gradle 的 BOM、core、web、mysql starter 与发布工作流 | 判断真实接入边界 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 依赖平台 | packages/server/weiran-dependencies/build.gradle.kts:20 | 直接导入 Boot 3.5.15、MP 3.5.16；保存框架快照供漂移检查 |
| 仓库 | packages/server/settings.gradle.kts:14 | 只配置 Maven Central，模块不得自行声明仓库 |
| 框架库 | packages/server/weiran-framework/build.gradle.kts:17 | implementation 引入 Spring/MP，不向 domain/api 暴露 |
| 请求装配 | packages/server/weiran-framework/src/main/java/com/wulicode/weiran/framework/autoconfigure/WeiranFrameworkAutoConfiguration.java:1 | 已有请求号、可信 IP、认证拦截、统一响应、异常和审计 |
| 漂移检查 | packages/server/build-logic/src/main/kotlin/com/wulicode/weiran/gradle/FrameworkVersionsCheck.kt:1 | 在运行时类路径与框架版本快照之间核对 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| Wuli3 BOM | com.wulicode.wuli3:wuli3-dependencies:1.1.1 | 替代直接 Boot/MP BOM，保留本仓独有依赖 | 是：清理重复版本约束 |
| core starter | Wuli3 core Spring starter | 复用基础上下文、加密与生命周期基础设施 | 是：核对已有日志、关闭行为，不覆盖项目配置 |
| MySQL starter | Wuli3 MySQL starter | 聚合持久化依赖 | 是：排除 jsqlparser-4.9，保留现有解析器 |
| 既有兼容层 | weiran-framework | 保留错误、响应、分页、认证和审计协议 | 无需本阶段替换业务调用 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 正式制品需认证 | Wuli3 .github/workflows/publish.yml | 仓库为 https://maven.pkg.github.com/weiran-tech/wuli3；已使用本机 read:packages 凭据成功读取 BOM |
| Web starter 默认协议不同 | Wuli3 guide/wuli3-web-spring-boot-starter.md | 暂不启用 Web starter，避免双重包装、异常处理与可信身份头 |
| MySQL 两套解析器 | 两仓 mysql/framework 构建文件 | 必须排除一套，不同时装配 |
| CP-1/CP-4/D-016 | 宪法与 framework 构建文件 | 新 starter 只能 implementation，版本集中在 BOM |

## 影响面

### 普通改动

仓库认证文档、本地无密钥模板、CI packages 读取权限、框架自动配置测试与依赖装配。

### 共享层命中

#### 桶文件 / 注册表

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 仓库单点 | 命中：增加限定 group 的 GitHub Packages 仓库 |
| SL-2 | weiran-dependencies/build.gradle.kts | BOM 单点 | 命中：Wuli3 1.1.1，清理其管理的重复版本 |
| SL-3 | weiran-app/build.gradle.kts | 应用装配 | 未命中：由 framework 的运行时依赖传入 |
| SL-4 | Flyway 菜单 | 序号资源 | 未命中：不改表或菜单 |
| SL-5 | manage 页面 | 路由配对 | 未命中：不改前端 |

#### 跨模块契约

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors.java | 错误码共享 | 未命中：冻结数字错误码 |
| SL-7 | page/response | 分页包络共享 | 未命中：冻结现有字段 |

#### 序号型资源

无新增 Flyway 版本或菜单 id。构建约定、BOM、framework 与 CI 串行安排在 Layer 0。

### 不会碰的目录

packages/manage、packages/rp、packages/component-*、既有 db/migration、业务 domain/api、tests/.local 和其他项目本地配置。

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 仓库待确认 | 用户确认 GitHub Packages，认证下载成功 | 使用限定 group 的认证仓库，不增加 Maven Local | 是 |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| GitHub 跨仓读取 | CI token 未获 Wuli3 包授权 | 为 weiran4j 授予 package Actions read，或专用只读 Secret |
| BOM 版本变化 | Wuli3 管理 commons/junit 等 | 逐项 dependencyInsight，禁止关闭漂移门禁 |
| 生命周期重复 | starter 日志和关闭设施启用 | 以现有应用配置为准，并测容器装配 |

## Gate

- [x] 共享层命中已完整列出
- [x] 与 interview 的冲突项已回写
- [x] 可复用点已确认

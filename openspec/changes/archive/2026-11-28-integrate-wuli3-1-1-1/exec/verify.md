---
title: "Wuli3 1.1.1 接入验收"
status: "passed"
updated_at: "2026-11-27"
---
# Verify

## 集成记录

单工作区，无并行集成。E1→E2→E3→E4 顺序实施，收尾知识见 notes/E1-repository.md、E2-platform.md、E3-runtime.md、E4-docs.md。

### 越界修改汇总

| 文件 | 说明 | 判定 |
|---|---|---|
| turbo.json | dev 透传包读取变量，防止严格环境模式静默丢弃 | E1 必要连带 |
| AGENTS / 规则 / 发布文档 | D-017 与 Wuli3 BOM 事实同步 | E4 必要连带 |
| build-logic Boot 插件 | 本会话已授权调整为 3.5.15，与 Wuli3 BOM 对齐 | 已知基线改动 |

### 契约最终状态

HTTP 成功 code 仍为数字 0；错误码、HTTP 状态、分页字段、Cookie/CSRF/JWT、权限、审计与历史迁移保持原协议。Wuli3 基础设施只在 framework 外层装配，不启用 Web/permission/audit/RPC/消息等 starter。

### 集成后的实际验证

- Wuli3 正式 BOM 认证下载成功，真实 Gradle 和 Docker 均从 GitHub Packages 解析 1.1.1。
- framework 88 项与 app 99 项测试通过，失败 0、跳过 0；app 使用真实 MySQL/Testcontainers。
- Manage 490 项测试通过。build/test/lint 分别执行 project.json 的实际命令，退出码均为 0。
- Docker 本地镜像 weiran4j:wuli3-check 构建成功；bootJar 含 Wuli3 core/MySQL 1.1.1、jsqlparser 5.2 和 MP parser 3.5.16，不含 parser-4.9 或 weiran-demo。镜像配置/历史未包含本次认证令牌。
- system/region 的 domain/api 四个编译类路径均仅 4 个制品，无 Spring/MyBatis/starter，见 domain-boundary.log。
- 文档站构建、YAML 解析与变更 strict 校验通过。

## L7 硬闸门

| 键 | 真实命令来源 | 日志 | 结果 |
|---|---|---|---|
| build | openspec/project.json commands.build | evidence/build.log | 退出码 0 |
| test | openspec/project.json commands.test | evidence/test.log | 退出码 0 |
| lint | openspec/project.json commands.lint | evidence/lint.log | 退出码 0 |

均在代码修改结束之后执行，JDK 21、外部只读包身份与 OrbStack Docker 显式提供。Docker 首轮下载 Gradle 插件依赖 TLS 中断，未修改代码重试成功，不作为代码红灯或豁免。domain 检查辅助脚本初次跨项目解析受 Gradle 9 隔离限制，改为各模块任务自身解析后通过，未放宽项目规则。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 1.1 | E1 | settings.gradle.kts、三个工作流、Dockerfile、Compose、turbo | ☑ |
| 1.2 | E2 | weiran-dependencies/build.gradle.kts、FrameworkVersionsCheck | ☑ |
| 1.3 | E3 | framework 构建、自动配置、Wuli3FoundationTest | ☑ |
| 1.4 | E4 | D-017、架构/部署/发布指南、AGENTS、当前规则 | ☑ |
| 8.1 | E3 实际验证 | WeiranFrameworkAutoConfiguration 顺序与 Wuli3FoundationTest | ☑ |

### 未实现条目

无。未执行远端 CI 或发布，未提交、推送或归档；这些不是本次代码验收的已完成声明。

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| DS-1/DS-2 | 平台统一、HTTP 契约兼容 | 真接口集成回归与漂移门禁通过 | ☑ |
| DS-3/DS-4 | 无数据库迁移、保留认证和审计 | 无迁移修改；原有认证/日志集成通过 | ☑ |
| DS-5 | implementation、仓库安全、单解析器 | 编译边界和镜像检查通过 | ☑ |
| DS-6 | 不改前端业务 | 前端源码无改动，490 项测试通过 | ☑ |
| Observability | 保留日志与请求边界 | 原有日志/IP/异步测试及应用回归通过 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| foundation-runtime FR-001 / 带认证的正式消费 | 固定版本、认证、限定 group，无 Local 回退 | 真实下载、settings 配置与隔离 Docker 构建，AC-1 | ☑ |
| foundation-runtime FR-002 / 现有应用回归 | 契约不变、纯领域、单解析器 | 88/99 项后端测试、domain 类路径与镜像检查，AC-2/AC-3/AC-4 | ☑ |
| downstream-extension FR-010 / 下游钉高/钉低框架依赖 | 保留原防护算法 | 原算法不变，平台快照改为传递 Wuli3 BOM；check 门禁通过 | ☑ |
| downstream-extension FR-010 / 有理由/空理由白名单 | 保留豁免理由校验 | 沿用原检查；6 项真实漂移均带理由，check 通过 | ☑ |

## 越界检查

未修改前端、RP、组件包、业务表、历史 Flyway 或业务 public DTO。已知 Boot 插件版本调整来自当前会话的前置授权。辅助验证只在 /private/tmp 写脚本及本地临时镜像，不修改 Wuli3 源码。

## 不一致项归属判定

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | 实际测试发现分页 total 为 0，MP 聚合链抢先创建 | 代码错 | 已回实现调整 Weiran 自动配置先于 MP 聚合；新共存测试及全部 99 项集成通过 |
| 2 | Wuli3 Kotlin/演示 POI 版本高于平台基线 | 已批准设计内的真实依赖差异 | 逐项带理由兼容，保留漂移门禁，artifact.md#36 记录上游待对齐项 |

## 遗留问题

- artifact.md#36：上游 Wuli3 BOM 与 Kotlin core 运行时仍不一致，本仓已最小兼容，待上游修复后移除对应豁免。
- 远端 CI 尚未执行。GITHUB_TOKEN 的跨仓 package 读取需在 Wuli3 各包授予 weiran4j Actions access，或配置专用只读 PACKAGES_READ_TOKEN / PACKAGES_READ_USER；具体配置见部署指南 §1a。未声称已验证 GitHub 托管 runner 读取权限。

## 流程反馈

无并行协调缺陷。MyBatis 自动配置顺序只能通过同时加载双方配置及真实分页请求发现，已作为共存回归覆盖。

## 结论

- [x] 集成完成
- [x] L7 三项全绿
- [x] tasks 条目全部覆盖
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已归属并处置

**判定**：通过，进入 L9 人类审阅 diff。未归档、未提交、未推送。

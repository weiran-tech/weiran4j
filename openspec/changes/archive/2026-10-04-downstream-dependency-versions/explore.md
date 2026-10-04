---
title: "downstream-dependency-versions 现实校验"
status: "done"
updated_at: "2026-10-04"
---

# Explore

> **L1 · 现实校验**。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-common` | 不涉及 | — |
| `weiran-base-*`（或本次涉及的业务模块） | 不涉及 | — |
| `web` | 不涉及 | — |
| BOM | `weiran4j/weiran-dependencies/build.gradle.kts` | 版本唯一来源,apply 下游清单的位置 |
| build-logic | `BootAppConventionsPlugin.kt`、`JavaConventionsPlugin.kt:107-111` | 检查任务落点;模块如何引入 BOM |
| 规则 | `constitution.md` CP-4/CP-5/CP-6、`project.md` SL-2、`AGENTS.md:69`、契约 §2.2 | 文字同步 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| BOM | `weiran-dependencies/build.gradle.kts:19-21` | `api(platform(spring-boot-dependencies:3.5.15))`、`api(platform(mybatis-plus-bom:3.5.17))` |
| 上游钉版本 | 同文件 `constraints {}` | jjwt ×3、springdoc、forbiddenapis;另有本仓模块坐标(`com.weiran:*`) |
| 模块引入 BOM | `JavaConventionsPlugin.kt:107-111` | `implementation` / `testImplementation` / `annotationProcessor` / `testAnnotationProcessor` 均 `platform(:weiran-dependencies)`(非 enforced) |
| 应用约定 | `BootAppConventionsPlugin.kt` | 只配 bootJar / jar,无依赖检查 |
| CP-4 | `constitution.md:40` | 「所有第三方依赖版本由 `weiran-dependencies` BOM 决定」 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| D-012 的「上游永不创建的下游文件」约定 | 契约 §2.2 | 新增一行 | 否 |
| scratchpad 原型 `probe.init.gradle.kts` | 本会话 | 检查逻辑骨架:`runtimeClasspath` 解析结果 vs detached configuration(框架平台 + 逐个 `g:a` 非传递) | 是:框架清单改为从 BOM 快照读取,加白名单与直接约束检查 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| applied 脚本没有 `api(...)` 类型安全访问器 | Gradle Kotlin DSL 行为 | 下游写法用 `add("api", ...)`;契约里给出示例 |
| `platform()` 非强制,冲突取高 | Gradle 解析规则 | 下游钉高 = 静默升级;钉低 = 静默忽略 → 两条检查 |
| detached configuration 整体 `isTransitive=false` 会切断 BOM 的约束 | 原型实测 | 只对逐个 `g:a` 依赖设非传递,平台依赖保持传递 |
| 现有上游有 2 处漂移 | 原型实测(`dependencyInsight`) | 上游白名单必须先收这 2 条 |
| 不开配置缓存 | D-006 | 任务在执行期读取 `:weiran-dependencies` 的 extra 可接受 |
| build-logic 无测试目录 | `weiran4j/build-logic/src` | 检查逻辑靠临时清单实跑验证 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran4j/build-logic/.../BootAppConventionsPlugin.kt`(或新文件) | 新增检查任务 |
| `weiran4j/docs/01-架构与接口契约.md` §2.2 | 加一行 |
| `weiran4j/docs/00-决策记录.md` | D-013 |
| `openspec/rules/enforced/constitution.md` CP-4 | 改写 |
| `openspec/rules/enforced/project.md` SL-2 | 同步 |
| `AGENTS.md` | 结构说明一句 |

### 共享层命中 ⚠️

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 | 未命中 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 | **命中**:框架层快照、apply 下游清单、上游白名单 |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 | 未命中:检查由约定插件提供 |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 | 未命中 |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) | 未命中 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 | 未命中 |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 | 未命中 |

#### 序号型资源(本仓库暂无)

本仓库没有 Flyway/Liquibase 或带序号的 migration 文件,数据库结构变更依赖手写 SQL
并与 PHP 侧 `weiran-v1` 的迁移文件人工核对(宪法 CP-7)。**不存在**「文件名序号递增,
两个并行改动会撞同一个号」这类冲突点。若本次改动确实要引入某种迁移工具,
在 `rules/enforced/project.md` 补一条 SL-N 再回填这里,不要假设已有序号台账。

> 本次核对:模板文字过时(本仓库用 Flyway);本 change 不涉及迁移,未命中。

**共享层另一命中**:`build-logic`(约定插件,全仓模块共用)——检查任务只挂在 boot-app 约定上,只影响 `weiran-app`,仍归 Layer 0。

**冻结点**:`:weiran-dependencies` 对外公开的 extra 键与形状(BOM 写、检查任务读)。

### 本次不会碰的目录

- `weiran4j/weiran-{common,framework,base}/**`、`weiran-app/src/**`、`weiran-app/build.gradle.kts`、`settings.gradle.kts`
- `web/**`、`openspec/{check.mjs,guards,schemas}/**`
- 不创建 `weiran-dependencies/biz-dependencies.gradle.kts`(验证用临时文件验完即删)

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| — | 无冲突 | — | ☑ |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 检查拖慢 `check` | 每次解析 detached configuration | 只解析元数据(不下载 jar),首次后命中缓存 |
| Spring Boot 升级后白名单过期 | 漂移消失但白名单仍在 | 白名单里不再漂移的条目报 warning,提示清理 |
| 下游接新 SDK 频繁触发 | SDK 传递依赖抬高框架依赖 | 设计如此;报错信息写明怎么加白名单 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子

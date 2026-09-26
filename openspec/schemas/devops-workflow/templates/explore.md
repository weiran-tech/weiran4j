---
title: ""
status: "draft"
updated_at: ""
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。
> 这一层是**必须执行**的,不是 `explore / propose` 二选一——跳过它,设计就是纸上推演,
> 现实冲突会推迟到 subagent 动手时才爆,那时返工成本已经放大 10 倍。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-common` |  |  |
| `weiran-system-*`（或本次涉及的业务模块） |  |  |
| `web` |  |  |

## 现有实现

> 带 `file_path:line` 引用,便于后续 agent 直接跳转。

| 能力 | 位置 | 现状 |
|---|---|---|
|  | `weiran-system-application/.../XxxService.java:12` |  |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
|  |  | 直接调用/扩展/抽公共 | 否/是: |

## 真实约束

> 代码里客观存在、设计必须绕开的东西。

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
|  |  |  |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
|  | 新增/改造 |

### 共享层命中 ⚠️

> **命中任意一项,该改动即归入 L4 执行计划的第 0 层,串行先做,不参与并行。**
>
> 下面三张表是本仓库的完整判定清单 —— **逐行过一遍**,命中写原因与预计改动,未命中写「未命中」。
> 整行留空视为漏判:共享层漏一项,L5 并行阶段必然冲突。
>
> 判定流程:
> ```
> 改动涉及的文件
>       ↓
> 命中下面三张表? ──是──→ Layer 0,串行
>       ↓否
> 被 2 个以上执行单元读取? ──是──→ Layer 0(读也要先冻结)
>       ↓否
> 普通并行单元
> ```

<!-- openspec:slot shared-layers
  【项目特定 · 换项目必须重写本槽】
  问:本项目里,哪些文件会被多个并行单元同时写入,或含有不可自动合并的序号 / 注册表?
  为什么问:这张清单决定 L4 能不能并行、哪些改动必须进 Layer 0 串行先做。漏一项,L5 必然冲突。
  答案要求:
    · 可逐行比对的清单,每行写清「冲突原因」
    · 序号型资源要标注 git 会不会报冲突(不报的最危险)
    · 形式不限(表格/分组/列表),但必须能让人逐行判断「这次改没改到」
  换成别的技术栈时,类别通常仍是这三种,但具体文件完全不同:
    Laravel → ServiceProvider 注册 / composer autoload / database/migrations 时间戳
    Spring  → parent pom 的 dependencyManagement / AutoConfiguration.imports / Flyway V{n}__

  本项目的权威版本住在 `openspec/rules/enforced/project.md` 的 `SL-N` 条目 —— 改文件清单先改那里,
  再同步下面各表(ID 列对应 `SL-N`)。两边 ID 不一致会被 `TEMPLATE/profile-rows` 拦。
-->

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 |  |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 |  |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 |  |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 |  |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) |  |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 |  |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 |  |

#### 序号型资源(本仓库暂无)

本仓库没有 Flyway/Liquibase 或带序号的 migration 文件,数据库结构变更依赖手写 SQL
并与 PHP 侧 `weiran-v1` 的迁移文件人工核对(宪法 CP-7)。**不存在**「文件名序号递增,
两个并行改动会撞同一个号」这类冲突点。若本次改动确实要引入某种迁移工具,
在 `rules/enforced/project.md` 补一条 SL-N 再回填这里,不要假设已有序号台账。

<!-- /openspec:slot shared-layers -->

## 对 interview 的反向修正

> explore 的价值一半在这里。发现需求与现实冲突,**回改 `interview.md` 并注明**,不要闷头往下走。

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
|  |  |  | ☐ |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
|  |  |  |

## Gate

- [ ] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [ ] 与 interview 的冲突项已回写 `interview.md`
- [ ] 可复用点已确认,避免 subagent 重复造轮子

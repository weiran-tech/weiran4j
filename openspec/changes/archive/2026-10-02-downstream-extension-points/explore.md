---
title: "downstream-extension-points 现实校验"
status: "done"
updated_at: "2026-10-02"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。
> 这一层是**必须执行**的,不是 `explore / propose` 二选一——跳过它,设计就是纸上推演,
> 现实冲突会推迟到 subagent 动手时才爆,那时返工成本已经放大 10 倍。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| 构建 | `weiran4j/settings.gradle.kts`、`weiran-app/build.gradle.kts`、`weiran-dependencies/build.gradle.kts` | U1/U2 模块清单写死的位置 |
| `weiran-app` | `src/main/resources/application.yml` | U3/U4 |
| `weiran-framework` | `web/ApiResponseBodyAdvice.java`、`src/test/.../web/WebLayerTest.java` | U5 |
| `weiran-common` / `weiran-base-*` | 未读内容,只确认不涉及 | 本 change 不改 |
| `web` | `src/utils/icons.tsx`、`src/utils/__tests__/icons.test.tsx`、`components/IconPicker.tsx` | U7 |
| 文档 / 流水线 | `docs/01-架构与接口契约.md` §2.1/§3、`rules/enforced/{constitution,project}.md`、`AGENTS.md`、`openspec/project.json`、`check.mjs`、`guards/{components-registry,state-waitlist}.mjs`、`state/bizs/README.md` | U6/U8/额外 1/额外 2 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 业务模块清单 | `weiran4j/settings.gradle.kts:31` | `val businessModules = listOf("weiran-base")`,`:34` 循环 include 五层并把 projectDir 映射到嵌套目录 |
| BOM 内本仓模块坐标 | `weiran4j/weiran-dependencies/build.gradle.kts:27` | **又写死一份** `listOf("weiran-base")` 生成五层坐标 constraints —— interview 未列出,见反向修正 |
| app 依赖 | `weiran4j/weiran-app/build.gradle.kts:28-29` | 写死 `:weiran-base-adapter`、`:weiran-base-infrastructure` |
| 覆盖率聚合 | `weiran4j/weiran-app/build.gradle.kts:15-20,45` | `aggregatedCoverageProjects` 写死 framework + base 三层,`:45` 循环挂到 JacocoReport / Verification |
| 各层覆盖率门禁 | `weiran-base-{api,application,infrastructure,adapter}/build.gradle.kts:9-10` | 这几层自身 `jacocoVerificationEnabled = false`,依赖 app 聚合;domain 自测 0.70 |
| Flyway 配置 | `weiran-app/src/main/resources/application.yml:9-12` | `enabled: true`、`locations: classpath:db/migration`(递归),无 `out-of-order` |
| 配置导入 | `application.yml` | 无 `spring.config.import` |
| 响应包络 | `weiran-framework/.../web/ApiResponseBodyAdvice.java:30` | `@RestControllerAdvice(basePackages = "com.weiran")`;`:41` `supports()` 恒 `true`;javadoc `:17-27` 列三条边界 |
| 包络测试 | `weiran-framework/src/test/.../web/WebLayerTest.java` | MockMvc standalone,内部 `TestController` 覆盖 String / ApiResponse / 鉴权 |
| 图标白名单 | `web/src/utils/icons.tsx:76` `MENU_ICONS`、`:144` `MENU_ICON_NAMES` | 静态 import 66 个 lucide 图标;`renderIcon` / `renderNavIcon` 都查 `MENU_ICONS` |
| 图标测试 | `web/src/utils/__tests__/icons.test.tsx` | 只测 `renderNavIcon` 尺寸 |
| 业务模块登记表 | `weiran4j/docs/01-架构与接口契约.md:50-63` | §2.1 内含登记表,基座行带「当前用到 119」 |
| 登记引用 | `constitution.md` CP-14(序号段表「每个模块在契约文档『业务模块登记』领一段」)、CP-15(菜单 id「在契约文档『业务模块登记』领一段」)、`AGENTS.md:137`(「号段先在契约 §2.1 登记」)、`project.md` SL-4(「按契约 §2.1 登记的段取」) | 四处 |
| sourcePaths 消费 | `openspec/check.mjs:1731-1737` → `lastCommitTs` `:474` / `dirtyFiles` `:488` | 路径原样作 git pathspec;`'weiran4j/weiran-*'` 实测与原四条结果相同(`3db7bf3`) |
| 组件登记守卫 | `openspec/guards/components-registry.mjs:39` `REGISTRY`、`:84` 读清单全文做 `includes` | 只读一份清单 |
| state 编号守卫 | `openspec/guards/state-waitlist.mjs:101` | 扫 `state/bizs/*.md` 全部文件;新增 `README.biz.md` 只是多一份无条目文件,不需改 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| 五层 include 循环 | `settings.gradle.kts:34` | 输入从写死列表换成发现结果 | 否 |
| jacoco 聚合循环 | `weiran-app/build.gradle.kts:45` | 输入换成计算出的清单 | 否 |
| `WebLayerTest` 的 MockMvc 搭建 | `WebLayerTest.java` | 加一个带 `@SkipApiResponse` 的内部 Controller | 否 |
| `AnnotatedElementUtils` | Spring Core | `hasAnnotation(method)` / `hasAnnotation(containingClass)` | 否 |
| `import.meta.glob` 用法 | `web/src/utils/page-registry.ts` | 同一机制,改为 `eager: true` | 否 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 模块清单在**三个**构建脚本里各写一份 | settings `:31`、BOM `:27`、app `:15/:28` | 发现结果必须经 `gradle.extra` 共享,三处都读;只改两处会让 BOM 漏坐标 |
| 不能开 Gradle 配置缓存 | AGENTS.md「常用命令」警告 | settings 里直接 `File.listFiles` 扫目录可接受(不追求 CC 兼容) |
| palantir 格式强制 | AGENTS.md 第 3 条 | Java 改完先 `spotlessApply` |
| NullAway / `@NullMarked` | AGENTS.md「写 Java 代码时」 | 新注解在已 `@NullMarked` 的包里,不涉及可空 |
| classpath import 不支持通配 | Spring Boot `spring.config.import` | 只能一份 `application-biz.yml` |
| import 的文件优先级高于导入者 | Spring Boot ConfigData 语义 | biz 文件能覆盖 `application.yml`,profile 文件与环境变量仍更高——契约写明 |
| `@RestControllerAdvice(basePackages="com.weiran")` 覆盖 `com.weiran.cqt` | `ApiResponseBodyAdvice.java:30` | 必须有显式的跳过标记,改 basePackages 不可行 |
| 组件守卫用 `includes` 宽松匹配 | `components-registry.mjs:84` | 拼接两份文本即可,语义不变 |
| 宪法 CP-7 | constitution.md | 不新增、不改 Flyway 脚本 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran-framework/.../web/SkipApiResponse.java` | 新增 |
| `weiran-framework/.../web/ApiResponseBodyAdvice.java` | 改造 `supports()` + javadoc |
| `weiran-framework/src/test/.../web/WebLayerTest.java` | 补测试 |
| `weiran-app/src/main/resources/application.yml` | 加两项配置 |
| `web/src/utils/icons.tsx` | 加 glob 合并与 `mergeIcons` |
| `web/src/utils/__tests__/icons.test.tsx` | 补 `mergeIcons` 测试 |
| `weiran4j/docs/01-架构与接口契约.md` | §2.1 改指向、§3 加注解行、加配置扩展点说明 |
| `weiran4j/docs/business-modules.md` | 新增 |
| `weiran4j/docs/00-决策记录.md` | 加 D-012 |
| `openspec/rules/enforced/constitution.md` | CP-14/CP-15 改引用 |
| `openspec/rules/enforced/project.md` | SL-1、SL-2、SL-3、SL-4 文字同步 |
| `AGENTS.md` | `:78`、`:137` 改写,加 `AGENTS.biz.md` 一句 |
| `openspec/project.json` | sourcePaths |
| `openspec/guards/components-registry.mjs` | 读可选 `components.biz.md` |
| `openspec/rules/advisory/components.md` | 头部说明下游旁路文件 |
| `openspec/state/bizs/README.md` | 说明 `README.biz.md` |
| `openspec/design/{check.md,CHANGELOG.md}` | 同步守卫变更 |

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

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 | **命中**:写死列表改为目录发现,结果写 `gradle.extra["weiran.businessModules"]` |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 | **命中**(explore 新发现):`:27` 改读 `gradle.extra` 清单 |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 | **命中**:依赖与 `aggregatedCoverageProjects` 改为按清单生成 |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 | 未命中:路由由菜单驱动,不新增页面(project.md 现行 SL-4 为 Flyway 种子菜单,也未命中:不加脚本) |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) | 未命中:不新增页面或菜单 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 | 未命中:不新增错误码(现名 `CommonErrors`) |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 | 未命中:`ApiResponse` 结构不变,`@SkipApiResponse` 放在 framework 不放 common |

#### 序号型资源(本仓库暂无)

本仓库没有 Flyway/Liquibase 或带序号的 migration 文件,数据库结构变更依赖手写 SQL
并与 PHP 侧 `weiran-v1` 的迁移文件人工核对(宪法 CP-7)。**不存在**「文件名序号递增,
两个并行改动会撞同一个号」这类冲突点。若本次改动确实要引入某种迁移工具,
在 `rules/enforced/project.md` 补一条 SL-N 再回填这里,不要假设已有序号台账。

> 本次核对:模板本节文字已过时——本仓库实际使用 Flyway。本 change **不新增迁移脚本、不新增菜单 id**,序号型资源未命中;
> 但 U4(`out-of-order`)改变了 Flyway 版本号的**执行语义**,在契约与 project.md「序号型资源」段补一句。

**非共享层但被多单元读取的冻结点**:`gradle.extra` 的键名 `weiran.businessModules` 与值类型 `List<String>`
(settings 写、BOM 与 app 读),须先定稿。

### 本次不会碰的目录

- `weiran4j/weiran-common/**`、`weiran4j/weiran-base/**`、`weiran4j/build-logic/**`
- 全部 `db/migration/**`
- `web/src/pages/**`、`web/src/layouts/**`、`web/src/components/**`、`web/src/App.tsx`
- `openspec/check.mjs`、`openspec/schemas/**`、`openspec/guards/state-waitlist.mjs`
- 不创建 `web/src/biz/`、`AGENTS.biz.md`、`application-biz.yml`、`components.biz.md`、`README.biz.md`(留给下游)

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 模块清单写死在 settings 与 app 两处 | BOM `weiran-dependencies/build.gradle.kts:27` 还有第三处 | U1 的 `gradle.extra` 同时供 BOM 读,纳入「要做」 | ☑ |
| project.md 只需同步 SL-1 | SL-3(app 要手动追加)与 SL-4(「契约 §2.1 登记的段」)也过时 | SL-1/SL-2/SL-3/SL-4 一并同步 | ☑ |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 目录扫描误收非业务目录 | 某 `weiran-*` 目录恰有一个 `weiran-x-api` 子目录 | 只要命中任一层就要求五层齐全,否则失败——误收会立刻暴露 |
| `gradle.extra` 读取类型转换告警 | Kotlin 泛型擦除 | 读取处 `@Suppress("UNCHECKED_CAST")` 并集中到一处 |
| 下游业务代码拉低 app 聚合覆盖率 | 下游加 application/adapter 但测试少 | 设计如此,契约注明门槛对下游同样生效 |
| `out-of-order` 掩盖真正的漏执行 | 线上漏跑旧脚本 | Flyway 仍会执行它;契约注明脚本之间不得隐含顺序依赖 |
| `import.meta.glob` 在 vitest 中的行为 | 无匹配文件 | glob 返回 `{}`;合并逻辑抽纯函数单测,不依赖真实文件 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子

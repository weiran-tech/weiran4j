---
title: "为 fork 下游开扩展点 · 校验"
status: "done"
updated_at: "2026-10-02"
---

# Verify

> **L6 集成 + L8 规格一致性**。执行者:orchestrator(即实现者本人,单执行单元),已读 `notes/E1-extension-points.md`。

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成
**执行单元数**:1 个(`E1`)

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全
- [x] Layer 0 已完成且契约未再变动
- [x] 自测通过

## 重复实现消除

无。模块清单只在 `settings.gradle.kts` 计算一次,BOM 与 app 都读 `gradle.extra`,没有各自扫描。

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 在 advice 里按请求路径禁止 `/api/**` 使用 `@SkipApiResponse` | `E1` | `supports()` 拿不到请求;挪到 `beforeBodyWrite` 时 `String` 返回值已选定 `StringHttpMessageConverter`,原样放行会失去「不包」的意义。改为规范约束,登记 `artifact.md#19` |
| `rules-index` 直接豁免 `*.biz.md` | `E1` | 下游规则文件会失去唯一唤起途径;改为允许登记在 `AGENTS.biz.md` |
| 一次性补足图标白名单 | interview | 补不全,下游迟早还得改 `icons.tsx` |
| 改 `check.mjs` 支持 sourcePaths 通配 | interview | git pathspec 已原生支持,实测结果一致 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `openspec/guards/rules-index.mjs` | `E1` | 必要连带(不改则 FR-008 不成立) | 保留;补 tasks 6.7,plan「未映射条目」指向本文件 |
| `openspec/state/bizs/artifact.md` | `E1` | 必要连带(登记本次不修的 #19 / #20,pitfalls「L6+L8」要求) | 保留 |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

基线 `main@99604e7`;未怀疑存量红灯,未取 stash 基线,直接在全部代码改完后运行。

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿 | `evidence/build.log` |
| test | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿(前端 27 文件 / 225 用例;`weiran-app` 集成测试 32 条,0 跳过) | `evidence/test.log` |
| lint | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿 | `evidence/lint.log` |

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 0.1 | `E1` | `weiran4j/docs/01-架构与接口契约.md` §2.1、§2.2、§3 | ☑ |
| 0.2 | `E1` | `weiran4j/docs/business-modules.md` | ☑ |
| 0.3 | `E1` | `weiran4j/docs/00-决策记录.md` D-012 | ☑ |
| 1.1 | `E1` | `weiran4j/settings.gradle.kts` | ☑ |
| 1.2 | `E1` | `weiran4j/weiran-dependencies/build.gradle.kts` | ☑ |
| 1.3 | `E1` | `weiran-framework/.../web/SkipApiResponse.java`、`ApiResponseBodyAdvice.java` `supports()` | ☑ |
| 3.1 | `E1` | `weiran4j/weiran-app/build.gradle.kts` | ☑ |
| 3.2 | `E1` | `weiran-app/src/main/resources/application.yml` | ☑ |
| 5.1 | `E1` | `web/src/utils/icons.tsx` `mergeIcons` / `MENU_ICONS` | ☑ |
| 6.1 | `E1` | `openspec/guards/components-registry.mjs`、`components.md`、`design/check.md`、`CHANGELOG.md` | ☑ |
| 6.2 | `E1` | `openspec/state/bizs/README.md` §3 | ☑ |
| 6.3 | `E1` | `openspec/project.json` | ☑ |
| 6.4 | `E1` | `AGENTS.md` | ☑ |
| 6.5 | `E1` | `openspec/rules/enforced/constitution.md` CP-14 / CP-15 | ☑ |
| 6.6 | `E1` | `openspec/rules/enforced/project.md` SL-1~SL-4、序号型资源 | ☑ |
| 6.7 | `E1` | `openspec/guards/rules-index.mjs`(见下「验证中发现」) | ☑ |
| 7.1 | `E1` | `WebLayerTest`:3 个新用例,10/10 通过 | ☑ |
| 7.2 | `E1` | `icons.test.tsx`:4 个新用例,7/7 通过 | ☑ |
| 7.3 | `E1` | 手工:`projects` 不变;`weiran-demo` 五个项目 + app runtimeClasspath 含 `project ':weiran-demo-adapter'` / `-infrastructure` + BOM 约束 `(c)`;`weiran-half` 配置失败,信息「业务模块 weiran-half 五层不齐，缺少：weiran-half-infrastructure, weiran-half-adapter」;已删除 | ☑ |
| 7.4 | `E1` | 手工四步:仅临时组件 → `components-unregistered`;加 `components.biz.md` → `rules-index-missing`;`AGENTS.biz.md` 登记 → 全部通过;`AGENTS.biz.md` 悬空引用 → `rules-index-dangling`;清理后全部通过 | ☑ |
| 7.5 | `E1` | 上表 L7 | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 8.1 通知下游 | 合入 main 后的发布动作 | ☑ |
| 9.1 `artifacts.md` | 上线后动作 | ☑ |

### 验证中发现并修复

**7.4 暴露:只改 components 守卫,下游仍得改 `AGENTS.md`。** `components.biz.md` 放在 `openspec/rules/advisory/` 下,
`rules-index` 守卫要求 `rules/` 下每个 `.md` 都登记在 `AGENTS.md` 的索引表,于是下游一建该文件就报 `REPO/rules-index-missing`;
且原链接正则 `[a-z0-9-]+\.md` 根本认不出 `components.biz.md`。修复:`rules-index` 把可选的 `AGENTS.biz.md` 当作第二张索引表,
链接正则允许文件名中间带点;`AGENTS.biz.md` 不存在时行为不变(当前仓库 check 全部通过)。契约 §2.2、`components.md`、
`design/check.md`、`CHANGELOG.md` 同步。tasks 补 6.7,plan 在「未映射条目」指向本节。

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| Data Flow 1 | 三类目录:无层忽略、齐全收录、不齐失败;`weiran-base` 打头;`gradle.extra` 共享 | 同 | ☑ |
| API Design | `@SkipApiResponse`(TYPE/METHOD、RUNTIME、Documented),方法与类、含元注解 | 同;元注解由 `@WebApi` 用例覆盖 | ☑ |
| Database Design | 无脚本;`out-of-order: true` | 同 | ☑ |
| 分层与装配 | app 依赖与聚合按清单 | 同 | ☑ |
| 前端设计 | `mergeIcons` 纯函数、基座优先、DEV 告警 | 同 | ☑ |
| 流水线与协作规范 | 列出的文件改动 | 同,另加 `rules-index`(见上) | ☑ |
| Observability | 发现失败报错含模块名与缺层;图标重名 console warn | 同 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| FR-001 / 现有仓库的项目集合不变(AC-1) | 五个 `weiran-base-*` | 手工 `./gradlew projects` | ☑ |
| FR-001 / 新增五层齐全的目录即被收录(AC-2) | demo 五项目 + app 依赖 | 手工 `projects` + `:weiran-app:dependencies` | ☑ |
| FR-002 / 只有三层的目录(AC-3) | 配置阶段失败,含模块与缺层名 | 手工,退出码 1 | ☑ |
| FR-003 / 无业务配置文件时照常启动(AC-4) | 集成测试全绿 | L7 test/lint,32 条集成测试 | ☑ |
| FR-004 / 配置已生效(AC-4) | `out-of-order: true` + 空库全量迁移 | 文件 + 集成测试 | ☑ |
| FR-005 / 类级标注(AC-5) | `$.code==200`,无 `$.data` | `WebLayerTest.skipsWrappingForAnnotatedClass` | ☑ |
| FR-005 / 方法级标注只影响该方法(AC-6) | A 无 data,B 包装 | `WebLayerTest.skipsWrappingOnlyForAnnotatedMethod` | ☑ |
| FR-005 / String 返回值原样输出(AC-7) | `pong` | `WebLayerTest.skipsWrappingForStringReturnValue` | ☑ |
| FR-006 / 引用全部指向新文件(AC-8) | grep 无匹配,表体一行 | `grep -rn "§2.1 登记\|「业务模块登记」" AGENTS.md openspec/rules weiran4j/docs` 退出码 1 | ☑ |
| FR-007 / 追加 / 无下游 / 重名(AC-9) | 三种情况 | `icons.test.tsx` | ☑ |
| FR-008 / 旁路清单登记的组件不报错(AC-12) | 不报 `components-unregistered` | 手工 7.4 | ☑ |
| FR-008 / 旁路文件不存在时行为不变 | check 全通过 | `node openspec/check.mjs` | ☑ |
| FR-008 / sourcePaths 覆盖新业务模块(AC-10) | 含 `weiran4j/weiran-*` | `git log -1 -- 'weiran4j/weiran-*'` 与原四条均为 `3db7bf3` | ☑ |
| AC-11 | AGENTS.md 含 `AGENTS.biz.md` 必读 | 文件检查 | ☑ |
| AC-13 | bizs/README.md 说明 `README.biz.md` | 文件检查 | ☑ |
| AC-14 | L7 全绿 | 证据 | ☑ |

## 越界检查

`git diff --stat` 共 21 个已跟踪文件 + 3 个新文件(`business-modules.md`、`SkipApiResponse.java`、本 change 目录)。
对照 plan 第 5 节「拥有」:除 `openspec/guards/rules-index.mjs`、`openspec/state/bizs/artifact.md` 外全部在内,这两项已申报为必要连带。

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| `openspec/guards/rules-index.mjs` | — | `E1` | ☑ | 必要连带 |
| `openspec/state/bizs/artifact.md` | — | `E1` | ☑ | 必要连带 |

无未申报越界。

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | design「流水线与协作规范」只列了 `components-registry`,实现还改了 `rules-index` | **spec 表述不全,实现合理**:设计意图(下游不改上游文件即可登记组件,FR-008)正确,漏想到第二个守卫;不改意图 | 记录于本文件与 CHANGELOG;design 不回写(单向) |

## 遗留问题

- [x] `@SkipApiResponse` 用在 `/api/**` 无机械拦截 → 已登记 `artifact.md#19`
- [x] 下游往 `artifact.md` / `cross-biz.md` 登记仍改上游文件 → 已登记 `artifact.md#20`

## 流程反馈

- explore 模板的共享层表仍是旧文案(SL-4/SL-5 指 `App.tsx` / `AdminLayout.tsx`、「序号型资源(本仓库暂无)」),与 `project.md` 现行 SL-4/SL-5 及 Flyway 不符,上一个 change 已指出,仍未修。
- 「下游不改上游文件」类需求要连带检查所有**读取同一目录的守卫**——本次 explore 只查了直接相关的 `components-registry`,漏了按目录全量扫描的 `rules-index`。

## 结论

- [x] 集成完成(单执行单元时:越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff ｜ ☐ 打回 L5 ｜ ☐ 打回 L2

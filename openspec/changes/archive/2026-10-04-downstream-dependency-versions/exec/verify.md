---
title: "下游第三方依赖版本清单 · 校验"
status: "done"
updated_at: "2026-10-04"
---

# Verify

> 执行者:orchestrator(即实现者,单执行单元),已读 `notes/E1-dependency-versions.md`。

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成
**执行单元数**:1 个(`E1`)

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全
- [x] Layer 0 已完成且契约未再变动
- [x] 自测通过

## 重复实现消除

无。框架层坐标只在 BOM 声明一次并快照,检查任务不复述任何版本。

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| version catalog | interview | 不能 import 第三方 BOM;多一种写法 |
| `enforcedPlatform` | interview | 静默降级第三方库所需版本 |
| 坐标组黑名单判定「框架依赖」 | `E1` | 列不全;改由 Gradle 解析 BOM 判定 |
| 按坐标求下游新增约束 | `E1` | 下游重复钉上游已钉模块时会漏判;改按约束对象求差 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| `weiran4j/README.md` | `E1` | 必要连带(「所有版本号只在这里」与新 CP-4 矛盾) | 保留 |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

基线 `main@f711fb1`;未怀疑存量红灯,在全部代码改完后直接运行。

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿 | `evidence/build.log` |
| test | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿(前端 225;`weiran-app` 集成测试 32,0 跳过) | `evidence/test.log` |
| lint | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿(含 `verifyFrameworkVersions`:84 个运行时模块,71 个框架管理,白名单 2 条) | `evidence/lint.log` |

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 0.1 | `E1` | 契约 §2.2 新行 + 写法示例 | ☑ |
| 0.2 | `E1` | `00-决策记录.md` D-013 | ☑ |
| 1.1 | `E1` | `weiran-dependencies/build.gradle.kts` 框架层快照 / 白名单 / apply / 下游约束差集 | ☑ |
| 1.2 | `E1` | `build-logic/.../FrameworkVersionsCheck.kt`、`BootAppConventionsPlugin.kt` | ☑ |
| 6.1 | `E1` | `constitution.md` CP-4 | ☑ |
| 6.2 | `E1` | `AGENTS.md`、`project.md` SL-2 | ☑ |
| 7.1 | `E1` | 无清单:`runtimeClasspath` 与改动前 `diff` 无差异;任务通过 | ☑ |
| 7.2 | `E1` | 临时清单四场景,见下 | ☑ |
| 7.3 | `E1` | 上表 L7 | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 8.1 通知下游 | 合入 main 后的发布动作 | ☑ |
| 9.1 `artifacts.md` | 归档前写 | ☑ |

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| Data Flow 1 | 快照 → apply → 下游新增约束 → extra | 同;差集改按约束对象(更严,意图不变) | ☑ |
| Data Flow 2 | 四条判定 | 同 | ☑ |
| 跨模块契约 | 五个 extra 键 | 同 | ☑ |
| 分层与装配 | 上游白名单两条 | 同,理由已写 | ☑ |
| Observability | 汇总行 + 失败信息含处理办法 | 同 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| FR-009 / 无下游清单时行为不变(AC-1) | 类路径逐行一致 | `dependencies` 输出前后 diff | ☑ |
| FR-009 / 登记框架未管理的依赖(AC-2) | 解析到登记版本,检查通过 | 临时清单 guava 33.5.0-jre:`dependencyInsight` 显示 `(by constraint)`,任务 BUILD SUCCESSFUL | ☑ |
| FR-010 / 下游钉高框架依赖(AC-3) | 失败,含 g:a、框架与实际版本 | jackson-databind 2.22.1:失败,列出 databind 及连带 8 个 Jackson 模块 | ☑ |
| FR-010 / 下游钉低框架依赖(AC-4) | 失败,指出下游清单 | jackson-databind 2.20.0:失败,「下游清单 … 约束了框架已管理的 …」 | ☑ |
| FR-010 / 有理由的白名单放行(AC-5) | 当前上游通过 | lint 证据中任务通过 | ☑ |
| FR-010 / 理由为空的白名单(AC-5) | 失败 | 「白名单 … 没有写理由」,BUILD FAILED | ☑ |
| AC-6 | 文档都写明业务版本在下游清单 | CP-4 / §2.2 / AGENTS.md / SL-2 | ☑ |
| AC-7 | L7 全绿 | 证据 | ☑ |

## 越界检查

`git status`:除 plan 第 5 节「拥有」外只有 `weiran4j/README.md`,已申报为必要连带。无未申报越界。

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| `weiran4j/README.md` | — | `E1` | ☑ | 必要连带 |

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | 无 | — | — |

## 遗留问题

- 无需登记的新问题。测试类路径不检查、上游两条存量漂移,均已在 interview「本次不决定」与上游白名单理由中写明;后者在依赖升级后由任务告警提示清理。

## 流程反馈

- 下游清单这类「构建期扩展点」用临时文件实跑验证即可,build-logic 没有测试目录;若以后检查逻辑变复杂,值得给 build-logic 加 Gradle TestKit 测试。

## 结论

- [x] 集成完成(单执行单元时:越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff ｜ ☐ 打回 L5 ｜ ☐ 打回 L2

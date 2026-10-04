---
title: "downstream-dependency-versions 需求澄清"
status: "done"
updated_at: "2026-10-04"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。

## 一句话需求

> 用户原话,不要改写。(来源:mono4j 会话转来的需求,经本会话出方案、用户确认)

- weiran4j 再开一个下游扩展点——让 fork 下游登记自己的第三方依赖版本,不改上游文件。

背景:下游 mono4j 要接阿里云短信官方 SDK `com.aliyun:dysmsapi20170525`,后续还有 OSS、Excel 导入、PDF 等。
宪法 CP-4 要求版本号只出现在上游 `weiran-dependencies/build.gradle.kts`,下游每加一个依赖都得改上游文件(D-012 的原则被打破)。

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 下游清单用什么形态? | 本会话方案、用户确认:`weiran4j/weiran-dependencies/biz-dependencies.gradle.kts`,存在才 apply | 不用 version catalog:TOML 不能表达 import 第三方 BOM,还会引入第二种依赖写法 |
| 2 | 下游钉了框架已管理依赖的版本,能否构建期检测? | 实测可行(scratchpad init 脚本):对比「仅用上游 BOM 解析出的版本」与 `runtimeClasspath` 实际版本;模拟钉 `jackson-databind:2.22.1` 检出 10 处漂移 | 做成构建期检查,在 `weiran-app` 的 `check` 里失败 |
| 3 | 检查多严? | 用户选「失败 + 写理由的白名单」 | 任何漂移都失败;豁免逐条写 `g:a → 理由`(CP-6) |
| 4 | 现有上游有没有漂移? | 实测有 2 处传递依赖漂移:`org.yaml:snakeyaml` 2.4→2.5(Spring BOM 内 jackson-dataformat-yaml 2.21.4 拉高)、`org.apache.commons:commons-lang3` 3.17.0→3.20.0(springdoc → swagger-core-jakarta 拉高) | 上游白名单先收这 2 条并写理由,否则检查一上线即红 |
| 5 | 下游直接给框架依赖往低钉怎么办? | Gradle 取高版本,低钉被静默忽略,漂移对比抓不到 | 另加一条:下游清单对框架已管理模块的直接约束一律失败,不论高低,不可豁免 |
| 6 | 检查代码放哪? | 质量门禁归 build-logic(CP-5) | 放进 `BootAppConventionsPlugin`,`weiran-app` 自动获得 |

## 边界

### 要做

- `weiran-dependencies/build.gradle.kts`:先登记框架层(两个 BOM + 上游 constraints),快照为「框架管理清单」;再在 `biz-dependencies.gradle.kts` 存在时 apply;记录下游新增的约束
- 上游漂移白名单(含 snakeyaml、commons-lang3 两条及理由);下游白名单入口
- build-logic:`verifyFrameworkVersions` 任务,挂到 `weiran-app` 的 `check`
- 宪法 CP-4 改写;契约 §2.2 加一行;AGENTS.md 结构说明;`project.md` SL-2;决策 D-013;CHANGELOG 不涉及(未改流水线)

### 明确不做

- 不改 Spring Boot / MyBatis-Plus BOM 的版本,不为消除那 2 处漂移去钉版本或排除传递依赖
- 不用 `enforcedPlatform` / `strictly` 强制版本(会静默降级第三方库的传递依赖,方向相反的静默)
- 不检查 `testRuntimeClasspath`、`annotationProcessor` 等非运行时配置
- 不检查下游第三方 BOM 把框架依赖**往低**拉的情况(Gradle 取高,实际版本不变,无害)
- 不创建 `biz-dependencies.gradle.kts`(下游独占)
- 不接入阿里云 SDK 本身(那是下游的 change)

### 本次不决定(留给后续 change)

- 是否把漂移检查扩展到测试类路径
- 上游白名单里两条漂移是否通过升级 Spring Boot 或钉版本消除

## 验收标准

- [ ] AC-1 无 `biz-dependencies.gradle.kts` 时,`weiran-app` 的 `runtimeClasspath` 解析结果与改动前一致,`check` 通过
- [ ] AC-2 临时清单登记一个框架未管理的依赖(带版本),某模块不带版本声明它,依赖可解析到该版本,`verifyFrameworkVersions` 通过
- [ ] AC-3 临时清单给框架已管理的依赖钉更高版本 → `verifyFrameworkVersions` 失败,输出含 `g:a`、框架版本、实际版本
- [ ] AC-4 临时清单给框架已管理的依赖钉更低版本 → `verifyFrameworkVersions` 失败,输出指出该约束不允许
- [ ] AC-5 漂移在白名单(上游或下游)中有理由时,检查通过;白名单里理由为空时失败
- [ ] AC-6 宪法 CP-4、契约 §2.2、AGENTS.md、`project.md` SL-2 都写明「业务版本在下游清单」
- [ ] AC-7 `project.json` 三条 L7 命令全绿

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 清单形态 | Gradle 脚本插件 | version catalog | TOML 不能 import BOM;多一种写法 |
| 框架版本防护 | 构建期对比 + 失败 | 只靠规范 / warning | 用户选择;静默升级不报错是本需求最大的风险 |
| 强制方式 | 检测漂移 | `enforcedPlatform` | 强制会静默降级第三方库所需版本,同样不报错 |
| 存量漂移 | 白名单写理由 | 钉版本消除 | 钉版本属于改框架依赖,超出本 change |
| 检查位置 | build-logic 约定插件 | 写在 `weiran-app/build.gradle.kts` | CP-5:质量规则只在 build-logic |

## 未决歧义

- 无

## 对下游的硬约束

- CP-4 改写后仍要求「每类版本只有一处」:框架 → `weiran-dependencies/build.gradle.kts`,业务 → `biz-dependencies.gradle.kts`
- 版本号仍不得出现在模块 `build.gradle.kts`
- 构建用 JDK 21;不开配置缓存(检查任务在执行期读取其他项目的 extra,依赖这一点)
- 上游永不创建 `biz-dependencies.gradle.kts`

## Gate

- [x] 「未决歧义」已清零
- [x] 验收标准均可判定真假
- [x] 「明确不做」已列出且足够具体

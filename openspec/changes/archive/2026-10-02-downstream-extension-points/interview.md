---
title: "downstream-extension-points 需求澄清"
status: "done"
updated_at: "2026-10-02"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。
> 澄清阶段信息密度最高,不落盘则换 session 即蒸发,后续所有文档都是它的降级复述。

## 一句话需求

> 用户原话,不要改写。(来源:mono4j 会话转来的需求,经本会话出方案、用户确认)

- 在 weiran4j 上游开 8 个「下游扩展点」(U1–U8)……目标:上游开好这些扩展点后,下游不需要修改任何框架文件,同步时就不会冲突。

背景:下游 `/Users/duoli/Projects/qidian-zhongxi/mono4j` 以 git fork 跟随 weiran4j(weiran4j 作 upstream remote,
以后 `git merge` 同步);业务只新增一个模块 `weiran-cqt`(包 `com.weiran.cqt`),给前台 uniapp 的接口前缀 `/api-web/**`。

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | 哪些框架点已确认无需改? | `AuthInterceptor` 只拦 `/api/**`;`GlobalExceptionHandler` 已是 `LOWEST_PRECEDENCE`;页面由 page-registry glob 自动收集 | 这三处不在本 change 范围 |
| 2 | U1 遇到五层不齐的目录怎么办? | 用户确认本会话方案:构建失败并列出缺的层 | 不静默跳过——静默跳过会让半成品模块整个不参与构建,运行时才发现 |
| 3 | U6 基座行里「当前用到 119」的计数放哪? | 用户确认:移回 01 契约 | `business-modules.md` 的基座行只放稳定信息,上游此后不再改该文件 |
| 4 | U7 用 glob 合并还是一次性补足图标? | 用户确认:glob 合并 | 补足永远不完整,全量 lucide 约 600KB;glob 可摇树 |
| 5 | U8 的 sourcePaths 通配 check.mjs 支不支持? | 实测:check.mjs 把路径原样交给 `git log` / `git status` 的 pathspec,`weiran4j/weiran-*` 与原四条结果一致 | 只改 `project.json`,不改 `check.mjs` |
| 6 | 清单外的冲突点(components 登记、bizs 文件索引)本次处理吗? | 用户确认:一并处理 | components-registry 额外读可选的 `components.biz.md`;bizs 索引允许下游放可选的 `README.biz.md` |
| 7 | uniapp H5 跨域需要框架支持吗? | 不需要,下游在 cqt 模块自写 `WebMvcConfigurer` | 不在本 change 范围 |
| 8 | state-waitlist 守卫需要为 `README.biz.md` 改吗? | 读代码:它扫 `state/bizs/*.md` 全部文件,新文件只是多一份没有条目的 md | 守卫不改,只在 `bizs/README.md` 说明 |

## 边界

### 要做

- U1 `weiran4j/settings.gradle.kts` 自动发现业务模块,结果写入 `gradle.extra["weiran.businessModules"]`;
  `weiran-dependencies/build.gradle.kts` 的本仓坐标同样改读该清单(explore 反向修正:那里有第三份写死列表)
- U2 `weiran-app/build.gradle.kts` 按 U1 清单加依赖与 jacoco 聚合
- U3 `application.yml` 加 `spring.config.import: optional:classpath:application-biz.yml`
- U4 `application.yml` 加 `spring.flyway.out-of-order: true`
- U5 `weiran-framework` 新增 `@SkipApiResponse`,`ApiResponseBodyAdvice.supports()` 遇到即不包,补测试
- U6 业务模块登记表移到 `weiran4j/docs/business-modules.md`,同步 §2.1、CP-14/CP-15、AGENTS.md 引用
- U7 `web/src/utils/icons.tsx` 用 `import.meta.glob` 合并 `web/src/biz/icons*.ts` 的追加图标
- U8 `openspec/project.json` sourcePaths 改通配;AGENTS.md 加「仓库根存在 `AGENTS.biz.md` 时必读」
- 额外 1:`openspec/guards/components-registry.mjs` 额外读取可选的 `openspec/rules/advisory/components.biz.md`
- 额外 2:`openspec/state/bizs/README.md` 说明下游表索引写在可选的 `README.biz.md`
- 附带:`weiran4j/docs/00-决策记录.md` 加 D-012;`openspec/design/CHANGELOG.md` 记流水线改动;`design/check.md` 同步守卫变更;`project.md` SL-1~SL-4 同步(explore 反向修正:SL-2/3/4 文字也过时)

### 明确不做

- 不改 `AuthInterceptor` / `GlobalExceptionHandler` / `page-registry.ts`
- 不为 `/api-web` 提供任何框架级认证、CORS、响应包络——包络由下游 Controller 自己返回
- 不改 `check.mjs` 本体
- 不改 `state-waitlist.mjs`
- 不改任何已合入的 Flyway 脚本,不新增 Flyway 脚本
- 不新建 `weiran-cqt` 或任何示例业务模块(验证用的临时目录验完即删,不入库)
- 不支持多份 `application-biz.yml`(classpath import 不支持通配)
- 不处理下游往 `artifact.md` / `cross-biz.md` 追加条目时的冲突

### 本次不决定(留给后续 change)

- 下游往 `state/bizs/artifact.md`、`cross-biz.md` 登记条目的冲突怎么避(可能也要 `*.biz.md`)
- 多业务模块各自携带默认配置的方案(如 `application-biz-<module>.yml` 逐个 import)

## 验收标准

- [ ] AC-1 当前仓库 `./gradlew projects` 列出的业务项目与改动前完全一致(`weiran-base-{api,domain,application,infrastructure,adapter}`)
- [ ] AC-2 新建五层齐全的 `weiran4j/weiran-demo/` 后,无需改任何 `.kts`,`projects` 即列出 `weiran-demo-*` 五个项目,且 `weiran-app` 的依赖含 `:weiran-demo-adapter`、`:weiran-demo-infrastructure`
- [ ] AC-3 某 `weiran-*` 目录只含部分层子目录时,Gradle 配置阶段失败,报错信息含模块名与缺失的层名
- [ ] AC-4 `application.yml` 含 `spring.config.import: optional:classpath:application-biz.yml` 与 `spring.flyway.out-of-order: true`,classpath 无 `application-biz.yml` 时应用照常启动(集成测试全绿)
- [ ] AC-5 Controller 类上标 `@SkipApiResponse` 时,返回对象原样输出(响应 JSON 无 `code` 包络)
- [ ] AC-6 方法上标 `@SkipApiResponse` 时该方法不包,同一 Controller 未标注的方法仍包成 `{code:0,...}`
- [ ] AC-7 `@SkipApiResponse` 方法返回 `String` 时原样输出,不被序列化成 JSON 字符串
- [ ] AC-8 `weiran4j/docs/business-modules.md` 存在且只含表头与「框架 + 基座」一行,该行不含会随基座增长而变的数字;§2.1、CP-14、CP-15、AGENTS.md 的登记引用都指向它
- [ ] AC-9 `web/src/biz/icons*.ts` 具名导出的 `icons` 被合并进 `MENU_ICONS` / `MENU_ICON_NAMES`;无此类文件时行为与现在相同;与基座重名时以基座为准(vitest 覆盖三种情况)
- [ ] AC-10 `openspec/project.json` 的 sourcePaths 用 `weiran4j/weiran-*` 覆盖全部后端模块,`pnpm openspec:check` 通过
- [ ] AC-11 AGENTS.md 含「仓库根存在 `AGENTS.biz.md` 时必读」
- [ ] AC-12 `openspec/rules/advisory/components.biz.md` 存在且提到某组件名时,该组件不再报 `REPO/components-unregistered`;文件不存在时守卫行为不变
- [ ] AC-13 `bizs/README.md` 写明下游表文档的索引放 `README.biz.md`
- [ ] AC-14 `project.json` 三条 L7 命令全绿

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 业务模块登记方式 | 目录扫描自动发现 | 手写列表 / 读外部清单文件 | 下游只需建目录,零框架文件改动 |
| 不齐的五层 | 构建失败 | 静默跳过 | 跳过会让模块整个消失,问题延到运行时 |
| 下游图标 | glob 合并下游文件 | 一次性补足白名单 / 全量 lucide | 补不全;全量体积大 |
| 图标重名 | 基座优先 + dev warn | 下游覆盖基座 | 基座菜单图标不应被下游意外改掉 |
| sourcePaths | git pathspec 通配 | 改 check.mjs 支持 glob | 已实测可用,不动流水线本体 |
| 下游组件 / 表索引 | 可选的 `*.biz.md` 旁路文件 | 下游改上游清单 | 旁路文件上游永不创建,merge 无冲突 |

## 未决歧义

- 无

## 对下游的硬约束

- 已合入的 Flyway 脚本不改(CP-7);本 change 不新增脚本
- 改契约先改 `01-架构与接口契约.md` 再改代码
- `weiran-framework` 新注解不得依赖基座或业务(CP-12)
- 上游此后不得创建 `AGENTS.biz.md`、`application-biz.yml`、`web/src/biz/`、`components.biz.md`、`README.biz.md`,也不再修改 `business-modules.md` 的表体——这些是留给下游的文件
- 构建用 JDK 21,先 `spotlessApply` 再 `check`

## Gate

- [x] 「未决歧义」已清零
- [x] 验收标准均可判定真假
- [x] 「明确不做」已列出且足够具体

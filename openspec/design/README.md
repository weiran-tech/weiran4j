# OpenSpec 规格治理流水线 · 使用说明

> **本目录(`openspec/design/`)是「心路历程」:这套流水线为什么长成现在这样。**
> 全部是**说明性**文档 —— 删掉不影响流程运行(判定口径都在会被自动注入的三处,见下文 §4)。
>
> | 目录 | 时态 | 回答 |
> |---|---|---|
> | [`rules/`](../rules/) | 现在必须 | 我该遵守什么 |
> | **`readme/`** | **过去为什么** | **这套流水线为什么长这样** |
> | [`state/`](../state/) | 现状 + 将来 | 现在实际什么样,还欠着什么 |
>
> **本目录内容**:`pipeline.md`(设计说明)、`check.md`(`check.mjs` 说明书)、
> `CHANGELOG.md`(流程演进史)、`why-*.md` ×3(单点论证)、`sample-*.md`(0→1 实操演练)、本文(上手指南)。

本仓库用 OpenSpec 的 **artifact 状态机**驱动需求开发:从一句话需求到归档,每一步都有明确的产出物、
职责边界和闸门。本文是入口 —— 讲清**怎么用**、**每步谁负责什么**、**每个文件干什么**。

设计说明与各条规则的「为什么」在同目录的 `pipeline.md` / `why-*.md`;本文不重复,只做导航与操作说明。

> **本目录是纯说明文档,流水线不依赖它** —— agent 遵守的判定口径全部住在
> `config.yaml` / `schema.yaml` / `templates/`。详见 §3。

---

## 0. 三分钟上手

用 skill 驱动,不要直接敲 `openspec` CLI —— CLI 只在调试(看某层完整提示词)时才需要:

1. **建 change**:调用 `/openspec-new-change`
2. **看当前该做哪一步**:`openspec status --change <change-id>`,或直接跳到第 3 步
3. **推进一步**(取第一个 ready 的 artifact,生成它):调用 `/openspec-continue-change`
   想一次生成到能开始实现,用 `/openspec-ff-change`(见 §6 的限制——它不认 L3/L9 人工闸门,design 没批也会一口气冲过去)
4. **随时自检**(会返回非零退出码):
   ```bash
   pnpm openspec:check
   pnpm openspec:check -- --change <change-id>
   ```

首次 clone 后跑一次,把 git 钩子装上:

```bash
pnpm hooks:install    # 等价于 git config core.hooksPath .githooks
```

> ℹ️ `config.yaml` 顶层已写 `schema: devops-workflow`,`/openspec-new-change` 不传 `--schema`
> 也会正确落地为 `devops-workflow`(8 个 artifact 全部被追踪,`@fission-ai/openspec@1.9.0` 已验证)。
> `openspec status --json` 里的 `planningHome.defaultSchema` 固定回显 `"spec-driven"`,那只是
> CLI 包的默认值展示,不代表实际解析结果——实际用的 schema 看同一份 JSON 顶层的 `schemaName` 字段。
> 若某个 CLI 版本上不生效,保底可以显式传 `--schema devops-workflow`。
> schema 一旦创建就写进该 change 的 `.openspec.yaml` 并**钉死**,之后改项目配置不影响已建的 change。

---

## 1. 流水线全貌

```
L0 interview ──→ L1 explore ──→ L2 proposal → specs / design → tasks
                                        ↓
                              【L3 人类审阅 design】←──────────┐
                                        ↓                     │
                              L4 exec/plan.md(交接点 1)      │ 设计缺陷
                                        ↓                     │ 显式回退边
                              L5 实现 + 收尾笔记               │
                                        ↓                     │
                     【L7 硬闸门:build / test / lint 全绿】───┤ 红灯回实现
                                        ↓                     │
                              L6+L8 exec/verify.md ───────────┘ 集成 + 归属判定
                                        ↓
                              【L9 人类审阅最终 diff】
                                        ↓
                              L10 sync → archive
```

违反两个核心不变量(需求侧单向下游、反馈侧显式回退边),整套治理就会退化——详见
`pipeline.md`「两个交接方向」。

---

## 2. 每个步骤的职责

下表是导航;每层的判定口径写在 `schema.yaml` 的 `instruction`、`templates/` 的模板骨架
与 `config.yaml` 的 `rules` 中,生成时会自动进入 agent 的提示词。

| 层 | artifact | 产出 | 这一层**只**负责 | 闸门 |
|---|---|---|---|---|
| **L0** 消歧 | `interview` | `interview.md` | 把模糊需求逼到无歧义:边界、验收标准、关键取舍 | 未决歧义清零(人) |
| **L1** 现实校验 | `explore` | `explore.md` | 带着需求读代码,产出**共享层命中表** | 共享层列全(人) |
| **L2-a** 规格化 | `proposal` | `proposal.md` | WHY / WHAT,**不写 HOW**;逐项勾横切关注点 | 两张表逐项填满 |
| **L2-b** | `specs` | `specs/<能力>/spec.md` | 能力级 delta,每个场景是一条潜在测试用例 | 格式(机器) |
| **L2-c** | `design` | `design.md` | HOW,保持意图粒度,不写逐文件步骤 | **L3 人类审阅** |
| **L2-d** | `tasks` | `tasks.md` | 需求的**权威源**,粒度是「做什么」 | design 已批准 |
| **L4** 交接点 1 | `exec-plan` | `exec/plan.md` | 把需求编译成可并行的执行图 | L4 Gate 十项 |
| **L5** 实现 | (apply) | 代码 + `exec/notes/*.md` | Layer 0 串行 → 后续并行,测试跟随实现 | tasks 勾完 |
| **L7** 硬闸门 | — | `exec/evidence/*.log` | **唯一验证「能不能跑」的一层** | 三绿(机器) |
| **L6+L8** 集成与校验 | `verify` | `exec/verify.md` | ①集成:merge、解冲突、消重、判定越界性质(单执行单元时压成一行)<br>②校验:实现与规格是否一致 + **归属判定** | 实现已完成 + 三绿 + 结论行 |
| **L9** 人闸 | — | — | 人看合并后的整体 diff | 签字 |
| **L10** 结案 | — | `changes/archive/` | delta 合入主 specs,记录 revert 锚点 | 上面三者齐全 |

L1 explore、L4 契约冻结、L8 归属判定是最容易被跳过、代价也最大的三处;
为什么,见 `pipeline.md` 对应层级的说明。

---

## 3. 每个文件的职责

### 3.1 说明文档(本目录 · **流程不依赖它**)

| 文件 | 职责 | 什么时候读 |
|---|---|---|
| `README.md` | 本文:使用说明、步骤职责、文件职责、校验 | 第一次接触 / 忘了命令时 |
| `pipeline.md` | 流水线设计说明:每层为什么这样切、提示词来自哪 | 想理解「为什么这么设计」 |
| `why.md` | 设计论证三节:①8 条交接规则的理由 ②收尾笔记为什么是硬要求 ③worktree 判据背后的实测证据 | 想知道某条规则为什么存在、或想推翻/调整判据时 |
| `check.md` | `check.mjs` 说明书:编排顺序、`project.json` 字段语义、插件契约、棘轮机制、加检查怎么做 | 要改 `check.mjs` / `project.json` / `guards/` 之前 |
| `sample-*.md` | 以真实 change 为样本的 0→1 实操演练 | 第一次走完整流程时 |
| `CHANGELOG.md` | **流程本身**的修改记录 | 想知道某条规则何时/为何改的 |

> ### 写哪儿:事实 vs 历史
>
> | 内容 | 归属 |
> |---|---|
> | **现在必须怎么做**(断言、格式、闸门) | `config.yaml` / `schema.yaml` / `templates/` / `rules/enforced/constitution.md` |
> | **机制性理由**(「archive 按标题字符串匹配,所以标题要稳定」) | 同上,一句话带过 |
> | **历史证据**(「已修过 4 起」「1249 条里 318 条」「已挂过 3 条主 spec」) | **只在 `CHANGELOG.md`** |
>
> 事实文档里不写历史证据 —— 那些数字没人维护,过期后会让人按错误的前提做判断;
> 而它们真正的用处(「这条规则当初为什么加、依据是什么」)在 CHANGELOG 里查得到。
> 同理,**现状快照数字也不写进事实文档**:存量看 `--inventory`,代码现状 grep 一下就有。

> ⚠️ **本目录是纯说明性的。** agent 实际遵守的判定口径全部住在
> `schema.yaml` / `templates/` / `config.yaml` —— 因为 CLI 只把那三处拼进提示词。
> **删掉整个 `readme/`,流水线照常运行。**
>
> 反过来说:**改本目录不会改变 agent 的行为**。要改规则,请改 §3.2 里的那三处。

### 3.2 流程本体(**agent 真正读的东西**)

每个文件的**意义**(为什么存在)、**作用**(它做什么)、**存在定义**(必须满足什么才算有效):

#### `openspec/config.yaml`

- **意义**:CLI 唯一的项目级配置入口。`readme/` 里写一万字也进不了提示词,这里写一行就进。
- **作用**:`context` → 渲染成 `<project_context>`;`rules` → 渲染成 `<rules>`(CLI 标注为 "constraints for you to follow"),位置在 `<dependencies>` 之前。
- **存在定义**:
  - 顶层必须有 `schema` 与 `context`
  - `rules` 逐 artifact 写 —— **不支持 `*` / `all` 全局键**(已实测)
  - 每条 rule 必须加引号:含 `: `(冒号空格)或 ` #` 的裸字符串会破坏 YAML 纯量
  - 每条 rule 必须**自包含**,不得写「详见某文件」—— 那是祈使句,不是依赖

#### `openspec/schemas/<workflow>/schema.yaml`

- **意义**:状态机定义。「下一步做什么」由依赖图算出,不靠人记、不靠约定。
- **作用**:声明 8 个 artifact 的 `requires` / `generates` / `instruction`,以及 `apply` 段。
- **存在定义**:
  - 每个 artifact 必须有 `id` / `generates` / `instruction` / `requires`
  - `requires` 必须构成 DAG(有环则永远算不出 ready)
  - `apply.requires` 必须是 `[exec-plan]` 而非 `[tasks]` —— 这一条把「没有执行计划不准动手」从口头约定变成机器强制
  - instruction 必须自包含判定口径,不得只写指针

#### `openspec/schemas/<workflow>/templates/`(9 份)

- **意义**:模板是**唯一会被全文注入提示词**的载体,所以它同时是「文档骨架」和「项目事实的住处」。
- **作用**:给每个 artifact 提供章节骨架、清单、Gate;`exec-note.md` 是唯一的非 artifact 模板(手工复制)。
- **存在定义**:
  - 与 artifact 一一对应(`spec.md` 对应 `specs/**`);多出的模板只能是显式声明的非 artifact 模板
  - 项目特定内容必须包在 `openspec:slot` 槽里(见 §7)
  - 槽必须**成对、不嵌套、非空** —— 由 `TEMPLATE/slot-malformed` 强制(空 / 嵌套 / 未闭合 / 开闭不匹配 / 有闭无开五种形态)
  - 模板只此一份。别处再放一份必然漂移,而 CLI 只读这一份

| 模板 | 对应 | 内含的槽 |
|---|---|---|
| `interview.md` `explore.md` | L0 / L1 | `shared-layers`(在 explore) |
| `proposal.md` `spec.md` `design.md` `tasks.md` | L2 | `project-structure` `crosscuts`(在 proposal)、`design-sections`、`task-groups` |
| `exec-plan.md` `exec-verify.md` | L4 / L6+L8 | `worktree-tradeoffs`(在 exec-plan) |
| `exec-note.md` | L5(非 artifact) | — |

#### `openspec/project.json`

- **意义**:项目事实中**必须被程序读取**的那一小部分。刻意保持极小 —— 其余项目事实是自由文本,放在槽里。
- **作用**:告诉 `check.mjs` 三件事:源码在哪(证据新鲜度要比对)、三条命令是什么、加载哪些项目级检查。
- **存在定义**:
  - `sourcePaths`:git pathspec 数组。**留空则跳过证据新鲜度检查**(不猜)
  - `commands`:L7 硬闸门命令,**键名即日志名** —— `L7/evidence-missing` 按它逐个要求 `exec/evidence/<键>.log`。加一条命令就自动多要一份日志,不用改 `check.mjs`
  - `checks`:相对 `openspec/` 的插件路径数组;文件不存在会报 `REPO/plugin-error`,不会静默
  - `ratchet.rules`:存量棘轮基线,由 `guards/ratchet.mjs` 消费(经 `ctx.project` 传入,插件不自己读文件)
  - `capabilities.legacyChangeNamed` / `knownArchiveDrift`:两份历史豁免清单,只出不进
  - **不写 schema / workflow 名** —— 那是 `config.yaml` 顶层 `schema:` 的职责,写两份没有任何检查看守
  - 文件本身可缺失 —— 缺失时退化为「只跑与宿主项目无关的通用检查」

#### `openspec/guards/*.mjs`(项目级检查插件)

- **意义**:把「本项目特有的失效模式」与通用流程检查分开,换项目时整个目录替换。
- **作用**:本仓库两个 —— `drizzle-journal.mjs` 守 5 条(journal 可解析、`when`/`idx` 单调、tag 唯一、SQL 文件存在),`ratchet.mjs` 守 2 条(存量只降不升)。
- **存在定义**:
  - `export default { id, run(ctx) }`;缺 `run` 会报 `REPO/plugin-error`
  - 可选 `inventory(ctx)`:返回给 `--inventory` 打印的行,不进日常检查
  - 可选 `watches: []`:`--hook` 除 `openspec/` 外还要在写到哪些路径时触发。**项目特有的路径写在这里,不写进 `check.mjs`** —— 写进通用核心的话换项目时 grep 不到
  - `ctx` 提供只读能力 + `err` / `warn` + `project`(即 `project.json` 的内容,插件不自己读配置文件);**插件不能改变编排**,抛异常会被捕获并报 `REPO/plugin-error`
  - 必须在 `project.json` 的 `checks` 里声明才会加载

#### `openspec/check.mjs`

- **意义**:状态机只看文件在不在,内容对不对一概不看。本文件补的就是这一段。
- **作用**:通用校验(L0~L10 文档结构 + 模板一致性 + 插件加载契约 + META)
  + 加载项目级插件(`drizzle-journal.mjs`、`ratchet.mjs`)
  + 提供 `--hook` 模式给 Claude Code 即时反馈。
  **各类各多少条,跑 `--explain` 现算,本文不复述** —— 手写的数字会过期,而过期的数字比没有更糟。
- **`node openspec/check.mjs --write-index`** —— 重新生成能力索引 `openspec/specs/README.md`
  (53 个能力的名字 / 需求数 / 状态 / 一句话职责)。**唯一会写文件的模式**;
  归档后跑一次,`L10/spec-index` 会拦过期的索引。**不要手改那个文件** ——
  手改的索引下次归档后再次过期,而过期的索引比没有索引更糟:它让人以为自己看过全貌了。
- **`node openspec/check.mjs --inventory`** —— **存量盘点**:日常检查刻意不报的那些债
  (老写法标题、缺判据的场景、已退役能力、棘轮离目标还差多少 + 分阶段退役计划)。
  那些存量天天报就是天天被忽略,但「不报」不等于「不存在」—— 要看欠了多少就跑这条。
- **`node openspec/check.mjs --explain`** —— **想知道「这么多检查都在防什么」,跑这条,不要读代码或本文档。**
  它按层打印每条检查守护的失效模式,且有 `META/check-undocumented` 兜底:
  加检查忘了写说明直接报错,删检查后说明还留着会 warn。**清单不会再漂** ——
  这也是本文不再复述检查总数与检查清单的原因(见 §4)。
- **存在定义**:零依赖(只用 node 标准库);`error` → 退出码 1,`warn` → 不影响退出码;
  `--hook` 模式**不阻断**写入,只回灌结果。

### 3.3 一次 change 的产物

完整目录树见 `pipeline.md`「目录结构树」。归档后整包搬到
`openspec/changes/archive/YYYY-MM-DD-<change-id>/`,`exec/` 一并归档;
沉淀下来的主规格在 `openspec/specs/<能力>/spec.md`。下表是每份产物的存在定义。

#### 每份产物的存在定义

「存在定义」= 这份文件必须满足什么,才算真的存在(而不是占了个文件名)。括号里是对应的检查 ID。

| 产物 | 存在定义 |
|---|---|
| `interview.md` | 有 `## 未决歧义` 节,且 proposal 已存在时该节不得有未勾选项(两者同属 `L0/ambiguity`:缺节 warn,带未决项进 proposal 判 error);验收标准逐条 `AC-N` 编号(`L0/ac-numbered`,warn) |
| `explore.md` | 共享层三张表逐行填写;写明「不会碰的目录」——它是 L8 越界判定的基线 |
| `proposal.md` | 有 `## Capabilities` 且与 `specs/` 目录**一一对应**(`L2a/capabilities-section`、`capability-has-spec`、`spec-declared`);两张勾选表每行有标记**且**有说明(`L2/required-table` —— 由模板里的 `<!-- openspec:required-table -->` 标注驱动,不是 proposal 专属检查) |
| `specs/<能力>/spec.md` | 至少一个 `### Requirement:`(3 个 `#`);每个需求至少一个 `#### Scenario:`(**正好 4 个 `#`**);delta 操作标题齐全;REMOVED 必须有 Reason + Migration;**每条需求带能力内唯一的 `[FR-NNN]` 稳定 ID**,ADDED 不得撞已占用的号、MODIFIED/REMOVED/RENAMED 必须指向主 spec 已有的号(`L2b/*`) |
| `design.md` | 有 frontmatter(`L2c/frontmatter`);**逐条填「## 宪法对照」表**,每条 `CP-N` 都要有标记与说明,⚠ 偏离还要写够理由(`L2c/constitution-check`);`tasks.md` 一旦存在,必须已有 `approved_by` + `approved_at`(`L3/design-approved`)——这是 L3 人闸唯一的落章位置 |
| `tasks.md` | 每条形如 `- [ ] X.Y 描述`(`L2d/task-id-format`);编号全局唯一(`L2d/task-id-unique`);**实现类任务回指需求 ID**,每条 delta 需求至少被一条任务引用(`L8/requirement-coverage`);**不许写「无变更」类空条目、不许把流水线闸门写成任务**(`L2d/empty-task`,warn) |
| `exec/plan.md` | 有 `## 1. 任务映射`(`L4/mapping-section`);每条 task 已映射或已声明未映射(`L4/task-mapped`);未映射条目必须写原因(`L4/unmapped-needs-reason`);实现已开始则契约冻结表不得留 ☐(`L4/contract-frozen`);集成已开始则 Gate 十项须勾完(`L4/gate-checked`) |
| `exec/notes/*.md` | 集成阶段一旦开始,目录必须非空(`L5/notes-required`);plan 里声明的每个执行单元都应有对应笔记(`L5/note-per-unit`,warn) |
| `exec/evidence/*.log` | verify 已生成则 `project.json` 的 `commands` 每个键都要有对应日志,且非空(`L7/evidence-missing`);日志时间不得早于 `sourcePaths` 的最后改动(`L7/evidence-fresh`) |
| `exec/verify.md` 集成节 | 只在实现完成后填写;越界修改逐条判定性质(必要连带 / 越界扩大);单执行单元时只留越界汇总 |
| `exec/verify.md` | 必须含「通过 / 打回实现 / 打回设计」之一(`L8/verdict-line`);应提到越界检查(`L8/overreach-section`,warn) |

判定刻意做成**分阶段生效**:`L3/design-approved` 只在 `tasks.md` 已存在时升为 error,
`L4/contract-frozen` 只在 `exec/notes/` 已存在时才查。写到一半的中间态不会误报。

### 3.4 存放位置的两条硬规矩

执行层产物不要放 `.omc/`,说明文档放 `openspec/design/` 而不是 `docs/`——
判据与踩过的坑(`*.log` 曾把 `exec/evidence/*.log` 一并吃掉)见 `pipeline.md`「存放位置的坑」。

---

## 4. 校验:三层强制力

状态机只强制两件事 —— `requires` 依赖顺序,和 `generates` 路径**能否匹配到文件**。
**内容对不对,它一概不看。** 下面三层补的就是这一段。

| 层 | 时机 | 强制力 | 装在哪 |
|---|---|---|---|
| **提示** | 生成 artifact 时 | 靠 agent 自觉 | `schema.yaml` 的 `instruction` + `config.yaml` 的 `rules` |
| **即时反馈** | agent 写完文件当场 | 不阻断,回灌结果 | `.claude/settings.json` 的 PostToolUse 钩子 |
| **硬拦截** | 提交 / CI | 非零退出码 | `.githooks/pre-commit` + `.github/workflows/openspec-check.yml` |

### `openspec/check.mjs` 覆盖了什么

```bash
pnpm openspec:check                    # 活跃 change(不含 archive)
node openspec/check.mjs --change <id>  # 只查一个
node openspec/check.mjs --all          # 连 archive 一起
node openspec/check.mjs --json         # 机器可读
node openspec/check.mjs --explain      # ← 全部检查 ID + 各自守护的失效模式
```

> ### 检查清单只有一处:`--explain`
>
> **想知道有哪些检查、每条防什么,跑 `node openspec/check.mjs --explain`,不要读本文或代码。**
> 它按层分组打印全部检查,并由 `META/check-undocumented` 兜底:加检查忘了写说明直接报错,
> 删检查后说明还留着会 warn —— **那份清单不会漂,写在本文里的必然漂**。
>
> 本节曾经手抄过一份代表性清单,结果是四个互不相同的总数散在全文,外加几个早已被合并或删除的
> 检查 ID(详见 `CHANGELOG.md` 2026-08-18 条)。**清单已删除,不要再加回来** ——
> 需要在文档里点名某条检查时,只在讲清某个具体判据时引用单条,不要复述全集。
>
> 这条禁令**只管清单**。`check.mjs` 的**机制**(编排顺序、`project.json` 字段语义、
> 插件契约、棘轮判定、加一条检查怎么做)此前只散在 2600+ 行代码的注释里,
> 现在写在 [`check.md`](check.md) —— 它同样不列清单,只指向 `--explain`。

`error` 返回退出码 1;`warn` 不影响退出码。判定逻辑刻意做成**分阶段生效** ——
例如 `L3/design-approved` 只在 `tasks.md` 已存在时升为 error,写到一半的中间态不会误报。

### CLI 自带校验

```bash
pnpm openspec:validate    # openspec validate --strict --changes
```

CI 里两步都跑。注意包名:npm 上的 `openspec` 是无关的 0.0.0 占位包,真实 CLI 是 **`@fission-ai/openspec`**。

---

## 5. 常见操作

| 场景 | 做法 |
|---|---|
| 不知道下一步做什么 | 直接调用 `/openspec-continue-change`;想先看进度再决定,用 `openspec status --change <id>` |
| 想看某层的完整提示词(调试用) | `openspec instructions <artifact> --change <id>` |
| 检查没过,想知道判定依据 | 看报错里的检查 ID,对照本文 §4;想知道该规则为什么存在,看 `why-*.md` |
| 改了规则想让 agent 遵守 | 改 `templates/`(结构化清单)、`schema.yaml` 的 instruction(判定口径)或 `config.yaml` 的 `rules`(祈使要求)。**写进 `readme/` 不会生效** |
| 提交被 pre-commit 拦 | 修掉 error;应急可 `git commit --no-verify`,但 CI 仍会拦 |
| 该不该切 worktree | 查 `templates/exec-plan.md` 第 5 节的判据表(生成时会自动出现在提示词里)。涉及 `packages/shared`、drizzle migration、或需要起 server 的任务,答案是**不切** |
| 实现中发现设计有问题 | **停下,回 L2 重开设计**,重新走 L3 审阅。不要在 exec/ 里「顺手修正」 |

### 写 artifact 时最容易踩的格式坑

1. `#### Scenario:` **正好 4 个 `#`**,`### Requirement:` 正好 3 个 —— 写错不报错,只是被静默忽略。
2. tasks 每条必须是 `- [ ] X.Y 描述`,编号全局唯一。
3. `exec/plan.md` 的映射表第一列必须写**编号**(`2.1` / `3.1-3.3` / `§6`),写章节标题等于没映射。
4. proposal 的 Capabilities 与 `specs/` 目录必须一一对应。
5. 两张勾选表每行都要有标记**且**有说明。

这些都在模板里有骨架,也都被 `check.mjs` 覆盖 —— 照模板写,基本不会踩。

---

## 6. 状态机管不了的三件事

`openspec status` 只看文件在不在,不看内容对不对。三类 gate 装不进状态机:
**L3/L9 人类审阅**、**L7 build/test/lint**、**内容质量** ——
`check.mjs` 只能查到字段与日志的存在性和新鲜度,**是否真审过、日志是否真实,只能靠人**。

还有一条容易踩:**`isComplete: true` ≠ 实现完成**,且通用 skill(`openspec-ff-change` /
`openspec-continue-change`)**不认本仓库的 L3/L9 语义** —— `design.md` 没有 `approved_by` 时
它们照样把 `design` 标成 `done`。

> 完整表格与「为什么没有机制会替你挡住」见 `pipeline.md`「状态机管不了的三件事」。

---

## 7. 抽离边界:哪些能带走,哪些必须重写

流程本体已按「可移植 / 项目特定」切开。切开的方式不是抽一份配置 schema,而是
**在模板里留槽**——因为项目事实的**形状**本身就因项目而异,硬做成字段表只会削足适履。

### 7.1 槽机制

项目特定内容包在成对标记里,标记本身写明「问什么、为什么问、答案要求」:

```md
<!-- openspec:slot shared-layers
  【项目特定 · 换项目必须重写本槽】
  问:本项目里,哪些文件会被多个并行单元同时写入,或含有不可自动合并的序号 / 注册表?
  为什么问:这张清单决定 L4 能不能并行。漏一项,L5 必然冲突。
  答案要求:可逐行比对的清单,每行写清冲突原因;序号型资源要标注 git 会不会报冲突。
-->
                            ← 项目自己填,表格/分组/列表随意
<!-- /openspec:slot shared-layers -->
```

**问题跨项目不变,答案形状完全不同。** 同一个 `shared-layers` 槽:

| | 本仓库(TS monorepo) | Laravel / poppy | Spring Boot |
|---|---|---|---|
| 注册表 | `shared/src/index.ts`、`App.tsx` | ServiceProvider、composer autoload | `AutoConfiguration.imports`、parent pom |
| 跨模块契约 | `shared/src/{types,validation}.ts` | `poppy/*/src/Contracts/` | `common` module 的 DTO |
| 序号型资源 | `drizzle/00NN_*.sql` + `_journal.json`(**git 不报冲突**) | `database/migrations/` 时间戳 | Flyway `V{n}__`(**checksum 失败直接拒绝启动**) |

这就是不该做成字段表的证据:三列没有一个共同字段,但问题一字未改。

### 7.2 当前的六个槽

| 槽 | 位置 | 问什么 |
|---|---|---|
| `shared-layers` | `templates/explore.md` | 哪些文件会被并行单元同时写、含不可合并的序号/注册表 |
| `project-structure` | `templates/proposal.md` | 本项目由哪些可独立影响的部分组成 |
| `crosscuts` | `templates/proposal.md` | 哪些是「每次都该问一遍、漏了没人发现」的横切关注点 |
| `design-sections` | `templates/design.md` | 技术设计必须回答哪些问题才算完整 |
| `task-groups` | `templates/tasks.md` | 实现任务按什么顺序分组才能反映依赖方向 |
| `worktree-tradeoffs` | `templates/exec-plan.md` | 开一个 worktree 要付出什么,哪些任务因此不该切 |

槽的完整性由 `TEMPLATE/slot-malformed` 强制(它一条覆盖空 / 嵌套 / 未闭合 / 开闭不匹配 / 有闭无开):
**成对、不嵌套、非空**。槽内容**对不对**校验不了——共享层清单是否列全,只有懂这个项目的人能判断。

### 7.3 换项目的完整清单

| 动作 | 对象 |
|---|---|
| **原样带走** | `schema.yaml` 的依赖图与 instruction、模板的槽外部分、`check.mjs` 的通用检查、`config.yaml` 的 rules 骨架 |
| **重写六个槽** | 见 §7.2。六个槽的项目事实已全部抽到 `openspec/rules/enforced/project.md`(`SL/WT/CC/PK/TG/DS-N`,机制同 `rules/enforced/constitution.md`,见 `pipeline.md` §"rules/enforced/project.md 用的是同一套机制,已覆盖全部六个槽")——重写时先改这里,再同步各模板槽的镜像(表格行或标题后缀),`TEMPLATE/profile-rows` 会拦不一致。唯一例外是 `project-structure` 槽里的「共享层影响」粗粒度勾选表,不建独立 ID,继续人工对照 `SL-N` 勾选 |
| **改 `project.json`** | `sourcePaths` / `commands` / `checks` |
| **换 `guards/*.mjs`** | 本仓库的 `drizzle-journal.mjs` → 目标项目的序号资源检查 |
| **改 `config.yaml` 的 `context`** | 语言、技术栈 |
| **重写 design/ 与 state/** | 说明文档与现状/待办不可移植(它们讲的是本项目的判断与欠账),但目录划分可以照搬 |

准确地说:与宿主语言相关的检查**只有插件里那些**(本仓库是 Drizzle journal + 棘轮),
`check.mjs` 本体的 L0~L10 / TEMPLATE / META / `REPO/plugin-error` 全部与语言无关,
其中 `L7/evidence-fresh` 靠 `sourcePaths` 参数化。
**具体各多少条不写在这里 —— 跑 `node openspec/check.mjs --explain` 现算**(理由见 §4)。

有两处「代码通用、内容是项目事实」的检查,换项目时**只换数据不换代码**:

| 检查 | 通用的部分 | 项目事实住在哪 |
|---|---|---|
| `L2c/constitution-check` | 「每条原则都要被回答」这条规则 | `openspec/rules/enforced/constitution.md` 的 `### CP-N`(动态读取,加原则不用改代码) |
| `REPO/ratchet-*` | 「存量只降不升」这条规则 | `openspec/project.json` 的 `ratchet.rules[]`(pattern + baseline) |

**棘轮值得单独说一句**:`L2c/constitution-check` 只能验证 design.md **回答了**每条原则,
验证不了答案是**真的** —— 填 ☑ 的人有没有真的没用旧协议,那张表看不出来。
让「MUST NOT 新增 X」这类条款真正生效的不是更聪明的评审,而是把存量数冻成基线、只准降不准升。
它同时是宪法里那些数字的唯一事实源:宪法只引用基线,不复述数字,否则数字一过期宪法就开始撒谎。

### 7.4 新项目落地步骤:先拿真实信息,再填槽

§7.2 的六个槽解决的是「规则怎么定」,不解决「怎么先认识这个陌生仓库」——填槽本身要求
你已经大致懂这个项目的结构,这是前置依赖,§7.1-§7.3 都没覆盖。这一步应该复用通用工具,
不要给 openspec 再造一套引导文件:

1. **先跑一次仓库结构扫描**(如 `deepinit`,产出层级化 `AGENTS.md`:包边界 / 目录职责 /
   跨模块契约在哪 / 序号型资源有哪些)。这一步与 openspec 无关、跨项目通用,只负责给出
   「真实信息」,不涉及本流水线的任何判定口径。
2. **把扫描结果写进 `openspec/rules/enforced/project.md`**——六个槽的项目事实(`SL/WT/CC/PK/TG/DS-N`)
   都在这里,是第 1 步产出的**摘录**,不需要重新调研。`project-structure` 槽里的「共享层影响」
   粗粒度勾选表除外,直接照 `SL-N` 的结论人工勾选,不单独建 ID。
3. **同步六个模板槽的镜像**(表格行或标题后缀),跑 `pnpm openspec:check` 确认
   `TEMPLATE/profile-rows` 没有报错——两边 ID 集合不一致会被它拦下来。

两步解耦的好处:第 1 步(拿真实信息)每个仓库都要做、与技术栈无关,可以脱离本流水线单独复用;
第 2、3 步(转成流程判据 + 镜像同步)才是 openspec 专用的。换项目时只是把第 1 步的产出接到
第 2 步,不需要重新发明引导机制。

---

## 8. CLI 命令 ↔ skill 对照(该用哪个入口)

本仓库已经把"驱动流程"这件事从"手敲 `openspec` CLI"迁到"调用 skill"。下表是完整对照 ——
左列是曾经/理论上可以敲的 CLI 命令,右列是现在应该用的 skill,不一致的地方直接写清楚为什么。

| 阶段/动作 | 原始 CLI 命令 | 现在用的 skill | 说明 |
|---|---|---|---|
| 建 change | `openspec new change <id> --schema devops-workflow` | `/openspec-new-change` | 本仓库 `config.yaml` 已默认 `devops-workflow`,不传 `--schema` 也对(实测版本与说明见 §0,此处不复述版本号) |
| 查看某个 change 的进度 | `openspec status --change <id>` | 不换 —— 继续用 CLI,它是只读自检命令,各 skill 内部也会自己调它 | 不属于"驱动"类命令,不需要包一层 skill |
| 推进一步(单个 artifact) | 手动跑 `openspec instructions <artifact> --change <id>` 再照着写文件 | `/openspec-continue-change` | 一次只生成 1 个 artifact 就停,适合想每一步都亲自看一眼的场合 |
| 批量生成到能开始实现(L0→L2,到 `tasks`/`exec-plan` 为止) | 无(得手动循环 `instructions` + 写文件) | `/openspec-ff-change` | ⚠️ **不认 L3 闸门**——已实测:`design.md` 没有 `approved_by` 也会被判 `done`,它会直接冲到 `tasks`。只在你确定不需要中途审阅时用 |
| 全流程(L0 interview → L10 archive),只在真正的人工闸门停 | 无 | **`/devops-ff-workflow`** | 本仓库自建的编排 skill,唯一同时覆盖全部 10 层且守住 L0/L3/L9 三个真实闸门的入口 —— **默认应该用这个**,而不是逐层手动调 CLI 或逐个调子 skill |
| 实现任务(L5) | 手动读 `tasks.md` 逐条改代码、逐条勾 checkbox | `/openspec-apply-change` | 循环到完成或卡住为止,不会每个 task 都停下来问;`devops-ff-workflow` 的 L5 阶段内部也是调它 |
| 生成集成记录 + 校验结论(L6+L8) | 手动照 `openspec instructions verify` 的模板写 | 不用现成 skill —— `/devops-ff-workflow` 内部按模板自己生成 | ⚠️ **不要用 `/openspec-verify-change` 顶替 L8**:它产出的是 Completeness/Correctness/Coherence 报告,不是本 schema 要求的 `exec/verify.md`(通过/打回实现/打回设计结论行),`check.mjs` 的 `L8/verdict-line` 认不出它的格式 |
| 跑 build/test/lint 产出 L7 证据 | 手动跑 `pnpm build/test/lint` 并存日志 | 无 skill 替代(`openspec-verify-change` 根本不跑这三个命令,已实测)——`devops-ff-workflow` 的 L5 阶段直接跑 | 这是机器闸门,不需要包成 skill,但也不能指望现成 skill 帮你跑 |
| 合并 delta spec 到主 spec | 手动改 `openspec/specs/**/*.md` | `/openspec-sync-specs` | 可以独立调用,`devops-ff-workflow` 的 L10 阶段也会在有 delta spec 时自动调它 |
| 归档 | `openspec archive <id>` 或手动 `mv` 到 `archive/` | `/openspec-archive-change` | ⚠️ **它不会替你做 L9 签字**——只警告"还有 artifact/task 没完成",不会问"最终 diff 你看过了吗"。必须先由人(或 `devops-ff-workflow` 的 L9 阶段)明确签字,再调它 |
| 调试:看某一层完整提示词 | `openspec instructions <artifact> --change <id>` | 无 skill 替代,继续用 CLI | 唯一保留纯 CLI 用法的场景 —— 这是查看/调试,不是驱动流程 |
| 校验产出物格式 | `pnpm openspec:check`、`pnpm openspec:validate` | 无 skill 替代,继续用 CLI/pnpm 脚本 | 校验类命令本身就不是"驱动步骤",不在替换范围内 |

**该用哪个入口,一句话版:**

- 想从一句话需求跑到归档,中途只在真正该停的地方停 → `/devops-ff-workflow`
- 想每一步自己确认一遍再继续 → `/openspec-continue-change`
- 只是想先把 L0-L2 的文档快速写完,还不着急实现,且知道要自己补 L3 审阅 → `/openspec-ff-change`
- 调试、看依赖图、看某层完整提示词 → 直接用 `openspec` CLI

---

## 附:流水线自身的待办池

> 盘点范围:`openspec/` 下的 schema / 模板 / 校验 / 目录结构 / skill —— **流程本身**的欠账,
> 不是业务代码的(业务代码见 [`state/bizs/`](../state/bizs/),每张表一份文件,架构 / 技术问题在 `bizs/artifact.md`)。
>
> 本节是**待办池,不是 change**。要动手时按 `openspec/changes/` 的流程另开 change。
> 关掉一条就从这里删掉,并在 [`CHANGELOG.md`](CHANGELOG.md) 记一条、注明是哪个 change 关的。
>
> 2026-09-26 由 `state/waitlist-workflow.md` 并入本节(对齐 mono4ts:内容量小、更新频率低,
> 放在读者已经在看的地方,比单独开一个文件少一层「要不要点进去看」的判断)。
> 原 P-001、P-003 已关闭,记录见 `CHANGELOG.md`。

### 未处理

- [ ] **`design/` 下的说明文档大量描述 mono4ts,而非本仓库。**(原 P-002)
  `CHANGELOG.md` 2026-09-26 之前的条目记的是 **mono4ts 流水线的演进史**(worktree 改名、drizzle journal 守卫、
  棘轮基线等);`pipeline.md` / `why.md` / `check.md` 里也散着 `packages/`、drizzle 的例子。
  读的人会以为那是本仓库发生过的事。这些是说明性文档,流水线不依赖它们,过期不会变红 ——
  但 `design/check.md` 例外,它被 `META/check-doc-stale` 机械看守,必须与 `check.mjs` 同步。
  关闭条件:逐份复核,把描述 mono4ts 的部分改写成本仓库事实,或明确标注「上游来源,本仓库未发生」。

- [ ] **编排 skill 仍叫 `devops-ff-workflow`,且是入库副本。**
  上游 mono4ts 已改用 `devops-openspec-workflow`(指向外部 skills 仓库的软链接、gitignore,schema 无关,
  靠读 `openspec/rules/` 取项目事实)。本仓库的 `.claude/skills/devops-ff-workflow/SKILL.md` 是早先的入库副本,
  上游修的问题不会自动同步过来。症状:两边流水线行为逐渐漂移,上游修过的坑本仓库还会再踩一次。
  关闭条件:决定改用软链接的 `devops-openspec-workflow`(同步改 `CLAUDE.md` 的 skill 表与 `rules/README.md`),
  或明确保留入库副本并记录理由。

- [ ] **门禁 ③(CI)缺失。** 见 [`state/bizs/artifact.md#05`](../state/bizs/artifact.md)。
  流水线侧的影响:`openspec check` 只有 hook(不阻断)与 pre-commit(可 `--no-verify` 绕过)两道,
  没有一道「绕不过去」的关口。

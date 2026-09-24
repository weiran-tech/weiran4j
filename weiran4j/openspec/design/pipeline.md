# 流水线设计说明

> **本文讲「流程为什么长这样」,不是操作手册,也不是规范正文。**
> 操作命令见 [README.md](README.md);agent 实际遵守的判定口径住在
> `schema.yaml` / `templates/` / `config.yaml`(理由见下方「提示词来自哪」)。

```
deep-interview ──→ interview-notes.md(要落盘,作为 propose 的输入)
        ↓
/openspec-explore(必须,不是可选)──→ 现实约束反馈回 interview
        ↓
/openspec-propose → proposal / specs / design / tasks
        ↓  ← ← ← ← ← ← ← ← ← ← ← ← ← ┐(设计缺陷回退边)
   【人类审阅 design.md】             │
        ↓                             │
交接点 1:派生执行计划(不回写 spec)  │
  · 依赖图 + 拓扑分层                 │
  · 共享层改动单独成第 0 层,串行先做 │
  · 契约冻结(接口签名先定)          │
  · 测试归属实现任务,不单独切分      │
        ↓                             │
分层 fan-out(第 0 层串行 → 后续并行)│
  · 每层结束即 merge 回主干,不长挂   │
  · subagent 失败 → 重试 / 降级串行 ──┤
        ↓                             │
交接点 2:集成                        │
  · 由参与过实现的 agent 做,或先写   │
    集成笔记再销毁上下文              │
        ↓                             │
【硬闸门:build + test + lint 全绿】───┤(红则回实现,不进下游)
        ↓                             │
/openspec-verify-change               │
  ├─ 通过 ────────────────┐           │
  └─ 不通过 → 判定归属:   │           │
       代码错 → 回实现 ────┼───────────┤
       spec 错 → 回 propose┘───────────┘
        ↓
【人类审阅最终 diff】
        ↓
/openspec-sync-specs → /openspec-archive-change(记录 revert 锚点)
```

## 每一层的作用

### L0 · deep-interview —— 消歧

- **输入**:一句话需求
- **职责**:把模糊需求逼到无歧义,明确非目标、边界、验收标准
- **产出**:`interview.md`(**必须落盘**。原流程这条边没有产出物,是最大的信息泄漏点——澄清阶段信息密度最高,却只存在于上下文里,换 session 即蒸发)
- **闸门**:歧义项清零才能往下

### L1 · explore —— 现实校验

- **输入**:`interview.md`
- **职责**:带着需求去读代码,确认现有实现、可复用点、真实约束、影响面
- **产出**:`explore.md`(或并入 design 的「现状」章)+ **反向修正 interview 的结论**
- **闸门**:必须执行,不是 `explore / propose` 二选一。跳过它,所有设计都是纸上推演,现实冲突会推迟到 subagent 动手时才爆

### L2 · propose —— 规格化

- **输入**:interview + explore
- **职责**:写清「要什么、为什么、行为如何」,**保持意图粒度**
- **产出**:`proposal.md` / `design.md` / `specs/<capability>/spec.md` / `tasks.md`
- **关键**:`tasks.md` 是**需求的权威源**,不是任务分配表。不要为了好并行往里塞实现细节

### L3 · 人类审阅 design —— 第一道人闸

- **职责**:人看方向对不对。这是全流程唯一一次「改起来还便宜」的审阅点
- **产出**:批准 / 打回 L2
- **理由**:后面每一层的返工成本都是这一层的 10 倍

### L4 · 交接点 1:派生执行计划 —— 意图 → 工程

- **输入**:`tasks.md`
- **职责**:把需求清单编译成可并行的执行图,四件事:
  1. **依赖图**:哪些 task 互为前置,拓扑分层
  2. **共享层前置**:`packages/shared` 类型、schema、migration、路由/DI 注册 → 全部归入第 0 层,**串行先做**
  3. **契约冻结**:跨任务的接口签名先定死,后续并行任务照签名写
  4. **worktree 边界**:一层内互不重叠的任务才切 worktree;测试**归属实现任务**,不单独成条
- **产出**:`exec/plan.md`
- **关键**:它是 `tasks.md` 的**下游派生物,单向,不回写 spec**。这样 spec 保住意图粒度,不退化成工单

### L5 · 分层 fan-out —— 实现

- **输入**:`exec/plan.md`
- **职责**:第 0 层串行 → 后续层并行。**每层结束即 merge 回主干**,worktree 不长挂(冲突成本随挂起时间平方增长)
- **产出**:代码 + 每个 subagent 的**收尾笔记**(改了什么、为什么、埋了什么坑)
- **失败分支**:超时/产出不可用 → 重试一次 → 仍失败则降级串行,由 orchestrator 亲自做
- **关键**:收尾笔记是为 L6 准备的。subagent 上下文一销毁,这部分知识永久丢失,而集成冲突需要的恰恰是它

### L6 · 交接点 2:集成(并入 `exec/verify.md` 第一节)

- **输入**:各 worktree diff + 收尾笔记
- **职责**:merge、解冲突、消除重复实现、统一命名
- **产出**:`exec/verify.md` 的「一、集成记录」节(冲突清单 + 解法 + 被牺牲的方案 + 越界汇总)
- **执行者**:**优先由参与过实现的 agent 做**,不得已才由 orchestrator 兜底——orchestrator 是全链上对每份 diff 了解最少的角色
- **规模自适应**:`plan.md` 只有 1 个执行单元时,本节只写「单执行单元,无并行集成」+ 越界汇总。
  实测依据:单单元 change 的原 `integration.md` 中位 6.9 KB,而 4 单元的只有 2.3 KB ——
  没东西可集成的反而写得最长,那不是信息,是在填模板

> **L4(exec-plan)没有专门命名的 skill**——它是 schema.yaml 里普通的 artifact,
> 靠通用的 `/openspec-continue-change`(单步)或 `/openspec-ff-change`(批量)生成,不像 explore/propose/
> verify/sync/archive 那样有一对一的 skill。**`ff-change` 批量生成时不认 L3 人类审阅闸门**——已实测:
> `design.md` 没有 `approved_by` 也会被判定为 `done`,`tasks` 随即变 `ready`,`ff-change` 会直接往下
> 生成,不会为审阅停下来。详见 `README.md` §6。

### L7 · 硬闸门:build / test / lint —— 唯一验证「能跑」的一层

- **职责**:全绿才准进下游
- **产出**:`exec/evidence/*.log`
- **闸门**:红灯 → 直接回 L5,不允许进 verify
- **理由**:规格一致性 ≠ 可运行性,两者正交。原流程从 propose 到 archive 全是文档校验,没有一个节点真的跑过代码,于是 `archive` 可以在编译不过的情况下触发,而流程自身毫不知情

### L8 · verify —— 规格一致性

- **输入**:绿灯代码 + design/tasks
- **职责**:比对实现与规格;附加检查 subagent 是否越界(须区分**越界修改**与**必要的连带修改**,后者申报而非禁止,否则要么被误报淹没,要么逼 agent 藏改动)
- **产出**:`exec/verify.md`
- **失败分支(关键)**:不通过时必须先**判定归属**——
  - 代码错 → 回 L5
  - **spec 错 → 回 L2 重开设计**
  - 原流程这里直接 `→ sync(纠偏)`,等于把默认处理设成「改文档迁就代码」,不需要任何人重新决策就能一路滑到 archive,规格治理层退化成给既成事实盖章

### L9 · 人类审阅最终 diff —— 第二道人闸

- **职责**:人看合并后的整体改动。`archive` 是强状态转移(结案,后续改动须开新 change),必须有人签字

### L10 · sync → archive —— 结案

- **职责**:delta spec 合入主 specs;change 整包归档,**记录 revert 锚点**(merge commit / tag)
- **闸门**:L7 绿 + L8 通过 + L9 签字,三者齐全

## 目录结构树

```
openspec/
├── config.yaml
│
├── rules/                               # 【现在必须】要遵守的东西 —— 详见 rules/README.md
│   ├── README.md                        #   目录准入标准 + 新规则该写到哪(六步决策流程)
│   ├── constitution.md                  #   工程宪法:跨 change 不变的项目级原则(CP-N)
│   │                                    #     design.md 必须逐条对照(L2c/constitution-check),
│   │                                    #     清单从本文件的 `### CP-N` 标题动态读取
│   ├── project.md                       #   项目结构事实:六个槽的 SL/WT/CC/PK/TG/DS-N 条目
│   │                                    #     六个模板槽逐行/逐标题镜像(TEMPLATE/profile-rows)
│   ├── components.md                    #   可复用的公共组件清单(写前端前先查再造)
│   ├── schema.md                        #   流水线各层踩过的坑(L0–L10 分节)
│   └── memory.md                        #   工具行为与代码库欠账(前四者装不下的既有事实)
│
├── project.json                         # 项目事实中【必须被程序读取】的极小集,**唯一的结构化配置文件**
│                                        #   含 ratchet 存量棘轮基线(只降不升),宪法里的数字以它为唯一事实源
├── check.mjs                            # 通用校验(56 项),零依赖
├── checks/                              # 项目级检查插件
│   ├── drizzle-journal.mjs              #   迁移台账 5 项
│   ├── spec-xref.mjs                    #   主 spec 需求交叉引用完整性
│   └── ratchet.mjs                      #   存量棘轮 4 项 —— 让宪法的「MUST NOT 新增 X」可执行
│
├── readme/                              # 【过去为什么】说明文档,**流程不依赖此目录**
│   ├── README.md                        #   使用说明:命令、步骤职责、文件职责、校验
│   ├── pipeline.md                      #   本文件:流水线设计说明 + 每层职责
│   ├── why.md                       #   设计论证(三节):8 条交接规则 / 收尾笔记 / worktree 成本与并行判据
│   ├── sample-*.md                      #   0→1 实操演练(以真实 change 为样本)
│   └── CHANGELOG.md                     #   流程本身的修改记录
│
├── reality/                             # 【现状 + 将来】现实是什么样、还欠着什么,**流程不依赖此目录**
│   ├── README.md                        #   准入标准与维护约定
│   ├── waitlist.md                      #   技术债 + 业务问题待办池(不是 change,要动手就另开 change)
│   ├── waitlist-workflow.md             #   流水线自身的欠账
│   └── pages/<模块>.md                  #   页面/模块现状说明(索引与共用骨架见 reality/README.md)
│
├── schemas/
│   └── devops-workflow/                 # 项目自定义 workflow schema(状态机定义)
│       ├── schema.yaml                  # 8 个 artifact 的依赖图 + 每层 instruction
│       └── templates/                   # CLI 实际使用的模板(唯一来源,判定口径都在这)
│           ├── interview.md  explore.md
│           ├── proposal.md   spec.md     design.md   tasks.md
│           ├── exec-plan.md  exec-verify.md         # verify = L6 集成 + L8 校验
│           └── exec-note.md             # L5 收尾笔记骨架(非 artifact,手工复制)
│
├── specs/                               # 主规格:已 archive change 的沉淀
│   ├── README.md                        # 能力索引(生成物,--write-index 产出,L10/spec-index 兜底)
│   └── <capability>/spec.md
└── changes/
    ├── <change-id>/                     # 一次 change 的完整生命周期
    │   ├── .openspec.yaml               # 记录本 change 用的 schema,创建时钉死
    │   │
    │   ├── interview.md                 # L0  澄清结论、非目标、验收标准
    │   ├── explore.md                   # L1  现状调研、可复用点、影响面
    │   ├── proposal.md                  # L2  为什么做
    │   ├── design.md                    # L2  怎么设计
    │   ├── tasks.md                     # L2  做什么(意图粒度,权威需求源)
    │   ├── specs/
    │   │   └── <capability>/spec.md     # L2  delta spec
    │   │
    │   └── exec/                        # 执行层:tasks.md 的下游派生,单向
    │       ├── plan.md                  # L4  依赖图/分层/契约/worktree 边界
    │       ├── notes/                   # L5  subagent 收尾笔记(集成的输入)
    │       │   ├── 00-shared-contract.md
    │       │   ├── 01-credit-service.md
    │       │   └── 02-credit-mq.md
    │       ├── verify.md                # L6+L8 集成记录 + 校验结论 + 不一致的归属判定
    │       └── evidence/                # L7  运行时证据
    │           ├── build.log
    │           ├── test.log
    │           └── lint.log
    │
    └── archive/
        └── YYYY-MM-DD-<change-id>/      # 整包搬入,exec/ 一并归档
```

### 存放位置的坑

执行层产物**不要放 `.omc/`**。`.omc/` 是 gitignore 的运行时状态,linked worktree 一删就没;而 `exec/plan.md`、`verify.md`、`evidence/` 属于必须跟 change 一起归档的审计证据。`.omc/` 只承载单 session 的临时状态。

同理,说明文档放在 `openspec/design/` 而不是 `docs/ai-specs/`——本仓库 `.gitignore` 忽略了整个 `docs/`,放那里等于只存在于单机,团队共享和 code review 都用不上。**判据:凡是需要被别人看到、或需要跟 change 一起归档的,必须在版本库里。**

注意区分两件事:**说明文档在版本库里**(便于共享),但**流程不依赖它** ——
判定口径都在 `schema.yaml` / `templates/` / `config.yaml`,删掉 `readme/` 流程照常运行。

### 两个交接方向(核心不变量)

```
需求侧(单向下游)     openspec/*.md  ──→  exec/*.md       不允许反向回写
反馈侧(显式回退边)   exec 发现设计缺陷 ──→ 回 L2 重开      不允许用 sync 消化
```

## 运行方式

整条流水线由 OpenSpec CLI 的 **artifact 状态机**驱动,定义在
`openspec/schemas/devops-workflow/schema.yaml`。「下一步是什么」不靠人记,
是 `requires` 依赖图算出来的。

> **命令、推进循环、各层触发方式,见 [README.md](README.md)。**
> 本文只保留设计层面的说明。

`apply.requires` 设成 `[exec-plan]` 而不是 `[tasks]`:**没有执行计划就不准开始实现**,
把 L4 交接点从口头约定变成了机器强制。

### 提示词来自哪(决定了规范该住在哪)

`openspec instructions` 的输出只由**三处**拼成,一起喂给 agent:

- `<project_context>` / `<rules>` ← `openspec/config.yaml`
- `<instruction>` ← `schema.yaml` 里该 artifact 的 `instruction` 字段
- `<template>` ← `templates/` 下对应的模板文件(**全文注入**)

**其他任何文档都不会被自动加载。** 在 instruction 里写「详见 XXX.md」只是一句祈使句,
不是一条依赖 —— agent 不主动去 Read,那份内容就等于不存在,而它读没读你无从观测。

这条事实决定了本流水线的一条组织原则:

> **凡是 agent 必须遵守的判定口径,都必须住在上面三处之一;
> 其余文档只承载「为什么」,删掉不影响流程运行。**

因此 `openspec/design/`(含本文)是**纯说明性**的:
共享层清单住在 `templates/explore.md`,L4 检查清单住在 `templates/exec-plan.md` 的 Gate,
收尾笔记骨架住在 `templates/exec-note.md`,8 条交接规则的要点住在 `schema.yaml` 的 instruction。

#### `rules/enforced/constitution.md` 是这条原则的一个受控例外

`openspec/rules/enforced/constitution.md` **同样不会被自动加载**。它之所以还能生效,靠的是把「判定口径」
和「说明」拆到了两处:

| 住在哪 | 内容 | 谁读 |
|---|---|---|
| `templates/design.md` 的「宪法对照」表 | 每条 `CP-N` 的**标题** + 三种标记的含义 | agent(全文注入) |
| `check.mjs` 的 `L2c/constitution-check` | 每条都必须有标记与说明,⚠ 还要写够理由 | 机器 |
| `rules/enforced/constitution.md` | 每条原则的**正文、为什么、现状** | 人;agent 需要细节时主动 Read |

也就是说:**「有哪些原则、必须逐条回答」是硬注入 + 硬校验的,「原则具体说了什么」才在
rules/enforced/constitution.md 里**。agent 即使一次都不打开它,也无法跳过这一层 —— 最坏情况是回答得潦草,
而潦草会在 L3 人闸暴露。

代价是出现了第二份 CP 清单(宪法一份、模板一份),两份必然漂移 ——
`TEMPLATE/constitution-rows` 就是用来兜这个的:两边对不上直接报错。
**改宪法时不要只改一处。**

#### `rules/enforced/project.md` 用的是同一套机制,已覆盖全部六个槽

六个槽(见 §7.2)原本都是把答案直接写死在模板槽里。逐一检查后发现:每个槽真正**逐 change
变化**的只是"这一项这次动没动"这一列(checkbox / 空表格),行本身(叫什么名字、有几行、
映射到哪个包)和 `rules/enforced/constitution.md` 的 `CP-N` 一样是稳定的项目结构事实。于是全部抽到
`openspec/rules/enforced/project.md`,按 `rules/enforced/constitution.md` 的模式拆成两处:

| 条目前缀 | 来源槽 | 镜像方式 |
|---|---|---|
| `SL-N` | `shared-layers`(`explore.md`) | 表格行 |
| `WT-N` | `worktree-tradeoffs`(`exec-plan.md`) | 表格行 |
| `CC-N` | `crosscuts`(`proposal.md`) | 表格「项」列前缀 |
| `PK-N` | `project-structure`(`proposal.md`,仅"影响的包"表) | 表格行 |
| `TG-N` | `task-groups`(`tasks.md`) | 分组标题后缀 |
| `DS-N` | `design-sections`(`design.md`) | 章节标题后缀 |

| 住在哪 | 内容 | 谁读 |
|---|---|---|
| 六个模板槽各自的镜像(表格行或标题后缀) | 每条 ID + 一行摘要 | agent(全文注入) |
| `check.mjs` 的 `TEMPLATE/profile-rows` | 两边 ID 集合必须一致(泛化的 `idCoverage()`,不管内容是表格还是标题) | 机器 |
| `rules/enforced/project.md` | 每条的**完整说明**(冲突原因、判据依据、既定约定) | 人;模板已经够用,一般不需要主动 Read |

**一个例外**:`project-structure` 槽里的「共享层影响」勾选表(5 类别粗粒度汇总),
内容与 `SL-N`(11 条明细)重叠但粒度不同,**没有**建第二套 ID 与之同步——强行 1:1 对齐要么
拆到 11 行失去汇总意义,要么让检查支持"一个 ID 对应多行"的模糊映射,复杂度换不回真实的
漂移防护。这张表继续由人工对照 `SL-N` 勾选,`L2/required-table` 保证它不会整行留空。

**模板的唯一来源是 `openspec/schemas/devops-workflow/templates/`。**
不要在别处再放一份 —— 两份必然漂移,而 CLI 只读这一份。

### 状态机管不了的三件事

`openspec status` 只看文件在不在,不看内容对不对。以下三类 gate 装不进状态机:

| gate | 落成什么 | 现在靠什么 |
|---|---|---|
| L3 / L9 人类审阅 | `design.md` 的 `approved_by`、L9 签字 | `check.mjs` 检查字段存在性;**是否真审过只能靠人** |
| L7 build/test/lint | `exec/evidence/*.log` | `check.mjs` 检查存在性 + 新鲜度;**日志内容仍可伪造** |
| 内容质量 | — | `instruction` + `rules` + 人 |

**另外:`isComplete: true` ≠ 实现完成。** `verify` 是 artifact,
`continue-change` 在代码还没写时就会想生成它们 —— 靠这两层 instruction 开头的前置检查,
以及 `check.mjs` 的 `L5/notes-required`、`L7/evidence-missing` 拦住。

**通用 skill 不认本仓库的 L3/L9 语义。** `openspec-ff-change` / `openspec-continue-change`
是原封不动的通用 skill:`design.md` 没有 `approved_by` 时,`openspec status --json` 仍会把
`design` 标成 `done`、`tasks` 标成 `ready` —— CLI 的依赖图只看文件在不在,不校验审批字段,
`config.yaml` 的 `rules.design` 能不能生效完全取决于当时执行的 agent 有没有把这行字当真,
**没有任何机制会替你挡住**。想真正拦住,只能在 L3/L9 两点让编排逻辑自己去读 `design.md` 的
frontmatter 或最终 diff 的审阅状态,不能信任 `status --json` 或 skill 自带的暂停逻辑。

真正的机制级强制需要 git hook 或 CI(见 `README.md` §4「校验:三层强制力」)。
但写进 instruction 至少让「跳过」变成一个需要主动违规的动作,而不是默认路径。

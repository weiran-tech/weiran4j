# 设计论证:为什么这样设计

> **本文只讲「为什么」,不是规范正文** —— 三节都是如此。
> 可执行的判定口径全部住在会被自动注入的三处(`config.yaml` / `schema.yaml` 的 instruction /
> `templates/`),agent 不读本文也能正确工作。**改判据请改那三处,改本文不影响任何行为。**
>
> 本文保留的是判据背后的**推理与实测证据**:为什么会得出那些规则。
>
> 三节原为 `why-handoff-rules.md` / `why-exec-notes.md` / `why-worktree-tradeoffs.md` 三份独立文件(2026-08-28 合并)。
> 合并原因:它们本就互相交叉引用(worktree 一节开篇即「配套交接规则 6」),
> 且 handoff 的末节「附:为什么收尾笔记是硬要求」与 exec-notes 全文是同一论证的两份副本。
> 拆成三份让读者在同一条推理里跳来跳去,合并后去重一次说清。
>
> | 节 | 回答 | 对应的可执行落点 |
> |---|---|---|
> | [一、8 条交接规则](#一8-条交接规则为什么是这-8-条) | L4 意图→工程的交接为什么需要这些约束 | `schema.yaml` exec-plan instruction + `templates/exec-plan.md` |
> | [二、收尾笔记](#二收尾笔记为什么是硬要求) | 为什么每个执行单元结束前必须落盘 | `templates/exec-note.md` + `schema.yaml` apply instruction |
> | [三、worktree 成本](#三worktree-的成本到底是多少2026-08-29-结论已反转) | worktree 的环境成本到底是多少,以及它如何决定「能不能并行」的判据 | `templates/exec-plan.md` 第 5 节的判据表(WT-0~WT-7,权威源 `rules/enforced/project.md`) |

---

## 一、8 条交接规则为什么是这 8 条

> 可执行的判定口径已全部下沉到流程本体,agent 无需读本文即可正确工作:
> | 规则 | 现在住在哪 |
> |---|---|
> | 条目映射 | `schema.yaml` exec-plan instruction + `templates/exec-plan.md` §1 + `check.mjs` 的 `L4/task-mapped` |
> | 共享层识别 | **`templates/explore.md` 的三张表**(填表即比对)+ `templates/proposal.md` 汇总勾选 |
> | 依赖判定 | `schema.yaml` exec-plan instruction |
> | 契约冻结 | `templates/exec-plan.md` §4 + `check.mjs` 的 `L4/contract-frozen` |
> | 测试归属 | `templates/exec-plan.md` §6 |
> | worktree 边界 | `templates/exec-plan.md` §5(含判据表) |
> | 越界申报 | `schema.yaml` integration instruction + `templates/exec-note.md` |
> | 禁止回写 | `templates/design.md` / `templates/exec-plan.md` 抬头 |
> | L4 交接检查清单 | `templates/exec-plan.md` 文末 Gate(10 项) |
> 改规则请改上面这些文件 —— **改本文不会影响 agent 的行为**。

---

### 0. 两个不变量

```
需求侧(单向下游)     openspec/<change>/*.md  ──→  exec/*.md      不允许反向回写
反馈侧(显式回退边)   exec 发现设计缺陷 ──→ 回 L2 重开            不允许用 sync 消化
```

- `tasks.md` 是**需求的权威源**,粒度是「意图」。
- `exec/plan.md` 是**执行的权威源**,粒度是「工程」。
- 二者是编译关系,不是同一份文件的两种写法。
  混同的后果:为了好并行,实现细节倒灌进 `tasks.md`,spec 退化成工单,失去描述意图的能力。

---

### 规则 1 · 条目映射:为什么禁止合并

允许 1 条 task 拆成 N 个执行单元,禁止 N 条并成 1 个。

合并会让 L8 无法逐条追溯「这条任务对应哪次改动」,追溯关系一断,verify 就只能整体估。

每条条目必须有归宿(映射表 或 未映射表 + 原因)。这条规则是「单一权威源」**唯一的漏项防线** ——
因为没人会重新推导需求,`tasks.md` 漏写的东西全流程都不会有人发现。

---

### 规则 2 · 共享层识别:为什么序号资源最阴险

命中桶文件/注册表、跨包契约、序号型资源三类之一,该改动归入 Layer 0 串行先做。

前两类容易理解 —— 多个单元都要改同一个 barrel,必然冲突。

**真正阴险的是第三类(`drizzle/00NN_*.sql` 与 `meta/_journal.json`)**:
两个 worktree 各自 `db:generate` 会生成同一个序号,但**文件名不同,git 不报冲突** ——
只有 drizzle 的 journal 会报,而且解完还得改文件名重排。
所以必须在 Layer 0 一次性生成完所有 migration。

判定流程里还有一条容易漏:**被 2 个以上执行单元「读取」的文件也要进 Layer 0** ——
读也要先冻结,否则并行单元读到的是彼此不一致的中间态。

---

### 规则 3 · 依赖判定:「前后端并行」是个典型误判

依赖成立当且仅当满足任一:类型依赖 / 数据依赖 / 调用依赖 / 契约依赖。

最常见的误判是把「前端页面」和「后端接口」当成两条平行任务 —— 它们其实是**契约依赖**,
前端要照接口签名写。

但处理方式**不是**串行做完后端再做前端,而是**把接口签名提到 Layer 0 冻结**,
之后前后端才能真正并行。看不出这一点,要么白白串行,要么并行到集成时才发现对不上。

---

### 规则 4 · 契约冻结:为什么这条最关键

没有契约冻结的并行,本质是**让 N 个 agent 各自猜同一个接口该长什么样**。

猜测互不兼容是必然的,而这个必然性会在集成时才暴露 —— 那时 N 份代码都得返工。

因此:并行单元不得自行改签名;需要改就停下,回 orchestrator 更新契约表、通知所有消费方、
记入变更记录。单个 worktree 私自改契约 = 集成时必然爆炸。

---

### 规则 5 · 测试归属:为什么不能拆成独立单元

测试跟随实现:同一执行单元、同一 worktree、同一 agent。

拆开后会发生两件事:实现方全程没有测试反馈回路;测试方对着自己没写过的代码补测试,
产出通常是**给现有实现盖章**而非发现问题。

测试的价值在于写的过程中反推实现,不在于事后的覆盖率数字。

例外:集成测试属于 L7 硬闸门,不归任何单个执行单元。

---

### 规则 6 · worktree 边界:相交就是分层错了

同层内任意两个 worktree 的「拥有(可写)文件集」不得相交。相交说明分层错了,
回规则 2/3 重切,**不要靠「小心点别改同一行」硬上**。

worktree 不长挂,每层结束即 merge 回主干:冲突成本随挂起时间大致平方增长,
分层 merge 是把一次大冲突拆成 N 次小冲突。

> ⚠️ **原文这里还有一段已被推翻的论据**,写的是「worktree 里 `.env` / `node_modules` / `dist` /
> turbo 缓存都不跟着走,根本跑不了 build/test/lint,验证只能回主干做」。2026-08-29 实测推翻,
> 详见[本文第三节](#三worktree-的成本到底是多少2026-08-29-结论已反转)。
>
> 正确的分工是**两级**:**lane 内自测就在该 worktree 里跑**(结论落收尾笔记);
> **L7 硬闸门证据在全部合并之后产生一次,且必须是代码改动的最后一步** ——
> 理由不是「worktree 里跑不了」,而是「各自绿不等于合起来绿」,再加上 `L7/evidence-fresh`
> 按 `packages/` 整目录 mtime 判定,任一 lane 的后续合并都会让先产生的证据失效。

> ⚠️ 本规则是**切了 worktree 之后**的约束,不是「必须切」的理由。

---

### 规则 7 · 越界申报:为什么允许申报而不是一律禁止

| 类型 | 定义 | 处置 |
|---|---|---|
| **必要连带** | 不改则本单元无法工作(新增字段导致调用方必须适配) | 允许,**申报** |
| **越界扩大** | 与本单元目标无因果关系(顺手重命名、顺手重构) | 回退,或另开 change |

硬性禁止一切跨边界修改会有两个坏结果:要么被误报淹没,要么**逼 agent 把改动藏起来**。

可申报机制把「有没有越界」变成「越界是否正当」,后者才是可判定的。
L8 的越界检查因此只有一条真正的红线:**未申报的越界**。

---

### 规则 8 · 禁止反向回写:为什么 sync 不能兜底

`exec/**` 的任何内容不得回写进 `tasks.md` / `design.md` / `specs/**`。

发现设计有问题时,唯一合法路径是**显式回退边**:

```
exec 发现设计缺陷 → 停止该单元 → 回 L2 重开设计 → 人类重新审阅 → 重新派生 plan.md
```

两种不允许的做法:
- 在 `exec/plan.md` 里「顺手修正」设计 → spec 和实际做的事悄悄分家
- 到 L8 用 `/openspec-sync-specs` 把差异抹平 → **等于让规格治理层给既成事实盖章**

---

---

## 二、收尾笔记为什么是硬要求

> 笔记骨架住在 `openspec/schemas/devops-workflow/templates/exec-note.md`,
> 硬要求写在 `schema.yaml` 的 `apply` instruction 里。改格式请改那两处。

### 一句话

**subagent 的上下文一销毁,未落盘的实现知识就永久丢失了 —— 而集成阶段恰恰需要它。**

### 展开

L6 集成由 orchestrator 或另一个 agent 执行。这个角色是全链上**对每份 diff 了解最少**的:
它没参与实现,没做过取舍,不知道哪些改动是被迫的、哪些是顺手的。

而集成要解决的恰恰是这类问题:

- 两个单元实现了功能相同的工具函数 —— 该保留哪个?**取决于当初为什么这么写。**
- 某个文件被非拥有方改了 —— 是必要连带还是越界扩大?**取决于因果关系。**
- 两个方案二选一放弃了一个 —— 不记下来,后人会当成疏漏「修回去」。

这些信息只存在于实现时的上下文里。diff 只能告诉你「改成了什么」,
永远回答不了「为什么不是另一种」。

### 所以

每个执行单元结束前必须落一份 `exec/notes/<单元ID>-<简述>.md`,内容不求长,但必须覆盖:

- 完成的 tasks 条目(编号,与 plan 的映射表对得上)
- 改了什么(带 `path:line`)
- **为什么这么做,以及放弃了什么方案**
- 依赖了哪些冻结的契约(签名一变,本单元要复查)
- **越界申报**(申报是允许的,隐瞒不是)
- 埋的坑 / 遗留
- 自测结果

`check.mjs` 的 `L5/notes-required` 会在集成阶段已开始却没有笔记时报错,
`L5/note-per-unit` 会提示哪个执行单元漏了笔记。

### 命名

```
exec/notes/
├── E1-shared-contract.md
├── E2-credit-service.md
└── E3-credit-page.md
```

---

## 三、worktree 的成本到底是多少(2026-08-29 结论已反转)

> **本节的原标题是「worktree 为什么在本仓库经常不划算」,原结论已于 2026-08-29 被实测推翻。**
> 现行规则是:**每个 change 一个独立 worktree**,判据表回答的是「能不能与他人并行推进」,
> 不再是「要不要切」。可执行版本在
> `openspec/schemas/devops-workflow/templates/exec-plan.md` 第 5 节与 `rules/enforced/project.md` 「二」。
> 改判据请改那两处,改本文不会影响 agent 的行为。
>
> **本节整体保留,不删。** 它现在承担两件事:①判据背后的实测证据(含 2026-08-09 与 2026-08-29 两轮);
> ②一份**推论被当成事实用了很久**的案例 —— 那才是这段历史真正的价值。

配套[本文第一节](#一8-条交接规则为什么是这-8-条)的规则 6(worktree 边界与文件所有权)——
那条规则规定「切了 worktree 之后怎么划边界」,本文回答的是它的前置问题:**成本到底是多少。**

---

### 结论(2026-08-29 修订)

> **在本仓库,worktree 的收益全部来自「隔离」,而「环境重建」这个成本被高估了。**
>
> 实测(2026-08-29,`2e0f498`,新建 worktree 后):
> `pnpm install --frozen-lockfile` **15.2s** · `pnpm build` **42.9s**(turbo 全冷) ·
> `pnpm lint` **9.2s** · `pnpm test` **68.6s** · `openspec:check` 通过 ——
> **全程没有 `packages/server/.env`,也没有任何 `dist/`**。
>
> 剩下的真实成本只有两项:**冷 turbo 缓存**与**上下文切换**。两项都不足以抵消
> `rules/enforced/project.md` WT-0 列的那三条后果(L7 被染红 / L9 拿不到可签字的 diff / L3 落章失去不可变性)。

**原结论错在哪**:它写的是「判据只有一条:这个任务能不能在『只编辑文件、不运行任何命令』的
前提下完成?」—— 这条判据的前提是**在 worktree 里运行命令不可行**,而那从来没被验证过。
详见下方「劣势 · 1」的对照表。

`git` 层面的隔离很便宜(`.git` 62M,worktree 共享它);
`.gitignore` 里不跟着走的东西**大部分也很便宜** —— 贵的只剩 turbo 缓存。

---

### 优势

#### 1. 真并行,无锁

多个 agent 同时写文件不互相踩。**这是 worktree 唯一不可替代的能力** ——
分支切换和 stash 都做不到,因为工作区只有一个。

#### 2. 主分支始终可运行

agent 把代码改崩了,主 worktree 照样能跑 demo、能 review、能发版。
对「人和 agent 同时干活」这个场景价值最高。

#### 3. 天然的 diff 归属

一个 worktree 一个分支,`git diff main...` 就是该任务的全部改动。
`exec/verify.md` 里「核对 subagent 有没有跑偏」这一步,有 worktree 才有干净的比对基线。

#### 4. 失败可整体丢弃

`git worktree remove --force` 一了百了,主仓库零污染。
相比之下,同一工作区里让 agent 乱改,回滚要靠 `git checkout -- .`,
而它会连带干掉你自己没提交的改动。

---

### 劣势

#### 1. 环境不跟着走

> ⚠️ **本节曾是本文最重的一条论据,2026-08-29 实测后大幅缩水。**
> 原表格里有两行是错的,且它们支撑着整节的结论(「worktree 是个半残环境」)。
> 保留原文对照,是因为**错的不是观察而是推论** —— 那种失效方式值得记住。

`.gitignore` 决定了这些东西不跟着 worktree 走:

| 项 | 原文写的后果 | 2026-08-29 实测 |
|---|---|---|
| `node_modules/` | 不装就什么都跑不了 | ✅ 成立。但 `pnpm install --frozen-lockfile` **15.2s**(store 已热、APFS CoW),且纯 `openspec/` 类改动**根本不用装** —— `check.mjs` 与 `guards/*.mjs` 只引用 Node 内置模块 |
| `.env`(在 `packages/server/`) | **server 直接起不来** | ⚠️ **过宽**。只影响「真去连 PostgreSQL / Redis」。`config.ts` 的 `envSchema` **每个键都有 default**,不带 `.env` 照样能 `build` / `test` / `lint` / `openspec:check` |
| `dist/` | `@zenith/shared` 未构建,server / web 编译失败 | ❌ **不成立**。`packages/shared` 的 `main` / `types` / `exports` 全部指向 `./src/*.ts`,消费方直接吃 TS 源码,**不存在「未构建」状态** |
| `.turbo/`、`node_modules/.cache` | turbo 缓存全冷,每个 worktree 从零构建 | ✅ 成立,且这是**现在唯一还站得住的环境成本**:冷构建 42.9s(`lint` 9.2s、`test` 68.6s) |
| `.omc/`、`.claude/` | agent 运行状态、本地设置全丢 | ✅ 成立。`.claude/settings.local.json`(近 500 条 allow)不复制就是权限提示刷屏 —— 现由 `scripts/wt.mjs` 自动带过去 |

**这条教训比结论本身更值钱**:`dist/` 那一行是从「`.gitignore` 里有它」推出「缺了它会编译失败」的,
**推论看起来天经地义,却从来没人跑一次验证**。而它一旦写进判据表,就成了「不要切 worktree」的理由,
反过来让人更没有机会去发现它是错的。写「因为 X 不跟着走所以会 Y」时,Y 必须是**跑出来的**,不是推出来的。

#### 2. 安装成本是每个 worktree 一份

`du` 显示 root `node_modules` 1.7G,但**这个数字会误导人**。

实测(2026-08-09,本机):同一文件在主 worktree 与副 worktree 的 inode 不同、
link count 均为 1,文件系统为 APFS —— 说明 pnpm 走的是 **CoW clone 而非硬链接**,
磁盘块是共享的,`du` 报的 1.7G **不等于真实新增占用**。

所以真实成本是**时间与 inode**,不是磁盘:每个 worktree 仍要完整跑一遍
`pnpm install` 构建目录树(2026-08-29 实测 **15.2s**,117,023 个文件)。

> **原文这里还有一句「再跑一遍 `pnpm --filter @zenith/shared build`」,已删 ——
> 那一步根本不需要**:`packages/shared` 的包入口指向 TS 源码,不存在「未构建」状态(见劣势 1)。
> 纯 `openspec/` 类改动更是连 `pnpm install` 都不用跑(`wt.mjs new --no-install`)。

> 不要用「省磁盘」或「费磁盘」当作 worktree 的决策依据,两个方向都是错的。

#### 3. 后端任务基本不能真并行

worktree 隔离文件,**不隔离进程和外部资源**:

| 资源 | 冲突表现 |
|---|---|
| PostgreSQL(单实例) | 两个 worktree 各跑 `pnpm db:migrate` 互相覆盖 |
| drizzle 迁移序号 | 各自 `db:generate` 都生成 `00NN_*`,**git 不报冲突(文件名不同)**,`meta/_journal.json` 才报 |
| Redis(单实例) | 缓存 / 会话 / 限流 key 互相污染 |
| 端口(`PORT` / `VITE_PORT`) | ~~第二个 worktree 起 dev server 直接撞端口~~ —— **已由 `scripts/wt.mjs` 自动隔离三个键**(含 `VITE_API_PROXY_TARGET` 与 `PORT` 对齐),不再是冲突项 |

要真隔离,得给每个 worktree 配独立 DB schema、独立 Redis db 号、独立端口。
**这套配置本身的复杂度,通常超过并行省下的时间。**

#### 4. 冲突被推迟,不是被消除

并行期间零冲突,代价是所有冲突集中在集成时爆发,
而那时各 agent 的上下文已经销毁。总成本不一定降低,只是换了个位置支付
(这也是[第二节](#二收尾笔记为什么是硬要求)所说、收尾笔记必须写的原因)。

#### 5. 走错目录 —— 现在有两种走法,第二种完全静默

**第一种(旧):cwd 不对,在错分支上改代码。** 恢复 session、compaction 之后尤其容易发生。
动手前先 `git status --short --branch` + `pwd`。这种至少事后能从 `git status` 看出来。

**第二种(2026-08-29 发现):session 起错目录,整个 change 静默失去 openspec 校验。**

`.claude/settings.json` 的写后校验钩子是这样写的:

```
node "${CLAUDE_PROJECT_DIR:-.}/openspec/check.mjs" --hook
```

`CLAUDE_PROJECT_DIR` 是 **session 启动时**的项目目录,不随你编辑哪个文件而变。所以在主工作区的
session 里改 worktree 的文件时,跑的是**主工作区那份 `check.mjs`**,校验的是**主工作区那个
`openspec/`** —— 你改的东西一次都没被校验过,而且**不报错、不提示、看不出来**。

> **所以:在 worktree 里干活,必须在该 worktree 目录内新开 session。**
> `scripts/wt.mjs new` 结束时会打印这条提醒。它没有任何机械兜底 —— `CLAUDE_PROJECT_DIR`
> 的语义由 Claude Code 决定,仓库改不动,只能靠这条约定唤起。

这一条与第一种的区别值得记住:走错分支会在 `git status` 里留下痕迹,而校验错目录**不留任何痕迹** ——
它的表现是「一路绿灯」,而绿灯来自另一个目录。

#### 6. 清理靠自觉 —— 已改为机械闸门(2026-08-29)

原文是「见下」,指的是下方 2026-08-09 快照里那四个没人清的遗留 worktree。

**现在有守卫了**:`openspec/guards/worktree-orphan.mjs` 双向检测 ——「change 已归档而注册项还在」
与「目录还在而注册项没了」(后者 `git worktree prune` 清不掉),命中即 error。
它**豁免当前所在的 worktree**,否则在 worktree 内提交自己的归档会被自己拦住而自锁。

销毁走 `node scripts/wt.mjs done <change-id>`,两侧一起清。

---

### 现场证据(2026-08-09 快照)

本仓库当时挂着 4 个遗留 agent worktree:

```
.claude/worktrees/agent-a61ffd0cabb2a1e2d   1.7G   有 node_modules
.claude/worktrees/agent-ac3e39f4040f4a80b    43M   无 node_modules
.claude/worktrees/agent-ad24462c344de08d4    44M   无 node_modules
.claude/worktrees/agent-a1c9da9f7eda5eceb    16K   无 node_modules,且已不在 git worktree list 中(孤儿目录)
```

#### 观察一:3/4 的 worktree 没有 node_modules

意味着那些 agent **只能编辑文件,不可能跑过 build / test / lint**。

这直接打穿了 `pipeline.md` 里 L7 硬闸门的设想 —— 在 worktree 里根本执行不了。
实际只有两种选择:

- **要么**每个 worktree 都付一次安装成本
- **要么**验证一律推迟到 merge 回主 worktree 之后做

后者更现实,但要清楚代价:**并行期间没有任何质量信号**。

#### 观察二:清理确实会被忘掉

有一个目录已经从 `git worktree list` 掉了但文件还在。
`.claude/` 是 gitignore 的,这些 worktree 只存在于本机,不会有任何人替你清。

```bash
git worktree prune          # 清理已失效的注册项
git worktree list           # 确认剩下的还需不需要
git worktree remove <path>  # 删掉不需要的
```

---

### 结论去向

上面的证据推出的**判据表**与推荐模式,已经下沉到流程本体:

| 结论 | 现在住在哪 |
|---|---|
| 8 行判据表(哪些 change 能否**并行推进**) | `templates/exec-plan.md` 第 5 节 + `rules/enforced/project.md` 「二」 |
| 「每个 change 一个 worktree」与建立/销毁动作 | `scripts/wt.mjs`;规则见 `rules/enforced/project.md` 「二」 |
| **两级验证**(lane 内自测 / 集成后一次证据) | `templates/exec-plan.md` 第 5 节。**已取代原先的「验证回主干」** —— 那条表述的依据是本节已被推翻的前提,而真正成立的理由是「各自绿不等于合起来绿」,它推出的是「合并后再跑一次」,不是「lane 内不要跑」 |
| 「本 change 内部无并行」是合法产出 | 同上 + `schema.yaml` exec-plan instruction |
| 内部并行时的文件所有权约束 | `templates/exec-plan.md` 第 5 节表格(拥有 / 只读 / 禁止触碰) |
| 孤儿 worktree 的机械闸门 | `openspec/guards/worktree-orphan.mjs`(见 `design/check.md` §6) |

**改判据请改 `rules/enforced/project.md` 与模板**,agent 只读那两处,不读本文。

### 与规则 6 的关系

[本文第一节](#一8-条交接规则为什么是这-8-条)的规则 6 规定:同层内任意两个执行单元的
「拥有(可写)文件集」不得相交。**worktree 该不该开已经不是问题了**(一律开),
规则 6 现在只回答它自己那一半:

```
worktree:一律开(node scripts/wt.mjs new <change-id>)
   │
   ├─ 本 change 内部要不要拆并行?
   │     ├─ 不拆 → 单执行单元,规则 6 不适用
   │     └─ 拆   → 按规则 6 划边界:拥有 / 只读 / 禁止触碰
   │
   └─ 本 change 能不能与**别的 change** 同时推进?→ WT-0~WT-7 判据表
```

**规则 6 是拆并行之后的约束,不是「必须拆」的理由。**
`exec/plan.md` 第 5 节写「单执行单元,内部无并行」是完全合法的产出。

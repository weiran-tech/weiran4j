# rules/ —— 要遵守的东西住在这里

> **这个目录的准入标准只有一条:有没有「必须先读」的时刻。**
> 有,进这里;没有,去 `openspec/design/`(说明性文档,删掉不影响流程运行)。

## 目录内容 —— 按「有没有机械兜底」分两层

这两个子目录的差别**不是主题,是可靠性**:

```
rules/
├── enforced/   ✅ 漏改会被 `node openspec/check.mjs` 拦住
└── advisory/   ❌ 没有任何守卫,漏读不会有人告诉你
```

**为什么要用目录把它分开**:这个差异如果只写在表格的最后一列里,真正决定行为的
「我打开的这个文件靠不靠谱」就得先去查表。把它变成路径的一部分,
`rules/advisory/toolchain.md` 这个路径本身就在说「这份没有守卫,漏读是静默的」。

### `enforced/` —— 有机械校验

| 文件 | 管什么 | 机械校验 |
|---|---|---|
| [`constitution.md`](enforced/constitution.md) | **代码不变量**(CP-N):跨 change 恒成立的 MUST / MUST NOT | ✅ `L2c/constitution-check` + `TEMPLATE/constitution-rows` |
| [`project.md`](enforced/project.md) | **项目结构事实**(SL/WT/CC/PK/TG/DS-N):共享层、worktree 判据、横切关注点、模块、任务分组、design 必填章节 | ✅ `TEMPLATE/profile-rows` |

> ⚠️ 这两份的**路径被 `openspec/check.mjs` 硬编码**(`constitutionPrinciples()` /
> `profileItems()`)。移动或改名必须同步改代码,改完跑 `node openspec/check.mjs` 确认。

### `advisory/` —— 无机械校验,只靠 `CLAUDE.md` 索引表唤起

| 文件 | 管什么 |
|---|---|
| [`components.md`](advisory/components.md) | **可复用的前端公共组件**(先查再造);新增未登记会被 `components-registry` 拦 |
| [`pitfalls.md`](advisory/pitfalls.md) | **流水线各层踩过的坑**(L0–L10 分节) |
| [`toolchain.md`](advisory/toolchain.md) | **工具行为与代码库欠账**:前三者都装不下的既有事实 |

> 这两份的条目必须满足两个门槛:**真踩过** + **写清症状**。理由见下方决策流程的 ⑤⑥。
> 它们没有守卫,唯一的唤起途径是 `CLAUDE.md` 的索引表 ——
> 而那张表本身由 `REPO/rules-index-dangling` / `REPO/rules-index-missing` 兜底:
> 移动文件、或往这里加一份新文档而忘了登记,都会当场转红。

> `advisory/components.md` 是个例外:它的「新增未登记」方向由 `guards/components-registry.mjs`
> (`REPO/components-unregistered`)机械兜底,但条目**内容**是否准确仍没有守卫。

## 新规则该写到哪 —— 决策流程

> **先理解四个「送达通道」,再看决策流程 —— 落点的本质是选送达保证,不是选主题。**
>
> | 通道 | 载体 | 何时进入 agent 上下文 |
> |---|---|---|
> | **A** | 项目根 `CLAUDE.md` | **每次会话无条件注入**,100% 送达 |
> | **B** | `config.yaml` / `schema.yaml` / `templates/*.md` | 走 openspec 流水线时自动注入 |
> | **C** | 本目录 `rules/*.md` | **完全不自动加载**,靠 A 的索引表唤起 |
> | **D** | `design/` / `state/` | 纯人读,不进任何 prompt |
>
> 通道 C 装着项目最核心的约束,却住在一个「靠祈使句唤起」的通道里。
> 这是有意的取舍(A 有体量上限,塞满会稀释每一条),但它意味着:
> **判断落点时,「这条规则漏读的代价有多大」比「它属于什么主题」更重要。**

写下一条新规则前,按顺序问:

```
⓪ 它漏读一次的代价,是否大到不能接受?
   (典型:漏了就静默丢数据 / 每次动这块都会踩 / 无法机械化且无补救窗口)
   是 → 项目根 CLAUDE.md 正文,并在本文件登记为「通道 A 例外」
        理由:只有通道 A 100% 送达。当前的例外有:JDK 21 强制、
        spotlessApply 先于 check、Gradle 配置缓存必须关、
        统一响应体 code 是数字 0(旧代码的字符串 "0" 判断会恒错)、密钥不进版本库
        ⚠️ 这是**有门槛的例外**,不是「重要的都往那放」——
           通道 A 一旦塞满,每一条的相对权重都会被稀释
   不是 ↓

① 它能被机器判定吗?
   能 → 写成 check(openspec/guards/*.mjs)、棘轮规则(project.json 的 ratchet.rules),
        或 build-logic 里的 Checkstyle / SpotBugs / Error Prone 规则
        ⚠️ 必须做注入式验证:故意写一处违规 → 确认转红 → 移除。
           一个不会响的守卫比没有守卫更糟
        ⚠️ 落地后**回头查本目录有没有描述同一失效模式的旧条目**,把它改写成「指向守卫」——
           保留「它当初拦的是什么」(用例转红时看得懂),删掉「你得手工核对」。
           漏改的后果比过期条目更隐蔽:人照着做了,做的是机器已经在做的事,
           还误以为这里没有防线
   不能 ↓

② agent 必须无条件遵守吗?
   是 → 写进**会被自动注入提示词的三处之一**:
        · openspec/config.yaml(逐 artifact 的 rules)
        · schemas/*/schema.yaml 的 instruction(某一层)
        · schemas/*/templates/*.md(某个产出物)
        ⚠️ 在 instruction 里写「详见 XXX.md」只是祈使句,不是依赖 ——
           agent 不主动 Read,那份内容就等于不存在,且它读没读你无从观测
   不是 ↓

③ 它是「跨 change 恒成立的代码不变量」吗?
   是 → enforced/constitution.md 加一条 CP-N,并同步 templates/design.md 的宪法对照表
        (两边 ID 不一致会被 TEMPLATE/constitution-rows 拦)
   不是 ↓

④ 它是「项目结构事实」吗?(共享层 / worktree 判据 / 横切关注点 / 模块 / 任务分组 / design 章节)
   是 → enforced/project.md 加一条 SL/WT/CC/PK/TG/DS-N,并同步对应模板槽
        (两边 ID 不一致会被 TEMPLATE/profile-rows 拦)
   不是 ↓

⑤ 它是「某一层踩过的坑」吗?
   是 → advisory/pitfalls.md 对应层的小节
   否则 → advisory/toolchain.md
```

**③④ 与 ⑤⑥ 的关键差别**:前者有机械校验兜底,漏改会被 `node openspec/check.mjs` 拦住;
后者没有,**只能靠 `CLAUDE.md` 的触发条件唤起**。所以写进 ⑤⑥ 的条目必须满足两个门槛:

1. **真踩过** —— 没踩过的推测不要写;
2. **写清症状** —— 这些坑的共同点是「不报错」,只有把症状写出来,下一个人才认得出自己正在踩它。

## 规则的**执行者**住在哪(不在本目录,是有意的)

本目录只装**规则内容**;执行它们的代码与机器配置**刻意留在 `openspec/` 顶层**:

| 位置 | 是什么 | 为什么不在 `rules/` |
|---|---|---|
| `openspec/check.mjs` | 全部检查项的实现(L0–L10 + REPO/TEMPLATE/META 类) | 它靠**自身位置**反推仓库根,移进子目录会让 `ROOT` 变成 `openspec/`、`OPENSPEC_DIR` 变成 `openspec/openspec/` —— 连带 L7 的 `sourcePaths` mtime 比对与全部棘轮规则一起失效 |
| `openspec/guards/*.mjs` | 项目级检查插件 | 由 `project.json` 的 `checks` 字段以 `./guards/x.mjs` **相对 `OPENSPEC_DIR`** 加载 |
| `openspec/project.json` | 唯一的结构化配置(L7 命令清单、sourcePaths、豁免清单、棘轮规则) | 被 `check.mjs` 按固定路径读取;它是**机器输入**,不是给人先读的规则文档 |
| `openspec/config.yaml` | 会被 CLI 注入 prompt 的 `context` 与逐 artifact `rules` | 属于「自动注入的三处」之一 |

**准入标准的实质**:`rules/` 回答「我该遵守什么」,上面四个回答「谁来判定我遵守没有」。
两者混在一起,本目录就退化成「跟 openspec 有关的东西都堆这」,
而 `CLAUDE.md` 的索引表(「什么时候必须读」)对着一个 2000+ 行的 `.mjs` 是无意义的。

## 为什么这个目录不会被自动加载

`openspec instructions` 的输出只由三处拼成(`config.yaml` / `schema.yaml` 的 instruction /
`templates/` 全文注入),**其他任何文档都不会被自动加载**。

`enforced/constitution.md` 与 `enforced/project.md` 之所以还能生效,靠的是把「判定口径」与
「说明」拆到两处:**「有哪些条目、必须逐条回答」硬注入进模板 + 硬校验;
「条目具体说了什么」才在这里。** agent 即使一次都不打开它们,也无法跳过那一层 ——
最坏是回答得潦草,而潦草会在 L3 人闸暴露。

`advisory/` 下的两份没有这层机制,改由项目根 `CLAUDE.md`(每次会话自动加载)的
「规则索引」给出**触发条件** —— 触发条件本身被注入,你据此决定要不要打开。

> 完整论证见 `openspec/design/pipeline.md` 的「提示词来自哪(决定了规范该住在哪)」。

## 硬编码路径警告

`enforced/constitution.md` 与 `enforced/project.md` 的路径被 `openspec/check.mjs` 硬编码引用 ——
移动或改名必须同步改代码。其余文件没有代码依赖,但被 `CLAUDE.md` 的索引表引用,
而那张表由 `openspec/guards/rules-index.mjs` 双向看守。

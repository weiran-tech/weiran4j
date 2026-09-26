# `check.mjs` 说明书 —— 机械校验是怎么跑的

> **这份文档管「机制」,不管「清单」。**
>
> 想知道**有哪些检查、每条防什么**,跑 `node openspec/check.mjs --explain` ——
> 那是唯一不会漂的清单,由 `META/check-undocumented` 兜底。
> **本文刻意不复述那份清单**,理由见下方「§0 为什么这里没有检查清单」。
>
> 本文回答的是 `--explain` 答不了的问题:整套东西怎么编排、`project.json` 每个字段什么语义、
> 插件契约长什么样、加一条检查要做什么、改了 `check.mjs` 要同步改哪里。

---

## §0 为什么这里没有检查清单

`design/README.md` §4 里有一条**明令**:

> 本节曾经手抄过一份代表性清单,结果是四个互不相同的总数散在全文,外加几个早已被合并或删除的
> 检查 ID。**清单已删除,不要再加回来** —— 需要在文档里点名某条检查时,只在讲清某个具体判据时
> 引用单条,不要复述全集。

本文遵守它。文中出现的检查 ID 都是为了讲清某个机制而**单条引用**的,不构成清单,也不保证覆盖全部。

判断标准:**这个信息有没有唯一事实源?**

| 信息 | 唯一事实源 | 本文怎么处理 |
|---|---|---|
| 有哪些检查 ID、各自防什么 | `CHECK_DOC`(`--explain` 打印) | 只指过去 |
| 每条检查的判定细节 | 各 artifact 的 `instruction` 与 `templates/` | 只指过去 |
| L7 要留哪几份日志 | `project.json` 的 `commands` 键名 | 只讲推导规则,不列 build/test/lint |
| 存量数字、退役计划 | `project.json` 的 `ratchet`(`--inventory` 打印) | 只讲机制,不抄数字 |
| **编排顺序、字段语义、插件契约** | **只有代码** | **本文** |

最后一行是本文存在的理由:这些东西此前只写在 `check.mjs` 的注释里,而注释要读 2692 行才拼得出全貌。

---

## §1 它补的是哪一段

`schemas/devops-workflow/schema.yaml` 的状态机只强制两件事:`requires` 依赖顺序,
以及 `generates` 的路径能否匹配到文件。**内容对不对,它一概不看。**

`check.mjs` 补的就是这一段:把原本写在 instruction 里、只能靠 agent 自觉遵守的判定口径,
变成会返回非零退出码的检查。

**收录判据只有一条**(`--explain` 的抬头也写着):**出错时会不会不报错。**
防静默失败的留;防「写得糙」的降 warn 或干脆不做。

---

## §2 三道防线

同一个脚本,三个触发点,严厉程度递增:

| 时机 | 触发 | 行为 | 配置在哪 |
|---|---|---|---|
| **即时反馈** | agent 写完文件当场 | **不阻断**,结果回灌进 agent 上下文 | `.claude/settings.json` 的 PostToolUse 钩子(`--hook`) |
| **硬拦截** | `git commit` | 非零退出码挡住提交 | `.githooks/pre-commit` |
| **兜底** | CI | 非零退出码红 | `.github/workflows/openspec-check.yml` |

**`--hook` 为什么刻意不阻断**:artifact 是逐层写出来的,写到一半必然处于中间状态 ——
这一层要的是「写完当场看见」,硬拦截交给后两道。

`--hook` 从 stdin 读钩子 JSON,只在写到 `openspec/changes/**`、`openspec/specs/**`,
或**插件自己声明的 watches 路径**时才跑;命中 `openspec/changes/<id>/` 时自动收窄成 `--change <id>`。

> 应急绕过 pre-commit 用 `git commit --no-verify`。CI 没有绕过口。

---

## §3 CLI

```bash
pnpm openspec:check                     # = node openspec/check.mjs,活跃 change(不含 archive)
node openspec/check.mjs --change <id>   # 只查一个(归档的要配 --all)
node openspec/check.mjs --all           # 连 archive 一起
node openspec/check.mjs --json          # 机器可读:{ ok, findings[] }
node openspec/check.mjs --explain       # 全部检查 ID + 各自守护的失效模式
node openspec/check.mjs --inventory     # 存量盘点(日常检查刻意不报的那些债)
node openspec/check.mjs --write-index   # 重新生成 openspec/specs/README.md
node openspec/check.mjs --hook          # PostToolUse 钩子模式,从 stdin 读 JSON
```

**退出码**:`0` = 无 error;`1` = 有 error;`2` = 配置本身坏了(`project.json` 解析失败、
`--change` 指向不存在的 change)。**warn 不影响退出码。**

**`--inventory` 为什么单独开一个入口**:主 spec 里几百条老写法标题、几百个缺判据的场景、
棘轮离目标还差多少 —— 这些**故意不进日常检查**。天天报就是天天被忽略,而忽略久了检查本身
也会被关掉。但「不报」不等于「不存在」,所以给它一个能一次看清欠了多少的地方。

---

## §4 编排顺序

`runAll()` 的执行顺序(顺序本身有含义,不是随意排列):

```
collectChanges()          扫 openspec/changes/,--all 时连 archive
  └─ 逐个 checkChange(c)  L0 → L2* → L3 → L4 → L5 → L7 → L8
checkMainSpecs()          openspec/specs/**:结构 + 占位符 + status
checkArchiveFidelity()    归档保真度(全局账,--change 时跳过)
checkSlots()              schemas/**/templates/ 的 openspec:slot 完整性
checkDocs()               META:检查 ID 与 CHECK_DOC 是否对得上
checkSpecIndex()          specs/README.md 是否过期(--change 时跳过)
checkConstitutionTemplate()   rules/enforced/constitution.md ↔ design 模板的 CP-N
checkProfileTemplate()        rules/enforced/project.md   ↔ 六个模板槽的 SL/WT/CC/PK/TG/DS-N
runProjectChecks()        project.json 声明的插件(见 §6)
```

**两处 `--change` 时跳过**是有意的:归档保真度与能力索引都是**全局账**,
只看某一个 change 看不出来 —— 单查一个 change 时报它们只会制造噪音。

### 分阶段生效

判定逻辑刻意做成**按下游 artifact 是否存在来升降级**,写到一半的中间态不会误报:

| 检查 | 没有下游 artifact 时 | 下游已存在时 |
|---|---|---|
| `L0/ambiguity` | warn | `proposal.md` 存在 → **error**(歧义本该清零了) |
| `L3/design-approved` | warn | `tasks.md` 存在 → **error**(人闸被跳过了) |

这是「不阻断中间态」与「不放过跳闸」之间的取舍点。加新检查时照这个模式走。

### 归档件的豁免

`isArchived(c)` 为真时会跳过一部分判定,最典型的是 **`L7/evidence-fresh` 不判归档件**:
它比的是「日志 vs `packages/` 的最新 commit」,而 change 一归档,任何后续代码提交都会让它
的日志变「陈旧」—— 于是 100% 的归档件必然报错且越攒越多。那些日志是历史记录,**本来就该是旧的**。
存在性与非空仍然要查,那两条对归档件依然有意义。

---

## §5 `project.json` 逐字段

**这是全流程唯一的结构化配置文件。** 其余项目事实以自由文本住在 `schemas/**/templates/` 的
`openspec:slot` 槽里 —— 那些只有 agent 读,不需要结构化。

文件缺失时用保守默认值(`{ commands:{}, sourcePaths:[], checks:[], capabilities:{} }`):
**不猜源码路径,只跑与宿主项目无关的通用检查**。解析失败则 `exit 2`,不静默降级。

### `commands`

```json
"commands": { "build": "pnpm build", "test": "pnpm test:changed", "lint": "pnpm lint" }
```

L7 硬闸门的命令清单,**唯一事实源,增删命令只改这里**:

- `L7/evidence-missing` 按**键名**要求 `exec/evidence/<键>.log` 逐个存在且非空;
- 报错文案里的命令串也从这里取。

加一条命令(比如 `typecheck`),下一个 change 就必须多留一份 `typecheck.log` —— 不用改
`check.mjs`,**也不用改 `schema.yaml` 或模板**:2026-08-22 起那两处已改为「指向本字段」
而不再复述命令串,原先三处手工同步、漂移无人看守的问题已消除。

> ⚠️ 这里**不写** workflow/schema 名。`config.yaml` 顶层的 `schema:` 才是它的家 ——
> 写两份没有任何检查看守。

> **`test` 为什么是 `pnpm test:changed` 而不是 `pnpm test`**(2026-08-29 改):
> L7 是**本地闸门**,按改动范围跑就够(`vitest --changed`,按模块图取相关用例,
> 改全局输入时自动退化为全量);**全量的那道关口在 `.github/workflows/verify.yml`**。
> 两者缺一不可 —— 只留本地全量会让每个 change 都为无关用例买单,
> 只留本地增量而 CI 不跑全量,则改动图之外的回归没有任何关口。

### `sourcePaths`

```json
"sourcePaths": ["packages"]
```

`L7/evidence-fresh` 拿它算「代码最后一次改动是什么时候」:对每个路径取
`git log` 最后提交时间,再取该路径下所有 dirty 文件的 mtime,合并求最大值。
**没配就跳过新鲜度判定**(不猜)。

### `checks`

```json
"checks": ["./guards/rules-index.mjs", "./guards/spec-xref.mjs", "./guards/worktree-orphan.mjs", "./guards/ratchet.mjs"]
```

项目级检查插件。`./` 开头按**相对 `openspec/`** 解析。见 §6。

### `capabilities.legacyChangeNamed`

`L2a/capability-not-change-name` 与 `L2a/capability-name-shape` 的**历史豁免清单**。

这两条检查拦的是「用 change 事件名当能力名」:能力是持久的领域名词,change 是一次性事件 ——
两者同名意味着每做一次改动就新增一个能力,既有能力永远不会被修订或退役,
于是同一份实现会被多个互相矛盾的主 spec 同时约束。

清单里的是已归档且主 spec 已落库的历史产物,回改会牵动已发布内容,故**只豁免、不放宽规则**,
新 change 一律硬拦。**它同时是待清理清单:豁免一条就少一条,不要往里加新的。**

> 检查还会按形状拦:`EVENT_SHAPED_CAP` 匹配「动词开头」或 `-fixed` / `-cleanup` 结尾 ——
> 所以改 change 名绕不过去。

### `capabilities.knownArchiveDrift`

`L10/archive-fidelity` 与 `L10/delta-target-missing` 的历史豁免清单。

**加条目前先查归档路径**:多数情况下有新条目意味着归档绕开了 `openspec archive`,
**那是要修的 bug,不是要豁免的历史。**

### `componentsRegistry`

`exempt`:不该进 `rules/advisory/components.md` 的组件文件(相对仓库根的路径)。只给「纯内部实现、没有复用语义」的文件用,每条都要能说出理由 —— 豁免清单本身也会过期。

### `ratchet`

见 §7。

---

## §6 插件契约(`openspec/guards/`)

### 为什么要分插件

通用检查校验的是 **openspec 文档自身的结构**,与宿主语言无关;
而「序号型资源长什么样」「哪些文件是注册表」这类判断是**项目事实**。

分工是:判定**方法**写在模板的槽里(给 agent 读),判定**代码**放 `guards/`(给机器跑)。
换项目时,通用部分原样带走,只换 `guards/` 与 `project.json`。

### 契约

```js
export default {
  id: 'my-check',                    // 必填,报错文案里会用
  watches: ['path/to/file.json'],    // 可选:--hook 除 openspec/ 外还要关注哪些路径
  run(ctx) { /* 必填 */ },
  inventory(ctx) { return [] },      // 可选:--inventory 时返回要打印的行
}
```

**`ctx` 提供什么**(`pluginContext()`,刻意只给只读能力 + 两个报告函数,插件不能改变编排):

```
ROOT project join existsSync statSync read rel err warn git lastCommitTs dirtyFiles mtime
```

注意 `ctx` **不提供目录遍历** —— 需要 walk 的插件自行 `import { readdirSync } from 'node:fs'`
(`ratchet.mjs` 与 `spec-xref.mjs` 都是这么做的)。
`ctx.project` 就是解析好的 `project.json`,**插件不要自己读配置文件**。

**`watches` 为什么由插件自己声明**:曾经 `packages/server/drizzle/meta/_journal.json` 这条路径
写死在通用核心里 —— 那是 drizzle 插件的关注点,却长在与宿主项目无关的地方。
换项目时它既不在 `project.json` 也不在 `guards/`,**grep 不到**。

### 失败模式

插件出任何问题都报 `REPO/plugin-error`,**不静默跳过**:声明了但文件不存在、加载失败、
没按契约 `default export`、`run()` 抛异常。理由是「静默少跑检查」比「报错」危险得多。

### 现有插件

| 插件 | 管什么 | 为什么是项目级 |
|---|---|---|
| _(数据库迁移台账)_ | weiran4j 尚未选定迁移方案（Flyway / Liquibase），因此暂无对应插件。选定后需要新写一个：迁移脚本是「序号型共享资源」，序号不递增会让迁移被静默跳过，这类失效不会报错，只会表现为线上 schema 漂移 | 判定**方法**属于流程，判定**代码**属于项目 |
| `rules-index.mjs` | `CLAUDE.md` 的规则索引表双向完整性:①表里登记的 `openspec/rules/` 文件必须存在(`REPO/rules-index-dangling`) ②`rules/` 下的每份 `.md` 必须被登记(`REPO/rules-index-missing`,`README.md` 豁免) | `rules/` **不会被自动注入提示词**,那张表是它唯一的唤起途径 —— 表漏一行,对应规则就等于不存在 |
| `components-registry.mjs` | `web/src/components/` 与 `web/src/layouts/` 下每个组件文件名都必须在 `rules/advisory/components.md` 正文里出现(`REPO/components-unregistered`);测试、`index`/`types`/`constants` 与 `componentsRegistry.exempt` 豁免 | 扫哪几个目录、清单在哪是本仓库约定 |
| `state-waitlist.mjs` | `state/bizs/*.md` 条目编号:①文件内重号(`REPO/state-id-dup`) ②`<文件名>.md#NN` 引用指向不存在的条目(`REPO/state-id-dangling`) ③又出现已废止的 `T-NN`/`B-NN`(`REPO/state-id-legacy`) | `#NN` 编号格式与 `bizs/` 目录是本仓库 `state/` 的约定 |
| `ratchet.mjs` | 存量只降不升(见 §7) | 规则内容是项目事实,住在 `project.json` |
| `spec-xref.mjs` | 主 spec 正文里 `[FR-NNN]` 引用的目标必须存在 | 需求 ID 格式是本仓库约定 |
| `worktree-orphan.mjs` | 孤儿 worktree:①change 已归档而注册项还在 ②目录还在而注册项没了(`git worktree prune` 清不掉这一类)。**豁免当前所在的 worktree** | 「worktree 放在哪、目录名怎么对应到一个 change」(`.worktrees/<change-id>`)是本仓库约定;换项目仍会泄漏,但位置与命名完全不同 |

`spec-xref` 的口径值得单独记一笔:**只认方括号 `[FR-017]`,裸编号 `FR-017` 不管**。
粗口径实测在 104 个能力里命中 17 处,其中 **16 处是跨能力引用被误判** —— 仓库里的跨能力写法
至少四种,最后一种靠上文指代,**文本规则不可解**。它还会跳过行内代码 span 与围栏块:
「谈论一条引用」和「作出一条引用」是两回事,否则**本检查自己的规格**会第一个被它报出来。

---

## §7 棘轮(ratchet)

### 它解决什么

`L2c/constitution-check` 只能验证 `design.md` **回答了**每条原则,验证不了答案是**真的** ——
填 ☑ 的人有没有真的没用旧协议,那张表看不出来。

让宪法里「MUST NOT 新增 X」这类条款真正生效的,不是更聪明的评审,而是**把存量数冻成基线,
只准降不准升**。

这同时解决了宪法的另一个毛病:把具体数字写进宪法正文,而没有任何机制维护它们 ——
数字一过期,宪法就开始撒谎。现在**基线是唯一事实源**,`rules/enforced/constitution.md` 只引用它、不复述。

### 规则字段

```json
{
  "id": "select-bare-module-cache",
  "title": "下拉数据源里没有失效路径的模块级裸缓存",
  "principle": "CP-10",                          // 守护哪条宪法,报错时会带出来
  "roots": ["packages/web/src/components"],      // 扫哪些目录
  "extensions": [".ts", ".tsx"],                 // 默认 .ts/.tsx
  "exclude": ["path/to/file.ts"],                // 按完整路径排除
  "patterns": ["\\nlet \\w*[Cc]ache\\w*\\s*:"],  // 正则,按全文计数
  "baseline": 0,                                 // 唯一事实源
  "target": 0,
  "plan-note": "……",                             // 完整设计论证:正则为什么这么写、roots 为什么这么圈
  "plan": ["……"],                                // 分阶段退役计划,--inventory 打印
  "guidance": "……"                               // 违规时追加到报错文案里
}
```

### 判定

| 实测 vs 基线 | 结果 |
|---|---|
| `> baseline` | **error** `REPO/ratchet-increased` —— 新增了违规点,这正是要拦的 |
| `< baseline` | **error** `REPO/ratchet-baseline` —— 清理成果必须落进基线 |
| `baseline == null` | warn,并报出当前实测值(用于首次播种) |

**实测低于基线也报 error**,理由是:基线永远停在最高水位,等于给「以后再加回来」留了额度。

> **`baseline` 只在存量真的减少时下调,不是为了过检查而改。**

### 三个踩过的坑

**① 正则不能用 `^` 锚定。** `measure()` 是 `new RegExp(src, 'g')`,**没有 `m` 标志**,
`^` 只匹配整个文件开头 —— 规则恒 0 命中,变成一个沉默失效的假守卫。要求行首用 `\n` 前缀。

**② 正则会命中「对该反模式的警告文字本身」。** 合规组件的头注释里往往**逐字引用**了反模式
(「刻意不写 `let cache: T[] | null` 那种裸缓存」),naive 正则会把这些警告数成违规。
`\n` 前缀顺带解决了这个 —— 它天然排除以 ` * ` 开头的注释行。

**③ 按函数名匹配会误伤薄委托别名。** 曾有四条按名字匹配的模式,实测命中的全是收敛后留下的
`const firstDayOfMonth = toIsoFirstDayOfMonth;` 这类可读性包装 —— 不含逻辑,不是重复实现。
改成按**形状**匹配(`instanceof Date` / `getFullYear` / …)后既精确又不误伤。

**④ `roots` 圈大了会逼人去改本不该改的文件。** `hooks/useUserOptions.ts` 也有模块级 cache,
但它配了 TTL,按 CP-10 属**合规**。把 `roots` 放大到整个 web 会把它计入(实测 +1)。
收窄 `roots` 不掩盖违规 —— 前提是宪法原文点名的就是那一类。

> 这几条的完整论证写在各规则的 `plan-note` / `guidance` 字段里。
> **改棘轮规则前先读那两个字段**,不要只看 `patterns` 就照葫芦画瓢。

---

## §8 两条「模板镜像」检查

`rules/enforced/constitution.md` 与 `rules/enforced/project.md` **不在 OpenSpec 自动注入 prompt 的三处之内**
(`config.yaml` / `schema.yaml` 的 instruction / `templates/` 全文)。
在 instruction 里写「详见 XXX.md」只是**祈使句,不是依赖** —— agent 不主动 Read,那份内容就等于不存在。

所以机制是:**把「有哪些条目、必须逐条回答」硬注入进模板 + 硬校验 ID 一致性;
「条目具体说了什么」才留在 rules/。** agent 即使一次都不打开它们,也无法跳过那一层。

| 检查 | 比对什么 |
|---|---|
| `TEMPLATE/constitution-rows` | `rules/enforced/constitution.md` 的 `### CP-N` ↔ `templates/design.md` 宪法对照表的行 |
| `TEMPLATE/profile-rows` | `rules/enforced/project.md` 的 `### <前缀>-N` ↔ 六个模板槽(SL/WT/CC/PK/TG/DS) |

**只要求 ID 覆盖一致,不要求文字复述一致。** 只加 ID 不写行、或只删行不删 ID,都会被拦。

`L2c/constitution-check` 则从 `rules/enforced/constitution.md` **动态读取** `### CP-N` 清单 ——
在那里加一条原则,下一个 change 的 design 就必须回答它,**不用改 `check.mjs`**。

> ⚠️ 这两个文件的路径**硬编码**在 `check.mjs` 里。移动或改名必须同步改代码。

---

## §9 加一条检查

1. **先问它该不该是检查。** 判据:出错时会不会不报错。防「写得糙」的不要做成 error。
2. 在合适的 `checkXxx()` 里调 `err(id, file, msg, line)` 或 `warn(...)`。
   ID 形如 `L4/task-mapped`、`REPO/xxx`、`TEMPLATE/xxx`、`META/xxx`。
3. **在 `CHECK_DOC` 加一行**写明它守护什么失效模式。忘了会被 `META/check-undocumented` 直接报错 ——
   `emittedCheckIds()` 扫 `check.mjs` 与 `guards/*.mjs` 里出现的每个 ID 字面量,反向也查
   (CHECK_DOC 有记录但代码里已无对应检查 → warn)。
4. **考虑分阶段生效**:中间态该 warn 还是 error?见 §4。
5. **做注入式验证** —— 故意写一处违规 → 确认转红 → 移除。成本约 2 分钟。
   > **一个不会响的守卫比没有守卫更糟**:它让人以为约束已经守住了。棘轮那两种沉默失效
   > (§7 ①②)都是这么发现的。
6. **更新本文** —— 若改动落在本文覆盖的机制上,见 §11。

项目特有的判断**不要写进 `check.mjs`**,写成 `guards/` 插件(§6)。

---

## §10 已知陷阱

**`check.mjs` 靠自身位置反推仓库根**(`ROOT = dirname(import.meta.url)/..`)。
把它移进子目录会让 `ROOT` 变成 `openspec/`、`OPENSPEC_DIR` 变成 `openspec/openspec/` ——
连带 L7 的 `packages/` mtime 比对与全部棘轮规则的 `roots` 一起失效。**别移。**

**`openspec/specs/README.md` 是生成物。** 用 `--write-index` 生成,`L10/spec-index` 兜底,
两者同源所以不可能漂。**永不手改、永不手工合并冲突** —— 手改的索引会在下一次归档后再次过期,
而过期的索引比没有索引更糟:它让人以为自己看过全貌了。

**`--explain` 的 `!` 前缀**表示「CHECK_DOC 有记录但代码里已无对应检查」。看到它说明清单在失真。

**`L7/evidence-fresh` 按分钟粒度比较**,而 turbo 即使全缓存命中也会回写 `packages/*/dist` ——
证据日志会永远「早 0 分钟」。解法见 `rules/schema.md` 的 L7 一节。

---

## §11 维护约定:改了 `check.mjs` 要同步改什么

> **本文是手写的,没有「同源生成」保护。** 它描述的机制变了而本文没改,就会变成一份
> 看起来权威的假说明 —— 这正是 `design/README.md` 删掉那份检查清单的原因。

有机械守卫兜底的部分(改了忘同步会被 `META/check-doc-stale` 报错):

| 改了什么 | 本文要同步 |
|---|---|
| 新增/删除 CLI flag | §3 的命令块 |
| `project.json` 增删顶层字段 | §5 |
| `guards/` 增删插件文件 | §6 的插件表 |

**没有守卫、只能靠这张表唤起**的部分:

| 改了什么 | 本文要同步 |
|---|---|
| `runAll()` 的调用顺序、新增/删除编排步骤 | §4 |
| `pluginContext()` 暴露的 ctx 字段 | §6 契约 |
| 棘轮规则字段的语义、判定分支 | §7 |
| 分阶段生效(warn↔error 升降级)的口径 | §4 |
| 归档件豁免范围 | §4 |

**不需要同步的**(它们有唯一事实源,本文按 §0 只指过去):

- 加/删一条检查 → 改 `CHECK_DOC`,本文不列清单
- 改 `commands` / `ratchet.baseline` / 豁免清单的**内容** → 本文只讲字段语义,不抄值

改完跑一遍:

```bash
node openspec/check.mjs && node openspec/check.mjs --explain
```

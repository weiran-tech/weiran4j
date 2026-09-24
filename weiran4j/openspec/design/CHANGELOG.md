# 流程本身的修改记录

记录 **openspec 流水线的演进**(schema / 模板 / 校验 / 文档结构),不记录业务 change ——
业务 change 的记录在 `openspec/changes/archive/`。

新条目加在最上面。

---

## 2026-09-07(日) · waitlist 三份文件合并改名

### 起因

`state/` 下原有 `waitlist-tech.md`(技术债,T-NN)、`waitlist-business.md`(业务问题,B-NN,
实际长期为空)、`waitlist-pipeline.md`(流水线自身欠账,P-NN)三份文件。
业务与技术分成两份的意义不大——`waitlist-business.md` 自建立以来从未有过条目,
维护约定又与 `waitlist-tech.md` 完全相同,不如合并成一份、按前缀区分。

### 改了什么

| 旧 | 新 | 说明 |
|---|---|---|
| `state/waitlist-tech.md` + `state/waitlist-business.md` | `state/waitlist.md` | 合并为一份,`T-NN`/`B-NN` 同一份索引表 |
| `state/waitlist-pipeline.md` | `state/waitlist-workflow.md` | 单纯改名,内容不变,与「三个目录三种时态」的措辞更一致 |

全仓引用已同步:`CLAUDE.md` 的「`state/` 读写时机」四条、`.claude/skills/devops-ff-workflow/SKILL.md`、
`docs/00-决策记录.md`、`openspec/config.yaml`(两处会被注入 agent 提示词的 rules 字段)、
`openspec/design/pipeline.md` 的目录树、`openspec/design/README.md`、
`openspec/rules/advisory/{pitfalls,toolchain}.md`、`openspec/rules/enforced/project.md`。
`openspec/changes/archive/**` 下的历史归档文件**未改**——它们是过去某次 verify/interview 的
真实记录,当时确实指向旧文件名,属于历史事实,不是需要保持同步的活引用。

### 验证

`node openspec/check.mjs` 全绿(该目录不受任何机械检查看守,过期不会报错,
纯靠 `CLAUDE.md` 的索引表与本 CHANGELOG 唤起)。

---

## 2026-09-07(日) · 目录改名对齐上游 + rules/ 拆 enforced/advisory

### 起因

本仓库的 openspec 基础设施是从 mono4ts 的**早期快照**移植来的,此后没有跟进。
上游后来把三个目录改了名、并把 `rules/` 按「有没有机械兜底」拆成两层,
本仓库一直停在旧布局。差异累积到「照着上游文档做,路径全对不上」的程度。

### 改了什么

| 旧 | 新 | 说明 |
|---|---|---|
| `openspec/readme/` | `openspec/design/` | 旧名容易被当成「仓库的 README」,实际是流水线的设计说明 |
| `openspec/reality/` | `openspec/state/` | 与 `rules/`(现在必须)/ `design/`(过去为什么)构成三种时态 |
| `openspec/checks/` | `openspec/guards/` | 与 `check.mjs` 区分:一个是检查**实现**,一个是项目级**插件** |
| `openspec/rules/constitution.md` | `openspec/rules/enforced/constitution.md` | 见下 |

**`rules/` 拆成 `enforced/` 与 `advisory/`**:两者的差别不是主题,是**可靠性** ——
`enforced/` 漏改会被 `node openspec/check.mjs` 拦住,`advisory/` 没有任何守卫、漏读是静默的。
这个差异原先只写在表格的一列里,现在变成路径的一部分:
`rules/advisory/toolchain.md` 这个路径本身就在说「这份没有守卫」。

### 新增

| 文件 | 为什么 |
|---|---|
| `openspec/rules/README.md` | 目录准入标准 + 四个送达通道 + 新规则落点的决策流程 |
| `openspec/rules/advisory/pitfalls.md` | 流水线各层踩过的坑。**只写本仓库真踩过的**,上游的坑没有照搬 |
| `openspec/rules/advisory/toolchain.md` | 工具行为与欠账(Gradle 配置缓存、JDK 21、wuli3 底座、响应体 `code` 是字符串) |
| `openspec/guards/rules-index.mjs` | 守 `CLAUDE.md` 规则索引表的双向完整性,见下 |
| `openspec/state/waitlist-workflow.md`(原名 `waitlist-pipeline.md`,见下方 2026-09-07 改名条目) | 流水线自身的欠账(P-001…P-003) |

**`rules-index.mjs` 补的是一个真空**:`openspec/rules/` 下的内容**不会被自动注入提示词**
(OpenSpec 只拼 `config.yaml` / `schema.yaml` 的 instruction / `templates/` 三处),
唯一的唤起途径是 `CLAUDE.md` 的索引表 —— 而那张表此前零机械兜底。
现在它双向看守:表指向不存在的文件转红(`REPO/rules-index-dangling`),
`rules/` 下有文件没登记也转红(`REPO/rules-index-missing`)。
**已做注入式验证**:两个方向各故意制造一次违规,确认转红后移除。

### `check.mjs` 的改动

- `constitutionPrinciples()` 与 `profileItems()` 的硬编码路径改到 `rules/enforced/` 下
- `CHECK_MANUAL` 从 `readme/check.md` 改到 `design/check.md`
- `checkDocSync()` 与 `emittedCheckIds()` 扫的插件目录从 `checks/` 改到 `guards/`
- `checkDocSync()` 的反向匹配正则收紧为「裸文件名」与 `guards/` 前缀两种写法 ——
  原先光秃秃的 `([a-z0-9-]+\.mjs)` 会把说明书里提到的**其他**脚本误判成
  「插件删了说明书还留着」,而修法是删掉一句正确的说明,恰好是最坏的结果
- 新增两条 `CHECK_DOC` 条目(`META/check-undocumented` 要求加检查必须同时写说明)

### 刻意**没有**做的事

**没有建 `rules/enforced/project.md`**(上游有)。`TEMPLATE/profile-rows` 是**双向**校验,
而本仓库六个模板槽里至今是 mono4ts 的原文(`packages/shared`、drizzle、`wt.mjs`)——
先建 `project.md` 会让两边 ID 集合对不上、整表当场全红。
正确顺序是**先把六个槽改写成 Java/Gradle 的事实,再建 project.md 镜像它**。
登记为 `state/waitlist-workflow.md`(原名 `waitlist-pipeline.md`)的 P-001,此后已解决——
见下方 2026-09-07 的 P-001 关闭条目。

**没有建 `rules/advisory/components.md`**(上游有,管 React 公共组件清单)。
本仓库前端还在起步,没有值得「先查再造」的存量组件 ——
空清单会让人以为查过了,比没有更糟。

**没有回改历史记录**。`openspec/changes/archive/` 下已归档 change 里的
`openspec/reality/...` 等旧路径是**当时真实写下的内容**,不随本次改名回改;
本文件下方 2026-08 及更早的条目同理 —— 那些记的是**上游 mono4ts** 的演进,
不是本仓库发生过的事,已一并登记为 P-002。

---

## 2026-08-29(五) · worktree 存放目录改浅:`.claude/worktrees/` → `.worktrees/`

### 起因

`.claude/worktrees/<change-id>/packages/web` 这种深度在日常 `cd`/`pnpm --filter` 操作里体感明显,
纯粹是路径深度问题,与隔离效果无关——`.claude/` 前缀本身不承担任何隔离语义,只是历史上顺手放进了
`.claude/` 目录。

### 改了什么

新目录名与旧目录名都是纯配置层的字符串常量,不涉及隔离机制本身:

| 改动 | 位置 |
|---|---|
| `WORKTREES` 常量从 `.claude/worktrees` 改为 `.worktrees` | `scripts/wt.mjs`、`openspec/guards/worktree-orphan.mjs`(两处硬编码,必须同步) |
| 忽略规则跟着改名 | `.gitignore` |
| 两条 Scenario 的判据示例路径跟着改名 | `openspec/specs/worktree-lifecycle/spec.md` |
| 约定描述文字跟着改名 | `openspec/design/check.md` 的 `worktree-orphan.mjs` 一行 |

`openspec/design/why.md` 里 2026-08-09 那次磁盘占用快照(`.claude/worktrees/agent-*`)是历史
事实记录,不随本次改名回改——它记的是当时真实观察到的路径,不是当前约定。

### 迁移

存量遗留的 `.claude/worktrees/` 目录(若有)需要手工 `git worktree remove` 后删除;新建的
worktree 一律落在 `.worktrees/` 下。旧目录名不再被 `worktree-orphan.mjs` 识别,不会污染孤儿检测。

---

## 2026-08-29(五) · worktree 判据反转为「能不能并行」+ 初始化/销毁脚本 + 孤儿闸门

### 起因

`rules/enforced/project.md` 的 worktree 判据(`WT-0`~`WT-7`)整套建立在一句从未被验证过的断言上:
**「worktree 里跑不了 build/test/lint」**。实测把它推翻了(`2e0f498`,新建 worktree 后):

| 命令 | 耗时 | 备注 |
|---|---|---|
| `pnpm install --frozen-lockfile` | **15.2s** | 117,023 个文件;pnpm store 已热、APFS CoW |
| `pnpm build` | **42.9s** | turbo 全冷 |
| `pnpm lint` | **9.2s** | |
| `pnpm test` | **68.6s** | |
| `openspec:check` | 通过 | |

**全程没有 `packages/server/.env`,也没有任何 `dist/`。** 原因:`packages/shared` 的
`main`/`types`/`exports` 全部指向 `./src/*.ts`(不存在「未构建」状态),`config.ts` 的
`envSchema` 每个键都有 default(只有真去连 PG/Redis 才失败)。

这条错误论据的传播方式值得记一笔:它是从「`.gitignore` 里有 `dist/`」**推**出「缺了它会编译失败」的,
推论看着天经地义、从没人跑一次验证;而它一旦写进判据表就成了「不要切 worktree」的理由,
反过来让人更没机会发现它是错的。

### 改了什么

| 改动 | 位置 |
|---|---|
| 判据语义反转:**每个 change 一个独立 worktree**,`WT-0`~`WT-7` 改为回答「**能不能与他人并行推进**」;8 个 ID 全部保留 | `rules/enforced/project.md` 「二」、`templates/exec-plan.md` 的 `worktree-tradeoffs` 槽 |
| 新增 `scripts/wt.mjs`(零依赖):`new` 建 worktree 并完成全部初始化(复制 `settings.local.json` 与两个 env、写三个端口键并保证代理与 `PORT` 对齐、按需 install);`done` 销毁并清两侧残留 | `scripts/wt.mjs` |
| 新增孤儿闸门 `REPO/worktree-orphan`:双向检测(已归档而注册项还在 / 目录还在而注册项没了),**豁免当前所在 worktree** | `openspec/guards/worktree-orphan.mjs`、`project.json`、`check.mjs` 的 `CHECK_DOC`(+1 行) |
| `.claude/worktrees/` 的忽略规则从 `.git/info/exclude` 挪进 `.gitignore` —— 前者不进版本库,换机器即失效,而失效后 worktree 目录会污染 `git status`,那正是 `WT-0` 判据 1 的信号源 | `.gitignore` |
| **共享数据库**成为明确口径(`seed` 从不删除、落后分支 `migrate` 静默跳过、迁移只加不删);**唯一例外**:产迁移的 change 必须 `--isolate-db` | `rules/enforced/project.md` `WT-5` |
| 「验证回主干」改为**两级验证**:lane 内自测在 worktree 里跑,L7 证据在合并后产生一次且必须是最后一步 | `templates/exec-plan.md`、`design/why.md` |
| 记入「worktree 内必须新开 session」—— 写后校验钩子按 session 启动目录解析,跨目录编辑会**静默**校验错目录 | `design/why.md` 劣势 5 |

### 三条静默失效(本次新记的)

1. **共享库 + 两边都产迁移** → 后生成而 `when` 更早的迁移被 drizzle **静默跳过**,表现为「列不存在」像代码 bug。`drizzle-journal.mjs` 查的是台账**文件**,文件本身合法,拦不住。**换库名是唯一防线。**
2. **孤儿闸门若不豁免当前 worktree** → 在 worktree 内提交自己的归档会被自己拦下,而此时它既删不掉(内含未提交改动)也提交不了,唯一出口是 `--no-verify`。
3. **`CLAUDE_PROJECT_DIR` 跨目录** → 在主工作区的 session 里改 worktree 文件,校验的是主工作区那份,**一路绿灯,绿灯来自另一个目录**。

### `WT-7` 为什么留着而不作废

它原本的理由(「安装成本就超过任务本身」)已随实测失效,但**这个 ID 不能空**——
`TEMPLATE/profile-rows` 比对 `rules/enforced/project.md` 与模板槽的 ID 集合。改法是让它在新语义下
说一句真话:改动小从来不是不能并行的理由,决定并行与否的是**文件集是否相交**(`WT-4`/`WT-5` 在管)。

---

## 2026-08-29(五) · L7 红灯必须归因 + `test` 改为按改动范围跑 + 补 CI 全量关口

### 起因

`2026-08-29-biz-ledger-create-attachment-binding` 的 L7 撞上一条**在 `main` 上就存在**的红灯
(`pnpm test` 里有 1~3 条用例在全量并行跑时不稳定)。模板口径是「任一红灯 → 回 L5」,
但回 L5 也不会变绿 —— 执行者要么卡死,要么开始为红灯找理由。后者一旦成习惯,真回归也会被放过。

顺带暴露两件事:① 为给红灯归因而跑的 `git stash` 会刷新 `packages/` 的 mtime,
把刚留好的三份证据全部作废(`L7/evidence-fresh` 按该目录 mtime 判定),白跑一轮;
② `pnpm build` / `test` / `lint` **此前只在开发机上作为 L7 证据跑过,CI 里一次都没跑**。

### 改了什么

| 改动 | 位置 |
|---|---|
| 红灯**必须做基线对比**(stash 后重跑)才能判定回 L5 还是放行;放行的必须登记 waitlist 并交 L9 确认 | `templates/exec-verify.md`、`config.yaml` 的 `rules.verify` |
| 写明**顺序:先取基线,再留证据** —— 反了就要重跑一整轮 | 同上 |
| `rules.verify` 不再复述 `pnpm build/test/lint` 三条命令,改为指向 `project.json` 的 `commands`(与 2026-08-22 那次的口径统一) | `config.yaml` |
| L7 的 `test` 从全量改为**按改动范围**(`pnpm test:changed` → `vitest --changed`,基线默认 `main`,`TEST_BASE` 可覆盖) | `project.json` 的 `commands`、`design/check.md` |
| exec-plan 新增「L7 测试基线」一栏 —— 分支不是从 `main` 切出来的必须写明,否则 L8 无法复核选集 | `templates/exec-plan.md` |
| 新增 CI 跑**全量** build/test/lint —— 拆成 build / lint / test-web / test-server 四个并行 job(实测 682s → 443s,-35%;runner 分钟数 682s → 783s),公共 setup 抽进 composite action,turbo 缓存走 actions/cache | `.github/workflows/verify.yml`、`.github/actions/setup/action.yml` |

### 为什么按改动范围跑不会漏

`vitest --changed` 取的是**模块图**而不是「改了哪些测试文件」:改一个 hook 会带出所有 import 它的
页面用例(实测那次真正踩到的 `InvoicePage.test.tsx` 就在选集里);改 `vitest.config.*` /
`test-setup.*` / `package.json` 这类全局输入时**自动退化为全量**(也已实测)。

实测收益:1437 → 671 条用例,44s → 27s。

**但前提是全量得有人跑** —— 所以 `verify.yml` 与这条改动是一对,不能只做前者。
CI 那几个 job **不要**加 `--changed`。

### CI 的两个实测踩点

- **turbo 缓存目录必须用 `TURBO_CACHE_DIR` 环境变量**,不能写成 `pnpm build -- --cache-dir=.turbo`:
  后者 turbo 会把参数继续透传给子任务,vite 直接报 `CACError: Unknown option --cacheDir`。
  配错时又是**静默**的(写进 turbo 默认目录,而 actions/cache 存的是 `.turbo`),表现只是
  「一次都不命中」—— 故 build job 里加了一步断言,`.turbo` 为空就直接红。
  本地实测缓存生效:build 4.3s → 64ms、test:web 58s → 65ms(FULL TURBO);
  CI 上实测:改动不碰 `packages/**` 时四个任务全部命中(build 0s · test-web 1s · test-server 1s · lint 1s),
  整轮墙钟 443s → 约 100s —— 此时成本已全部是 `pnpm install`。
- **每个 job 用不同的缓存键前缀**:共用一个键会让并发 job 互相覆盖同一条条目,
  GitHub 只保留先写成功的那个,其余只在日志里留一行 warning。

## 2026-08-29(五) · 新增 `design/check.md` 说明书 + `META/check-doc-stale` 守卫

### 起因

`check.mjs` 的**机制**此前只散在 2600+ 行代码的注释里:编排顺序、`project.json` 每个字段
什么语义、插件契约长什么样、棘轮怎么判、加一条检查要做什么 —— 想搞清楚只能通读全文件。

### 为什么不是「把规则全列出来」

本文件 2026-08-18 条记录过一次教训:`README.md` §4 曾手抄一份检查 ID 清单,结果是
**四个互不相同的总数散在全文,外加几个早已被合并或删除的 ID**,清单因此被删除并立下明令
「不要再加回来」。

所以 `check.md` **刻意不复述检查清单**,改为按「有没有唯一事实源」划界:

| 信息 | 唯一事实源 | check.md |
|---|---|---|
| 有哪些检查、各自防什么 | `CHECK_DOC`(`--explain`) | 只指过去 |
| L7 要留哪几份日志 | `project.json` 的 `commands` 键名 | 只讲推导规则,不列 build/test/lint |
| 存量数字、退役计划 | `project.json` 的 `ratchet`(`--inventory`) | 只讲机制,不抄数字 |
| **编排顺序、字段语义、插件契约** | **只有代码** | **写在这里** |

最后一行是它存在的理由。

### 改动

**一、新增 `openspec/design/check.md`**(11 节)

§0 为什么这里没有检查清单 · §1 它补的是哪一段 · §2 三道防线 · §3 CLI · §4 编排顺序
(含分阶段生效与归档件豁免)· §5 `project.json` 逐字段 · §6 插件契约 · §7 棘轮
(含四个踩过的坑)· §8 两条模板镜像检查 · §9 加一条检查 · §10 已知陷阱 · §11 维护约定。

**二、新增 `META/check-doc-stale`**

「改 check.mjs 时同步改说明书」若只写成一句话,就是本仓库反复批判的**祈使句而非依赖**。
故做成检查,但**只看三样能机械判定、且漏了会静默失效**的结构性事实:

  1. CLI flag —— 加了没写进说明书,使用者根本不知道它存在
  2. `project.json` 顶层字段 —— 加了没写语义,下一个人只能去读 2000+ 行代码
  3. `guards/` 插件文件 —— **双向**:加了没写会漏,删了没删说明书那张表就开始撒谎

检查 ID 全集**不在此列**(归 `CHECK_DOC` / `META/check-undocumented` 管)。
说明书其余部分(编排顺序、ctx 字段、棘轮语义)没有守卫,靠 §11 的对照表唤起 ——
§11 明确区分了「有守卫」与「只能靠这张表」两栏,不假装全都守得住。

**注入式验证**(四条路径全部确认转红后还原):新增 `project.json` 字段 ✅ ·
新增 CLI flag ✅ · 新增插件文件 ✅ · 说明书提到不存在的插件 ✅。

**三、`design/README.md` 与 `CLAUDE.md` 补指针**

README §4 的禁令补一句「这条禁令只管清单,机制见 check.md」;
`CLAUDE.md` 三目录表的 `readme/` 行补上读写时机。

### 沉淀

**这条检查自己踩了一次它要防的坑。** 初版在 doc 注释里写了 CLI flag 解析式的示例,
而检查按源码文本匹配 —— 于是把示例文字本身数成了一个叫 `--x` 的 flag,一跑就报错。

这是 `rules/schema.md`「跨层 · 通用」第一条(**基于源码文本的判定会命中「对该反模式的
警告文字本身」**)的第**三**次实例,前两次分别是 spec 判据整目录 grep 中文文案、
ratchet 用 `\blet cache` 命中合规组件的头注释。处置照该条既有做法:注释里避开字面量,
并就地写明为什么不能写。

### 影响

`check.mjs` +52 行(一个函数 + 一条 CHECK_DOC + 一处调用),无既有逻辑改动。
`node openspec/check.mjs` 全绿。

---

## 2026-08-29(五) · `rules/` 价值复核:删掉已失效的断言与跨文件重复

### 起因

`rules/` 的五份规则里,有相当一部分条目描述的是**「不报错的静默失败」**,
而这类条目一旦对应的守卫落地(测试 / 棘轮 / 项目级 check),原文就从「有用的警告」
变成「过时的恐吓」—— 它让人以为还得手工核对,或者更糟:照着一个**已经不成立的事实**行动。

逐条对着代码核了一遍,发现 6 处断言与代码现状**相反**,4 处内容与相邻文件**逐字重复**。

### 改动

**一、修正与代码现状矛盾的断言(6 处)**

| 位置 | 原文断言 | 实际 |
|---|---|---|
| `project.md` SL-11 / `memory.md` | `0000_baseline.sql` 的 `when` 是未来时间戳 `1788900000000`,新迁移可能反而更小 | 实际是 `1787308546550`(2026-08-21,已是过去),24 条后续迁移全部自然递增。**该陷阱不存在** |
| `constitution.md` CP-8 | journal `when` 重复「没有任何一层校验会发现」 | `openspec/guards/drizzle-journal.mjs` 校验 `when`/`idx` 递增、tag 唯一、SQL 存在 |
| `constitution.md` CP-2 | AppModal 三套协议并存,附三阶段退役计划(41/14/6 处) | 计划已于 2026-08-15 执行完毕,shim 整体删除。棘轮剩下的 5 处全部来自 `PDFPreviewPanel` **自己**的同名协议 |
| `constitution.md` CP-3 | 新代码 MUST NOT 用 `fullscreenable` / `sizeMode` / `onToggleFullscreen` | 这些 prop 已从 `AppModal` 删除,传了 `tsc` 直接报 —— 由类型系统兜底 |
| `constitution.md` CP-10 | `CompanySelect` / `UserSelect` 仍是无失效裸缓存,「只出不进」不要求回头改 | 两者已于 2026-08-28 改造完毕,`select-bare-module-cache` 棘轮基线 0 |
| `project.md` SL-15 | `db/seed.ts` 的 `bizBindingSeedMap`;「只有实际跑 `db:seed` 才能发现」 | 已迁至 `db/resolve-biz-bindings.ts` 的 `BIZ_BINDING_SEED_MAP`,且由 `seed-data-integrity.test.ts` 四个用例守住 |

处置口径:**守卫落地了的条目不删,改写成「指向守卫」** —— 保留「它当初拦的是什么」
(用例转红时看得懂),删掉「你得手工核对」。SL-14 与 `memory.md` 的 `SEED_MENUS` 同此。

**二、删除跨文件重复(4 处)**

- `memory.md`「断言 Semi `Form.*` 必须包 `<Form>`」→ 与 `CLAUDE.md`「测试」一节逐字重复。
  `CLAUDE.md` **每次会话自动加载**,`memory.md` 靠触发条件唤起 —— 留强的那份。
- `memory.md`「检查器按字面量匹配会把守卫自身判成违规」→ 与 `schema.md`「跨层 · 通用」重复
  (原文自己都写着「参见 `rules/schema.md`」)。其独有的 `L8/requirement-coverage` 那半折进 `schema.md`。
- `memory.md`「写 spec / 判据之前」「跑 L7 证据时」两整节 → 是 L2/L7/L10 的层内坑,
  按 `memory.md` **自己声明的边界**应归 `schema.md`。已移入对应层。
- `rules/README.md`「硬编码路径警告」→ 与 `CLAUDE.md` 同名段落重复,改为指过去。

`memory.md` 由此收敛为它该管的东西:**工具行为与环境事实**(三个 clone 共库、drizzle-kit
交互式退化、水位线错位、种子 id 分段、无 e2e 设施),165 → 100 行。

**三、删除已归档的历史叙事**

- `project.md` SL-10 的「2026-08-22 基线化」全过程(旧链为什么坏、补了哪 24 处漂移、
  排除了哪 3 张孤儿表)→ 权威源是 `packages/server/src/db/migrate.ts` 顶部注释,规则文件不复述。
- `project.md` WT-0「判据补充记录(2026-08-23)」→ 其自身结论就是「WT-0 本身不改判据」,
  处置全在 `devops-ff-workflow` skill 里;完整复盘已在本文件 2026-08-23 条目。
- `project.md` WT-0「判据修订记录(2026-08-22)」→ 完整版已在本文件同日条目,
  就地只留「为什么判据长这样」+「一条经常误报的判据比没有判据更糟」这条教训。
- `components.md` 前言的「本文件原名 `ai-specs/project-specs.md`」→ 迁移史,无操作价值。

### 沉淀

**规则文件的第三种失效**,此前只写了两种(内容过期、清单有假条目):
**守卫落地后,原条目会从「警告」退化成「过时的手工步骤」。** 它不像假条目那样会让人白做检查 ——
它更隐蔽:人照着做了,做的是机器已经在做的事,还误以为这里没有防线。
所以**新增机械守卫时,必须回头查 `rules/` 里有没有描述同一个失效模式的条目,把它改写成指向守卫**。
这条已加进 `rules/README.md` 的决策流程 ①。

### 影响

纯文档,`node openspec/check.mjs` 全绿(未增删任何 `CP-N` / `SL-N` 等 ID,故
`L2c/constitution-check` 与 `TEMPLATE/profile-rows` 的 ID 集合不变)。

---

## 2026-08-22(四) · WT-0 判据收窄 + 两条测试有效性的通用教训

### 起因

`WT-0`(工作区已有其他进行中的 change 时必须切 worktree)自 2026-08-22 落地后,
**连续三个 change 假阳性**:`biz-ledger-view-mode-value-fallback`、
`biz-ledger-display-format-helpers`、`biz-formsections-view-smoke`。

三次都由同一个东西触发:`openspec/changes/fix-project-customer-select-options/`。
排查后确认它**不是废弃 change,而是一次成功归档之后被重新 `mkdir` 出来的 3 个空目录** ——
0 个文件、git 不跟踪,内容早在 2026-08-20 就已完整归档到
`changes/archive/2026-08-20-fix-project-customer-select-options/`(16 个文件),
主 spec `biz-ledger-select-field` 也已落库(6 requirements)。
(排查中一度推断是 `openspec archive` 不清理空目录,**实测证伪** —— 本轮归档的两个 change 都很干净。)

真正的代价不是「多切了几次 worktree」,而是**判据失去权威**:执行者三次判为「形式命中、实质豁免」后,
已经养成看到它就豁免的习惯 —— 而第三次恰恰真的撞上了别的 session 在同一工作区改流水线文件,
那次豁免是错的。**一条经常误报的判据比没有判据更糟**,因为它训练人忽略它。

同一批 change 还暴露了两条与测试有效性有关的通用教训,一并记录。

### 改动

**一、`WT-0` 判据收窄(`rules/enforced/project.md` + `templates/exec-plan.md`)**

原判据第 2 条「`ls openspec/changes/` 有第二个未归档的 change 目录」改为三条,命中任一即触发:

1. `git status --short` 有**他人的**未提交改动;
2. 存在第二个未归档 change,**且它有实际文件、且近 24 小时内有文件被修改**;
3. 近数小时内 `git log` 出现**非本 change 的提交** —— 这条是新增的,也是三次事故里
   **唯一真正有效**的信号(前两次假阳性时它是阴性,第三次真撞车时它是阳性)。

同时明确 **「独立分支」是可接受的等价隔离**:它同样解决「L9 拿不到可签字的 diff」,
且不付出 worktree 里跑不了 `build`/`test`/`lint` 的代价(`node_modules` / turbo 缓存不跟随)。
但它解决不了「对方直接改你正在编辑的文件」,所以判据 1 或 3 命中且目录重叠时仍应切 worktree。
选分支要在 `exec/plan.md` 第 5 节写明理由,**不要假装判据没命中** —— 那正是前三次的错误形态。

顺带清理了那 3 个空目录,活跃 change 列表现已为空。

**二、断言变红时,必须确认「变红的原因」是否为真**

`biz-formsections-view-smoke` 首次运行时 18 个组件中 **12 个** view 断言变红,形似抓到一批存量缺陷。
逐个核查后确认**全部是假阳性**:选择器把 `BizLedgerFormGrid` 为奇数字段行发出的 `colSpan: 0`
占位格也选中了 —— 该格不参与布局、不显示,为空是正确的。

若当时直接把 12 个当成「守卫抓到的存量缺陷」上报,会得出完全错误的结论并触发一轮不必要的「修复」。

该 change 的验收标准里本已要求「把渲染层改回缺陷形态,断言必须变红」(证明断言不是恒为真),
但那**只验证了「能不能变红」,没验证「变红的原因对不对」**。两者都要验。
`colspan="0"` 这类「DOM 里存在但不显示」的元素是按 className 选元素再逐个校验时的通用陷阱。

**三、`vitest` 全绿 ≠ 类型正确**

同一个 change 里,测试文件用 `ComponentType<never>` 持有被测组件,`pnpm test:web` **33 文件 283 用例全绿**,
而 `pnpm build` 报 `TS2786: 'Component' cannot be used as a JSX component` + `TS2698`。
**vitest 不做类型检查**。L7 把 `build` / `test` / `lint` 三条并列跑是对的,这次是实证:
只跑 `test:web` 会完全漏掉。

### 未做的事

- **没有给 `WT-0` 加机检**。三条判据里 1 和 3 都可脚本化(`git status` / `git log`),但判定「是不是他人的
  改动」需要知道「本 change 拥有哪些路径」,而那信息在 `exec/plan.md` 第 5 节的自由文本表格里,
  没有结构化字段可读。要机检得先把「拥有文件集」结构化 —— 那是更大的改动,收益不明显,暂不做。
- **没有把「断言变红原因要核实」写进 schema 的 rules**。它是一条通用工程习惯,不是本流水线特有的
  格式约束;写进 rules 会让每个 change 的 prompt 都背上它,而它只在「新写守卫类测试」时才适用。
  目前留在本条目与 `biz-formsections-view-smoke` 的 verify 流程反馈里。
- **没有修那 6 处指向已失效路径的源码注释**(`BizLedgerFormGrid.tsx:151` 等指向
  `openspec/changes/fix-project-customer-select-options/specs/...`,该路径在 2026-08-20 归档时即失效,
  正确路径是主 spec `openspec/specs/biz-ledger-select-field/spec.md`)。属既有文档腐烂,
  按仓库约定改源码要先开 change,与本次流程改动不是同一件事。

详见 `openspec/changes/archive/2026-08-22-biz-formsections-view-smoke/exec/verify.md` 的「流程反馈」一节。

---

## 2026-08-22(三) · 消除三处重复定义:L7 命令清单、集成记录规模判据、artifacts.md 定位

### 起因

`biz-subsidiary-company-select`(12 个业务表单字段 select 化 + 12 个打印模板)走完 L0-L10 后做流程复盘,
量化结果是 **958 行流程文档 / 149 行代码新增**(约 6.4:1),而代码实质只有「1 个 14 行纯函数 +
36 处每处 1-3 行的机械改动」。流程本身零错、全程 `openspec check` 全绿 —— 问题不在正确性,
在**同一事实被定义多遍**,以及**规模判据选错了维度**。

本条目只处理「有硬证据的重复定义」,不做全局流程分档(理由见「未做的事」)。

### 改动

**一、L7 命令清单从三处复述收敛为单一事实源**

`project.json` 的 `commands` 本就是唯一事实源(`check.mjs` 的 `EVIDENCE_CMD` 已从那里动态读取),
但 `schema.yaml` 的 verify instruction 与 `templates/exec-verify.md` 的硬闸门表各硬编码复述了一遍
`pnpm build` / `pnpm test` / `pnpm lint`。`commands-note` 自己承认了这点:「改这里要同步改
schema.yaml 的 verify instruction 与 exec-verify.md 的硬闸门表」—— 三处手工同步,**漂移无人看守**
(机器只认 project.json,另两处写错了不会红,只会让 agent 跑错命令)。

改法:那两处不再写命令串,改为「逐条跑 `project.json` 的 `commands`,输出留到
`exec/evidence/<键名>.log`」;模板的硬闸门表改为空行 + 「逐行照抄 commands 的键」的填表说明。
`commands-note` 同步更正为「增删命令只改这里,不用改 schema.yaml 或模板」。

**二、集成记录的规模判据:执行单元数 → worktree 数**

这是上一条目「未做的事」里点名的正确方向,本次落地。原判据「1 个执行单元就删四节」错在维度:
**merge 与冲突只发生在 worktree 之间**,同一 worktree 里顺序做完的 N 个单元既不 merge 也不冲突;
反过来,「重复实现消除」「被牺牲的方案」即使单 worktree 也有实质内容。

改后:
- 只有「Merge 顺序」「冲突清单」按 **worktree 数**决定删留(1 个 worktree 时整节删掉)
- 「重复实现消除」「被牺牲的方案」「越界修改汇总」三节**与 worktree 数无关,永远保留**,
  确实没有就写「无」

本次复盘的 change 正是反例:2 个执行单元 / 1 个 worktree,按旧判据要展开四节(于是「Merge 顺序」
「冲突清单」记录的都是「不适用」),而它的两份 notes 里**各自都写了「考虑过但放弃的方案」**
(放弃给 12 个 DetailModal 包一层 wrapper hook、放弃让 `resolveOptionLabel` 兜底空值),
这些信息按旧判据没有任何位置进 verify.md —— 而它们恰恰是后人最容易「当成疏漏修回去」的部分。

模板同步区分了「worktree 数」(决定规模)与「执行单元数」(仅供参考)两个字段。

**三、`artifacts.md` 的定位写进模板**

`artifacts.md` **不是 schema 的 artifact**(8 个产出物里没有它),没有任何机器校验,它的存在完全
来自 `templates/tasks.md` 第 7 组的一条建议任务。因为定位从未写明,实际产出物普遍在复述
`verify.md` 的 L7 证据表、tasks 核对表与结论行 —— 复述既不增加信息,又会随 verify 的修订而失真。

在 tasks 模板里写明:它是**归档后给人读的验收摘要**,只写 verify.md 里没有的东西(面向人的范围
说明、运行时/手工验证的实际操作与结果、已知缺口),需要引用时写一句「详见 `exec/verify.md`」。

**四、L7 证据新鲜度的踩坑说明补进 instruction 与模板**

`L7/evidence-fresh` 按 `packages/` **整目录 mtime** 判定,留完证据后再补一行(哪怕只补个测试文件)
就会让已留日志全部失效,且**各 log 独立判定**,补跑一条不刷新其他几条。本次复盘的 change 就因为
写完 verify.md 后才补 `print.test.ts`,导致 build.log/lint.log 被判陈旧而重跑。
把「证据必须是代码全部改完之后才跑的最后一个动作」写进 instruction 与模板。

### 未做的事

- **共享层清单的三处定义不动**:`rules/enforced/project.md` 的 SL-1~SL-17(权威)→ `templates/explore.md`
  的三张表(逐行过)→ `templates/proposal.md` 的 5 行汇总(决定 Layer 0)。这看起来是三处重复,
  实际是**有意的三层递进**:权威清单 → 强制逐行核对 → 压缩成分层决策输入。压掉中间层会削弱
  「逐行过一遍」这个唯一的漏项防线,压掉第三层会让 proposal 失去分层依据。代价是填写量,
  但那是这条防线的成本而不是冗余。
- **宪法对照表仍要求逐条填**:纯前端小改动下 10 条里 9 条是「☐ 不涉及」,信息密度确实低,
  但逐条要理由正是为了防止整表打勾敷衍,且上一条目刚强化过 `L2c` 的缺行处置。不放宽。
- **不做全局「流程分档」**:曾考虑按「共享层零命中 + 单执行单元 + 有同类先例」自动切精简档。
  放弃理由:分档判据本身要维护、要校验,且判错一次的代价(跳过了本该走的闸门)远高于多填几张表;
  上面三项针对性改动已经吃掉了大部分实际浪费。
- **`exec/notes` 与 `verify.md` 越界申报的重复未消除**:notes 是单元自述,verify 是跨单元的
  保留/回退判定,单单元时确实是复制。但两者读者不同(notes 给集成者,verify 给 L9 签字人),
  且 `L8/overreach-section` 依赖 verify 里有这一节。暂留。

### 起因

`biz-ledger-view-mode-value-fallback`(纯前端渲染层改动,9 文件 16 行逻辑)完整走了一遍
L0-L10,过程中踩到 6 个与业务无关、纯属流水线自身的坑。它们的共同点是:**都不会让校验变红,
只会让执行者浪费时间或让清单撒谎**,因此不主动记录就会被下一个 change 原样再踩一遍。

`exec/verify.md` 的「流程反馈」一节本来就是为此设计的,但那份文件随 change 一起进了
`changes/archive/` —— **没人会去翻归档件里的 verify**。这条反馈通道默认是死路,必须由人
主动搬运到本文件才算落地。本条目就是那次搬运。

### 改动

**一、`rules/enforced/project.md` 的 SL-4 作废(假清单行)**

`SL-4 · packages/web/src/mocks/handlers/index.ts` 指向的文件与整个 `packages/web/src/mocks/`
目录都**早已不存在**,msw 也不在任何 package.json 的依赖里,而条目描述还写着「已有 40+ 条
import,新增 handler 几乎必然产生相邻行冲突」。每个 change 的 explore.md 都在给这一行老实写
「未命中」——一个永远不可能命中的检查项。

标记为作废(保留编号不复用),并从 `templates/explore.md` 的共享层第一张表删掉该行。
**清单类文档的失效项必须显式作废**:它让清单看起来周全,里面却有一条是假的,还带着具体到
让人不会去核实的数字,比没有这个检查项更有害。

**二、新增 `WT-0`:工作区已有其他进行中的 change 时 MUST 切 worktree**

原 WT-1~WT-7 全部在回答「**这一个 change 内部**要不要并行」,没有一条覆盖「**工作区里是不是
已经有别人**」。而后者会同时打穿三道闸门:对方的 TDD 红灯染红你的 L7;`git status` 交织两个
change 让 L9 拿不到可签字的 diff;对方若改 `rules/enforced/constitution.md`,`L2c` 动态读取清单会让你**已通过
人类审阅**的 design.md 立刻被判缺行。

本次三条全踩:另一 session 在同一 worktree 推进 `project-select-remove-cache`,其 CP-9 回归
测试先于路由修复落地(2 条红),其新增的 CP-9/CP-10 让本 change 已落章的 design 被判缺行。
本 change 服务端零改动,与红灯零因果关系,最终只能停下来等对方归档后重跑。

`WT-0` 同步加进 `templates/exec-plan.md` 的 worktree 判据表,并标注「先问这一条」。

**三、`config.yaml` 的 specs rules 新增一条:MODIFIED 的标题必须逐字一致**

`openspec archive` 的 MODIFIED 合并先按 Requirement 标题字符串定位,再**逐条比对 Scenario
标题集合**,少一条就中止归档:

```
MODIFIED failed for header "..." - current spec contains scenario(s) not present
in the modified block: "<原标题>". Aborted. No files were changed.
```

本次把一条 Scenario 标题改得「更准确」就触发了。原有规则只讲了 Requirement 标题会断链,
没讲 Scenario 标题也逐条比对 —— 补上,并给出动笔前先 grep 主 spec 标题清单的做法。

**四、`check.mjs` 三处判据修正**

- **`L4/contract-frozen`**:原按 `existsSync('exec/notes')` 判定「实现已开始」。写 exec-plan
  时顺手 `mkdir -p exec/notes` 就会误报(本次报了 4 条 error)。改为按目录下**是否存在 `.md`
  文件**判定 —— 空目录不是实现已开始的证据。
- **`L5/note-per-unit`**:原按文件名前缀 `E1-` 精确匹配。但 `exec/plan.md` 第 8 节允许单
  worktree 时把笔记**按层合并落盘**(逐单元分节),文件名形如 `E2-E6-grid-fallback.md`,
  于是 11 个单元 / 4 份合并笔记误报 7 条 warn。改为把文件名前缀里的 `Ea-Eb` 识别为**闭区间**,
  覆盖 Ea..Eb;单个 `E10-xxx.md` 仍只覆盖 E10。
- **`L2c/constitution-check`** 缺行报错文案:补一段说明「本清单是从 rules/enforced/constitution.md 动态读取
  的,若 design 早已落章而该原则是之后才进宪法的,那不是你漏填」,并指明正确处置 —— 补行
  (通常 ☐ 不涉及 + 判断依据)+ 在 L9 把「落章后改过 design」明示给人类重新确认,不要默认
  沿用原 `approved_by`。

**五、`CLAUDE.md` 新增「测试」小节**

断言 Semi `Form.*` 受控控件必须包一层 `<Form>`,否则控件不渲染任何 DOM,而失败信息只有
`expected null not to be null`,完全不提 Form context,极易误判成组件逻辑问题而去改被测代码。

### 未做的事

- **`verify.md` 流程反馈的搬运仍是纯人工**。本条目证明了这条通道会自然死掉。可考虑让
  `check.mjs` 在归档时检查「verify 的流程反馈非空 → CHANGELOG 是否有对应新条目」,但那需要
  一条跨文件的启发式判据,误报成本可能高于收益,暂不做。
- **`L5/note-per-unit` 的区间识别是有意放宽的**:文件名 `E2-E6-xxx.md` 若作者本意只覆盖 E2 和
  E6(不含中间),现在会被判为全覆盖而漏报。考虑到第 8 节明确许可按层合并,且该 warn 的目的是
  「别让实现知识丢失」而非精确计数,这个宽松是可接受的取舍。
- **SL-4 只作废未清理历史**:已归档 change 的 explore.md 里仍留着那一行「未命中」,不回改。
- **`verify` 模板的规模判据仍按执行单元数**:本次 11 单元 / 1 worktree / 零并行,导致
  「Merge 顺序」「冲突清单」两节记录的都是「无冲突」,信息量偏低。更合理的判据是按 **worktree
  数**决定这两节是否展开(「重复实现消除」「被牺牲的方案」即使单 worktree 也有实质内容,应保留)。
  本次未改,因为它牵动 schema.yaml 的 verify instruction 与模板两处,且不影响正确性。

详见 `openspec/changes/archive/2026-08-22-biz-ledger-view-mode-value-fallback/exec/verify.md`
的「流程反馈」一节。

---

## 2026-08-22(二) · `rules/enforced/constitution.md` 新增 CP-9 + CP-1 补充响应体条款

### 起因

`biz-payment-record-project-select` change 验证阶段(浏览器实测)连续挖出两个和"项目名称
select"本身无关、但阻塞了整条能力链路的既有代码 bug,均属于本可由一条明确原则挡住的类型:

1. `routes/biz/project.ts` 的 `GET /approved-options`/`GET /check-member-overlap` 注册在
   `GET /{id}` 之后,被后者按注册顺序捕获,路径字符串当 id 解析成 NaN,恒定 400——这个
   bug 自「已立项项目 select」能力最初上线起就存在,前端把错误吞掉显示成空态,从未被发现。
2. `ProjectSelect.tsx` 手写的响应体类型把 `/approved-options` 的裸数组响应错猜成了
   `{items:[...]}`(照抄同文件另一个端点的形状),`res.data.items` 恒为 `undefined`,
   `.map()` 抛出未处理的 Promise rejection。

两者都是"如果有一条对应的宪法原则,design 阶段就会被逼着回答一遍"的类型。

同一验证阶段还发现 `ProjectSelect.tsx` 的模块级缓存无失效机制,导致"后端修好了但前端标签页
永远看不到"——这类缓存的失败表现和"数据源本来就是空的"完全无法区分,同样值得一条原则。

### 改动

- 新增 **CP-9**(三、后端):同一路由文件内,单段静态 GET 路径 MUST 排在 `/{id}` 之前。
- 新增 **CP-10**(二、前端):模块级下拉数据缓存 MUST 能失效,不能"成功一次就永久生效";
  存量(`CompanySelect`/`UserSelect` 等)不要求立即回改,只出不进。
- **CP-1** 正文补充一段:GET 端点的响应体形状也属于"跨包契约",不能靠手写 interface 猜测。
- 速查表补 CP-9、CP-10 两行。

### 未做的事

未把这两条改成 `packages/shared` 里的强制类型检查或 lint 规则——目前仍是"design 阶段人工
对照宪法表"的软约束,不是编译期硬拦截。如果后续想做成硬拦截(比如一条扫描
`routes/biz/*.ts` 路由数组顺序的脚本),需要另开一次流程改动。

详见 `openspec/changes/archive/2026-08-22-biz-payment-record-project-select/`。

---

## 2026-08-18(二) · README 的检查清单删除:事实源收口到 `--explain`

### 起因:核对「README 说的」与「config.yaml / check.mjs 实际的」

结论先说:**`config.yaml` 与 `schema.yaml` 是对齐的** —— 8 个 artifact,8 个 `rules` 键,
一个不多一个不少。L0–L10 是**层**编号,不是 artifact 编号:L2 一层拆成 4 个 artifact(L2a-d),
L6+L8 合并成一个 `verify`,而 L3 / L5 / L7 / L9 / L10 根本没有 artifact(人闸、实现、机器闸、归档)。
「层比 rules 多」不是漂移,是这两者本来就不同构。

漂的是 README 自己手抄的那份检查清单。

### 手抄清单的实际衰变形态

| 位置 | 写的 | 实际(`--explain`) |
|---|---|---|
| §3.2 | 49 项通用校验(45 + 模板槽 2 + 1 + 1) | 模板检查已是 3 条(`slot-malformed` / `constitution-rows` / `profile-rows`) |
| §4 标题 | 覆盖的 47 项 | — |
| §7.3 正文 | 56 项里 49 项与语言无关 | 总数已变 |
| §7.3 表格 | check.mjs(42 项通用检查) | — |
| §3.2 | `L2b/*` 共 12 条 | 11 条 |
| §3.2 | `templates/`(11 份) | 9 份(8 artifact 模板 + `exec-note.md`),而**同段那张表列的正好是 9 份** |

同一份文档里四个总数互不相同,没有一个对。

引用了已不存在的检查 ID 三处:

- `L0/interview-section` —— 缺「未决歧义」节的判定已并进 `L0/ambiguity`(缺节 warn,带未决项进 proposal 才 error)
- `L2a/shared-impact-filled` / `L2a/crosscut-filled` —— 已收敛进通用的 `L2/required-table`,由模板里的 `<!-- openspec:required-table -->` 标注驱动
- `L7/evidence-exists` / `-nonempty` —— 实际 ID 是 `L7/evidence-missing`

另外 §7.2 把单条 `TEMPLATE/slot-malformed` 写成了 `slot-nested` / `-unmatched` / `-mismatch` /
`-empty` / `-unclosed` 五条(那五个是它覆盖的**形态**,不是五个 ID);
§4 表格里 `L2a/capability-duplication` 重复出现两行;
`config.yaml` 的 `rules` 明确点名的 `L2a/capability-not-change-name`、`L2a/capability-name-shape`、
`L10/spec-status` 则一条都没进那张「代表性检查」表 —— 手抄清单连"代表性"都没做到。

### 改法:删清单,不修清单

修一遍数字只能把过期时间往后推一个 change。真正的原因是**存在第二份清单**。
`--explain` 有 `META/check-undocumented` 兜底(加检查忘写说明直接报错,删检查后说明还留着会 warn),
它不会漂;README 里的必然漂。所以:

- §4 的整张表删除,换成一句「跑 `node openspec/check.mjs --explain`」+ 为什么不在这里列
- §3.2 / §7.3 的四处总数全部删除,改成指向 `--explain`
- 三处死 ID 改成现行 ID,`templates/` 份数改回 9,`L2b/*` 的条数直接不写
- §0 / §8 的 CLI 版本号只留 §0 一处,§8 改成回指
- `config.yaml` 顶部注释同步:不再暗示"每条 rule 都能在本文档里找到对应检查项"

顺带修了 `check.mjs` 里 `L2d/empty-task` 报错文案引用的 `L0/ambiguity-cleared`(不存在,应为 `L0/ambiguity`)——
用户看到的报错里印一个查不到的 ID,和文档写错等价。

### 留下的规矩

**文档里不复述检查全集,也不写检查总数。** 需要点名某条检查时,只在讲清某个具体判据处引用单条。
这条与本文档顶部「事实 vs 历史」是同一条原则的延伸:可枚举的东西只该有一个枚举点。

---

## 2026-08-15(十一) · 三处评估暴露的缺陷,连同两处配置收口

### 起因:用变异测试量「原生 CLI 到底抓不抓」

同一份合法 delta spec 施加 10 种缺陷,分别问原生 `validate --strict` 与 `check.mjs`。
**最关键的一行**:需求标题层级错,若**整份文件都错**原生抓得到;
若**1 条对 + 1 条错**,原生输出 `Change 'x' is valid` —— 而那条错层级的需求会在
`openspec archive` 时被静默丢弃。这是 check.mjs 存在的核心理由,现在是可复现的证据,不再是断言。

顺带修正一处此前的错误说法:**原生对「正文无 MUST」是报的**(WARNING 级,`--strict` 下计入 failed)。
之前记的「原生只认正文 MUST、写标题里不算」只对了后半句。

### 缺陷 1(真 bug):`L10/renamed-format` 装错了位置

它长在 `checkArchiveFidelity()` 里,而那个函数**只遍历 `changes/archive/`** ——
等于 RENAMED 格式错误要**归档之后**才被发现,那时静默丢内容已经发生了。
变异测试第 9 例复现:活跃 change 的 RENAMED 格式错,原生静默,check.mjs **也静默**。

改:挪进 `checkSpecFile()`(`isDelta` 门控),活跃件与归档件共用一份实现,还带上了行号。
`parseSpecText` 的 `renamedRaw` 元素从字符串改成 `{ text, line }` —— 两处消费方都只用
`.length`,改元素形状是安全的。

### 缺陷 2:可移植核心里的硬编码项目路径

`--hook` 模式写死着 `packages/server/drizzle/meta/_journal.json`。那是 drizzle 插件的关注点,
却长在与宿主项目无关的通用核心里 —— 换项目时它既不在 `project.json` 也不在 `guards/`,grep 不到。

改:插件契约加可选 `watches: []`,`drizzle-journal.mjs` 自己声明这条路径,
`--hook` 用 `pluginWatches()` 汇总。顺带把三处重复的插件加载代码
(`run` / `inventory` / 新增的 `watches`)收敛成一个 `loadPlugins({ report })` ——
`report` 只对 `run` 开,否则同一个加载失败会在两条独立路径上报两遍。

### 配置收口

- **删 `project.json.workflow`**:无人读,且与 `config.yaml:1` 的 `schema:` 是第二份拷贝,
  没有任何检查看守两者一致。实测删掉后 `openspec new change` 仍正确落到 `devops-workflow`。
- **`commands` 从装饰变成事实源**:`L7/evidence-missing` 原本写死
  `['build.log','test.log','lint.log']`,现在按 `Object.keys(PROJECT.commands)` 推导,
  报错文案也引用真实命令串。实测:往 `commands` 加一条 `typecheck`,
  检查立刻要求第 4 份 `typecheck.log` 并提示跑 `pnpm typecheck`。
  在此之前,「加了命令但没人要求日志」会让硬闸门无声漏掉一项。

### 顺带记下的三个事实(评估过程中量到的)

1. **宪法一次都没跑过。** `rules/enforced/constitution.md` 于 2026-08-14 进版本库,与最后一个归档 change 同日;
   30 个归档件的 `design.md` 里含「宪法对照」表的是 **0 个**。
   `L2c/constitution-check` 与 `TEMPLATE/constitution-rows` 至今零运行记录 ——
   下一个 change 是它们的首次实测。**该盯的是那张表被填成 8 个 ☑ 还是有真实的 ☐/⚠**;
   若首次就是 8 个 ☑,说明它退化成橡皮图章,那时该砍的是 CP 里 review 一眼能看见的条目,不是改表。
2. **棘轮基线从播种至今没降过**(`--inventory` 显示「已清理 0」)。
   它在履行「不许再涨」,但「往 0 走」没有任何机制驱动 —— 别把它当退役计划在推进的证据。
3. **openspec 容忍 `config.yaml` 的自定义顶层键**(实测加 `project:` 段后
   `validate` 53 passed、`instructions`/`status` 正常)。所以 `project.json` 技术上**可以**并进去。
   **没并**:`check.mjs` 是零依赖的,YAML 能力仅限扁平 frontmatter,而 `ratchet.rules`
   是嵌套对象数组 + 正则字符串 —— 为少一个文件换一个依赖或约 150 行自研解析器,不划算;
   且 `config.yaml` 的 schema 归上游 CLI 管,今天容忍未知键不代表明天还容忍。

### 验证

`--all` 基线 **27 error / 11 warn 未变**;`validate --specs` 53 passed;检查数仍 56;
`--write-index` 幂等;`--hook` 用带错的临时 change 做了区分性测试 ——
drizzle journal 路径触发、无关 `App.tsx` 不触发、openspec 路径触发。

---

## 2026-08-15(十) · 10 个 artifact 砍到 8 个,配置文件合成一个

### 触发

「project.json + ratchet.json 两个配置」「schemas 里模板很多」「carry 简单得多」
「openspec 支持 stores 模式」—— 目标是简化 / 复用,降低使用成本。

### 先量化「使用成本」

31 个归档 change 的各 artifact 中位字节:

| artifact | 中位 | artifact | 中位 |
|---|---|---|---|
| interview.md | 10.9 KB | tasks.md | 5.3 KB |
| explore.md | 12.9 KB | exec/plan.md | 11.8 KB |
| artifacts.md | 4.3 KB | exec/integration.md | 6.9 KB |
| proposal.md | 9.2 KB | exec/verify.md | 8.2 KB |
| design.md | 9.2 KB | **合计** | **≈ 77 KB / change** |

最近 6 个 change 全是「弹窗滚动 / 全屏开关」级别的单组件修复,每个仍产出 14 个文件。

### 决定性证据:并行机制被用反了

| 执行单元数 | integration.md | exec/plan.md |
|---|---|---|
| **1 个**(最近 10 个 change) | **6.5–9.0 KB** | 10–13 KB |
| 4 个(align-*-to-biz-ledger 批次) | **2.2–2.5 KB** | 4–8 KB |

**没东西可集成的 change,集成文档反而写得最长。** 那不是信息,是在填模板。
这条数字是本轮全部改动的依据 —— 不是「感觉太重」,是模板在单单元场景下反向膨胀。

顺带印证:`design/README.md` 的待办里早就写着
「`artifacts.md` 台账缺回写触发点 —— 除创建外没有任何阶段要求更新它」,
而 `check.mjs` 里**没有任何一条检查**读 `artifacts.md`。零强制 + 零回写触发点 = 只有创建成本。

### 改动

**流水线 10 → 8 个 artifact**

- 删 `ledger`(`artifacts.md`):证据本来就要在 verify 里逐条核对,单独一份索引是第二次抄写。
- `integration` 并入 `verify`:成为 `exec/verify.md` 的「一、集成记录」节,
  校验部分成为「二、规格一致性」。模板里写死规模自适应 ——
  **1 个执行单元时,Merge 顺序 / 冲突清单 / 重复实现消除 / 被牺牲的方案四节整节删掉**,
  只留「单执行单元,无并行集成」+ 越界汇总(越界与单元数无关,单个单元一样会越界)。
- `verify.requires` 从 `integration` 改回 `exec-plan`。
- 模板 11 → 9 个。

**配置文件 2 → 1 个**

`ratchet.json` 并入 `project.json` 的 `ratchet.rules`。顺带把插件契约改干净了:
`ratchet.mjs` 不再自己 `readFileSync` 配置,改由 `pluginContext()` 传 `project` 进去 ——
配置文件路径现在只有 `check.mjs` 一处知道,插件不再需要知道自己的配置住在哪。

**归档件的兼容**:`L4/gate-checked` 与 `L5/notes-required` 原本拿
`exec/integration.md` 是否存在当「集成阶段已开始」的标记。新增 `integrationMarker(c)`
两者取其一(新 change 认 verify.md,旧归档认 integration.md)——
只认 verify.md 会让 31 个归档件的这两条检查集体失效。

### 关于 stores:实测后否掉

`openspec store` 是「独立的规划仓,跨 repo 共享 specs/changes」。实测 `openspec context`
与 `doctor`:本仓无任何 cross-repo 引用。把 specs 搬进独立仓,CI 的 `validate` 和
`check.mjs` 就看不到它们,git 历史也和代码分家 —— **是加一层间接,不是简化**。

顺带实测到一件有用的事:**把 `openspec/schemas/` 整个移走,
`validate --strict --specs` 依旧 53 passed** —— 原生校验不依赖 schema,
只有 `status` / `instructions` / `new` 依赖。所以 CI 的校验步骤本身是可移植的。

user 级 schema 目录(`~/.config/openspec/schemas/`,解析顺序 project → user → package)
确实存在且能用,但把工作流挪出 git = 同事和 CI 都没有,对团队仓是坏交易,同样否掉。

另确认:openspec 的 artifact 定义里**没有 `optional` 字段**
(zod schema 只有 `id/generates/description/template/instruction/requires`)。
所以「小 change 少写几个 artifact」无法在 schema 层表达 —— 要么所有人都少写,
要么开第二个 schema。选了前者(第二个 schema 会让维护面翻倍,与「复用」目标相反)。

### 实测结果

| | 前 | 后 |
|---|---|---|
| artifact 数 | 10 | **8** |
| 模板数 | 11 | **9** |
| 结构化配置文件 | 2 | **1** |
| 每 change 生成轮次 | 10 | **8** |
| 每 change 散文中位 | ≈ 77 KB | 预计 ≈ 66 KB(减 ledger 4.3 + 单单元集成节压缩) |
| 全 artifact 提示词合计 | 77.3 KB | 73.8 KB |
| 检查数 | 56 | 56(未动) |

`--all` 基线 **27 error / 11 warn 未变**;`validate --specs` 53 passed;
新建 change 的 8 个 artifact 依赖链与 `openspec templates` 解析全部正确。

**提示词只省了 3.5 KB** —— verify 吸收了 integration(6.7 → 12.3 KB),
所以本轮省的不是提示词,是**生成轮次和产出散文**。这一点当时没预估,记下来。

### 问题

`^###\s+Requirement:` 这条正则在 `check.mjs` 里出现过 **6 次**,各自实现一遍解析
(有的剥注释有的不剥,已经出现细微差异);主 spec 语料被 **8 处**独立遍历
(`mainSpecCaps` / `mainSpecReqIds` / `supersededCaps` / `checkMainSpecs` /
`checkCapabilityDuplication` / `buildSpecIndex` / `inventory` / `checkArchiveFidelity`)。
加一条 spec 相关的检查 = 再抄一遍正则。

### 改动

新增 `parseSpecText()` + 按路径缓存的 `loadSpec()`,对 delta spec 与主 spec 通用:

```
{ fm, purpose, lines, requirements: [{ id, name, raw, line, depth, op, scenarios }],
  renamed, renamedRaw, badScenarioBullets, deltaSections }
```

**`depth` 必须留在结构里** —— 层级校验(`requirement-heading-depth` /
`scenario-heading-depth`)靠它,解析时丢掉就没法查了。

改为读这份结构的:`mainSpecReqIds` · `requirementNamesOf`(原 `requirementNames`,
改成按路径以便命中缓存)· `supersededCaps` · `purposeLead` · `buildSpecIndex` ·
`parseDeltaOps`(→ `deltaOpsOf`,变成投影)· `inventory` 的两段自扫 · `checkSpecFile`。

结果:需求解析正则 **6 份 → 1 份**(只剩 RENAMED 的 FROM/TO,那是另一种语法)。

### 怎么保证没改坏

`report()` 按**插入顺序**打印,所以发现顺序必须与原来的逐行扫描一致。
`checkSpecFile` 改成先按行号收集、再统一发出(`Array#sort` 稳定,同一行内保持 push 顺序)。

验证分两层:

1. **专门造了一个把 9 条 L2b 路径全占满的 fixture**(层级错的需求/场景、缺 ID、重复 ID、
   无场景、写成列表项的场景、标题即整句 MUST、闸门型需求、REMOVED 缺 Reason/Migration)——
   17 条 findings **逐字节一致**。现有语料几乎不覆盖这些分支,没有 fixture 就是盲改。
2. 四种模式(默认 / `--all` / `--inventory` / `--explain`)全量输出 **逐字节一致**。

### 效果 —— 与预估不符,如实记录

| | 预估 | 实测 |
|---|---|---|
| `check.mjs` 行数 | −200~300 | **+22**(2467 → 2489) |
| `--all` 耗时 | — | 0.52s → 0.49s |

行数没降的原因:新增的解析器(约 110 行含注释)大于各处省下的量;
`checkSpecFile` 为了保持发现顺序引入了「收集 + 排序」,把省下的又吃回去一部分
(闭包写法最初还多花了 28 行,折叠成普通对象后收回)。

**所以这一项的收益不是行数,是:**
- 加一条 spec 检查不用再抄正则,读字段即可
- 6 份正则的细微差异(剥不剥注释)消失了
- 每个文件只读一次、只解析一次

预估错了就该记下来 —— 下次再提「重构能减多少行」时,这条是反例。

---

## 2026-08-14(八) · 事实与历史分家:历史证据只留在本文件

### 问题

前几轮把**历史证据**写进了**事实文档** —— rules 里写「已修过 4 起」「已挂过 3 条主 spec」,
tasks 规则里写「1249 条任务里 318 条(25%)」,宪法里写「26% 的 change」和一堆
「(2026-08-14 快照)」的现状数字,check.mjs 的注释与错误消息里同样到处是实测数字。

这些数字没人维护。过期之后,读的人会按错误的前提做判断 —— 比过期的索引更糟,
因为它们看起来像论据。而它们真正的用处(「这条规则当初为什么加、依据是什么」)
本来就该在本文件里查。

### 新约定(已写进 `design/README.md`,防止再被填回去)

| 内容 | 归属 |
|---|---|
| **现在必须怎么做**(断言、格式、闸门) | `config.yaml` / `schema.yaml` / `templates/` / `rules/enforced/constitution.md` |
| **机制性理由**(「archive 按标题字符串匹配,所以标题要稳定」) | 同上,一句话带过 |
| **历史证据**(数字、事故、标定结果) | **只在本文件** |

判定线是**机制 vs 历史**,不是「有没有理由」:
「原生 `--strict` 只认正文里的 MUST」是机制,留;「已因此挂过 3 条主 spec」是历史,删。

### 改了什么

- **`config.yaml` rules**:剥掉 572 字历史证据(6,406 字),机制性理由全部保留
- **`rules/enforced/constitution.md`**:181 → 147 行。删掉全部 8 处「**现状**(YYYY-MM-DD 快照)」段落,
  头部的存在动机压缩成「怎么用 / 怎么改」;新增一句硬约定:
  **本文不写现状数字** —— 存量看 `--inventory`,代码现状 grep 一下就有。
  「修订记录」表也删了,改为指向本文件(一份改动记两处必然漂)
- **`check.mjs`**:16 处注释与错误消息去掉实测数字,保留机制说明。
  `capability-duplication` 的阈值注释改为「改阈值前先重跑标定(方法与历次结果见 CHANGELOG)」——
  警告留在代码旁,数据留在这里
- **`templates/design.md`**:宪法对照表的引言不再复述 26% 那个数字

### 为什么这轮的历史证据仍然留在本文件里

上面被删掉的每一个数字,在本文件对应日期的条目里都能查到 ——
包括 245 条需求 / 26335 个跨能力对的相似度标定、318/1249 的空任务占比、
78/105 的构造性误报、4 起归档漂移的具体形态。**删的是位置,不是记录。**

---

## 2026-08-14(七) · 简化与复用:删 1 条、合 14 条、三处注入点去重

前几轮一直在**加**(check.mjs 1314 → 2527 行,检查 40 → 70),这一轮只做减法与归并。
**三项都不降低检测能力** —— `--all` 前后都是 27 error / 11 warn,一条不差。

### 一、删掉 `L2a/capability-novelty`

它要求作者在 Capabilities 表自述「既有能力调研」,本质是**让被检查方写检查报告**。
效果有据可查:52 个能力 / 31 个 change,其中三个同时约束一个 `ProjectCreateModal.tsx`
且互相矛盾,而这条检查全程绿灯。

现已被两样更强的取代,所以删而不是留:
`L2a/capability-duplication`(机器逐条比对,不问作者)+ `specs/README.md`(一页看全全部能力)。
proposal 模板的「既有能力调研」列一并去掉,改为「填表前先读能力索引」。

### 二、检查 ID 合并:70 → 56

**保护你的是检测,不是 id 的粒度** —— 一个 id 完全可以发出不同的错误消息。

| 合并前 | 合并后 |
|---|---|
| `L0/interview-section` + `ambiguity-cleared` | `L0/ambiguity` |
| `L2b/removed-needs-reason` + `-migration` | `L2b/removed-incomplete` |
| `L3/design-approved` + `approved-at-format` | `L3/design-approved` |
| `L7/evidence-exists` + `-nonempty` | `L7/evidence-missing` |
| `TEMPLATE/slot-{empty,nested,unclosed,mismatch,unmatched}` | `TEMPLATE/slot-malformed` |
| `REPO/check-{missing,load,contract,threw}` + `ratchet-parse` | `REPO/plugin-error` |
| `REPO/ratchet-{unseeded,stale}` | `REPO/ratchet-baseline` |

CHECK_DOC 93 → 72 行。**踩到一个坑**:合并后对象字面量出现重复键,JS 会静默保留最后一个 ——
`--explain` 数字对了但说明是错的。逐组重写了合并后的说明才修好。

### 三、三处注入点去重 —— 定死分工

CLI 把 `config.yaml` 的 rules、`schema.yaml` 的 instruction、`templates/` **一起**拼进同一个
提示词,于是同一条规则 agent 要读三遍。实测每个概念的出现次数:

| 规则 | config | schema | templates |
|---|---|---|---|
| FR-NNN 稳定 ID | 2 | 1 | 7 |
| 标题名词短语 | 1 | 1 | 5 |
| 判据行 | 2 | 1 | 7 |
| 必填表 | 4 | 1 | 5 |

**分工从此定死**(改规则只改一处,不会再漂):

| 注入点 | 只放 | 不放 |
|---|---|---|
| `templates/` | 骨架与格式(填空位、表头、示例行) | 为什么、判定口径 |
| `config.yaml` `rules` | **判定口径 + 为什么 + 检查 id**(唯一事实源) | 骨架 |
| `schema.yaml` `instruction` | 本层职责与 Gate | 格式细节、逐条规则 |

另外两处只留一行「见 `<rules>`」——**这不是「跨文件指针」那种失效模式**,因为三者本来就在
同一个提示词里同时在场,已在模板里写明这一点,防止后人再把它抄回去。

顺带清掉 `rules.specs` 内部的 5 处自我重复(14 → 9 条),并修掉 W1 遗留的陈述
(`rules.tasks` 还写着已删除的「设计与文档」分组)。

### 效果(实测,不是估算)

| | 前 | 后 |
|---|---|---|
| 检查数 | 70 | **56** |
| CHECK_DOC | 93 行 | **72 行** |
| `templates/spec.md` | 7,417 字节 | **3,671**(−50%) |
| `templates/tasks.md` | 4,069 字节 | **3,492** |
| `schema.yaml` | 18,506 字节 | **17,778** |
| `config.yaml` | 14,418 字节 | 14,861(**+443**,它成了唯一事实源) |
| 注入文本合计 | — | **−4,769 字节(约 −13%)** |

**要如实说的**:`check.mjs` 只减了 44 行(2527 → 2483)。代码体积的大头在**没做**的第四项
(6 处重复的 spec 解析合并成一个 `parseSpec()`,预计 −200~300 行)——
本轮的收益是「少 14 个 id 要记」和「每条规则只有一个家」,不是行数。

---

## 2026-08-14(六) · W2:能力索引(生成物 + 机检,不可能漂)

### 动机

carry 有 `specs/README.md` 索引表(能力 / 覆盖能力 / 状态);本仓库 **53 个主 spec 没有任何索引**。
「要改的行为是不是已经有能力在管」这个问题,此前只能 `ls openspec/specs/` 再逐个打开 ——
而它恰恰是 `L2a/capability-novelty`(新建能力前必须调研既有能力)每次都要回答的问题。

### 关键设计:生成 + 机检,而不是「生成完就放着」

本仓库已经栽过两次同类问题:`README.md` 写「42 项检查」时实际是 47 项;宪法与 design 模板
两份 CP 清单各自漂移。**手工维护的索引必然过期,而过期的索引比没有索引更糟 ——
它让人以为自己看过全貌了。**

所以规矩是两条命令同源:

| | |
|---|---|
| `node openspec/check.mjs --write-index` | 生成 `openspec/specs/README.md`(check.mjs **唯一会写文件**的模式) |
| `L10/spec-index` | 日常检查里重新生成一遍在内存里比对,不一致直接报错 |

两者调用同一个 `buildSpecIndex()`,**结构上不可能漂**。手改索引同样会被判过期(已实测)。

### 什么时候更新 —— L10 归档之后

索引的内容只取决于主 spec 的集合与它们的 frontmatter,而主 spec 只在 **L10 archive** 变动
(新建能力落库、delta 合并、`status` 改成 `superseded`)。所以更新点唯一:

**`openspec archive` 之后 → 补 `status` → `--write-index` → `pnpm openspec:check`**

已写进三处:`devops-ff-workflow` 的 Phase 8 第 4 步、`config.yaml` 的 `rules.specs`
(同时要求写 spec 前先读索引)、`design/README.md` 的命令表。
忘了跑不会静默 —— CI 的 `L10/spec-index` 会红。

### 产物

```
53 个能力 / 251 条需求 —— active 50 · partial 0 · superseded 3
| 能力 | 需求 | 状态 | 一句话职责 |
```

按 `active → partial → superseded` 排序,superseded 行直接显示 `→ 接管它的能力`。
「一句话职责」取 Purpose 首句(跳过退役横幅),超 60 字截断。

---

## 2026-08-14(五) · W1:tasks 模板从「预填清单」改成「按需骨架」

### 动机(对标 `kr-judanyun/carry` 后的第一项落地)

carry 的 openspec 是**同名不同物**:没有原生 CLI,4 件套 + 151 行 Python 校验,
**580 行/change**;本仓库 **1,493 行/change**,2.6 倍。逐产物拆开后,74% 的差距来自
carry 完全没有的两块(exec 层 412 行、interview+explore 263 行)—— 那两块是本仓库的
真实需要(29/31 change 命中共享层),动不得。

剩下 26% 是**密度差**,而密度差里最大的一块可以安全去掉:

> `fix-travel-modal-scroll` 改了 **2 行代码**(两个 `overflow: 'auto'`),
> 产出 **39 条任务,其中 32 条是「无变更」**。
> 全仓 **1249 条任务里 318 条(25%)** 是这类空条目。

二次成本:`L4/task-mapped` 要求每条任务在 `exec/plan.md` 都有归宿 —— 32 条空任务要配 32 行映射。

### 为什么删掉不降低覆盖

漏项防线在 `proposal.md` 的**「共享层影响」与「横切关注点」两张表** ——
它们逐项勾选、勾 ☐(不涉及)也必须写判断依据,由 `L2/required-table` 强制。
tasks 的预填子项是**重复的第二道防线**,删的是重复,不是覆盖。

**唯一例外**:前端组没有对应的 proposal 表,所以它的候选项(页面/路由、数据请求 hook、
复用组件、权限控制、空态与错误态)保留在模板的引用块里。

### 改动

**1. 模板:39 个预填任务 → 9 个占位**

分组保留(顺序仍暗示 L4 分层),每组只给一行占位示例 + 一句「本组不涉及就**整组删掉**」。

**2. 删除整个「设计与文档」组**

原 1.1~1.4 四条全部已由机器管,写成任务只是让 L4 多映射几条:

| 原任务 | 真正管它的 |
|---|---|
| 未决歧义已清零 | `L0/ambiguity-cleared` |
| explore 已完成 | artifact 状态机的 `requires` |
| 补齐 proposal / design / specs | artifact 状态机的 `generates` |
| 人类审阅 design 通过 | `L3/design-approved`(读 frontmatter) |

「准备」组同理砍到 2 条(只留机器管不了的:分支/负责人/发布窗口、测试账号/租户/权限点)。
分组因此重编号:准备 → 共享契约层 → 数据层 → 后端 → 前端 → 测试 → 发布 → 上线后。

**3. 新增 `L2d/empty-task`(warn)**

模板写了但不校验的规则活不过三个 change。同时拦两类:「无变更/无需/不涉及」空条目、
把流水线闸门写成任务。只对活跃 change 报(归档件有 318 条,不回溯适用)。

### 一个踩到的坑

判空正则最初写成 `/(无变更|…)\s*$/`,结果**最常见的写法 `类型定义:**无变更**` 反而不匹配** ——
结尾是 `**` 导致 `$` 锚点失效。加了 `plainTask()` 先剥掉 markdown 强调与反引号才修好。
三种写法(`**无变更**`、`` `无变更` ``、`**不涉及**`)现已全部实测命中。

### 预期效果

小改动的 tasks.md 从 ~39 条降到 ~7 条(准备 2 + 前端 n + 测试/发布/上线后各 1),
其余分组整组删除。**不影响任何一条既有质量检查。**

---

## 2026-08-14(四) · 清欠:修构造性误报、合并互相矛盾的能力、把空转的机制用起来

### A1 · `L7/evidence-fresh` 对归档件是构造性误报

这条比的是「证据日志 vs `packages/` 的**最新** commit」。一个 change 归档之后,
任何后续代码提交都会让它的日志变「陈旧」—— 于是 **100% 的归档件必然报错,且只会越攒越多**。
实测 `--all` 的 105 个 error 里 **78 个**是这么来的,把 `--all` 变成了不可用的噪音源。

「证据能否证明当前代码能跑」对已结案的 change 本就不成立:那些日志是历史记录,**应该**是旧的。
新鲜度改为归档件跳过(存在性/非空仍查)。**`--all` 105 → 27**,剩下的全是真实历史债。

### A2 + B1 · 三个 ProjectCreateModal 能力合并,并首次用上 `superseded`

`project-create-as-modal` 的 FR-003 与线上实现**三处全反**(已逐条比对代码):

| FR-003 断言 | `ProjectCreateModal.tsx` 实际 |
|---|---|
| `mode='default'` | `useState<AppModalMode>('fullscreen')` |
| `width={1080}` | **没有 width**(grep 无匹配) |
| 自定义 `footer` 块 3 个按钮 | `headerLeft={<Space>…}` |

它被后续两个 change 推翻,却新开能力而没走 MODIFIED / REMOVED —— 于是一条早已失效的 MUST
在主 spec 里继续生效。这正是第一轮评估预测的失效模式的实例。

处理:新建 `biz-project-create-modal` 接管(6 条需求,按**新模板风格**写 —— 名词短语标题 +
正文 MUST + 10 行判据,是全仓第一份新写法 spec),三个旧能力标 `status: superseded` +
`superseded_by`,正文加显式退役横幅。

**没有把 `project-create-as-modal` 整个当废纸**:它另外 5 条(改为 Modal 触发、维护 members/costs、
提交后刷新列表)仍然成立,已并入新能力。FR-003 原文保留在退役件里,记录演进过程。

A/B 实测确认 `superseded` 不进 `capability-duplication` 的比对基线:
标 superseded 时新能力复用其需求文本不报重复,改回 `active` 立刻报。

### B2 · CP-2 要求的「退役计划」此前不存在

宪法写着「留第二套协议必须同期给出旧协议的退役计划」,而 AppModal 三套协议至今没有计划 ——
**宪法在要求一件没人做的事**。

补上了,依据是实测出来的耦合结构:**17 个 biz 页面各 2 处全部由 `BizLedgerDetailFrame` 带出来**,
改枢纽比逐页改省 17 倍。故分三阶段:① 枢纽 + 17 页(41 处,67%)② 预览类组件(14 处,可并行)
③ 零散 6 处 + 删 shim。计划落在 `ratchet.json` 的 `plan` 字段,`target: 0`。

### B3 · 「判据」从模板口号变成检查

新增 `L2b/scenario-needs-criterion`(warn,只对 delta)。
**模板写了但不校验的规则活不过三个 change** —— 判据此前只是模板里的一句话。

### B4 · `--inventory` 存量盘点

新增 `node openspec/check.mjs --inventory`,一次看清日常检查**刻意不报**的债:

```
需求标题写法    189 / 229 条是老写法(43 个能力)
场景判据        627 / 637 个场景没有判据行
能力状态        53 个能力,3 个已 superseded
存量棘轮        当前 61 · 目标 0 · 还差 61 + 分阶段计划
```

为什么要单独一个入口:这几类存量天天报就是天天被忽略,忽略久了检查本身也会被关掉;
但「不报」不等于「不存在」—— 缺一个能一次看清欠了多少的地方,债就永远是隐形的。

---

## 2026-08-14(三) · 对标 carry 项目:模板消灭 MUST 写法问题 + 校验自解释

### 动机

对比 `kr-judanyun/carry` 的 openspec 实现(**同名不同物**:那边没用原生
`@fission-ai/openspec` CLI,是纯 markdown 约定 + 151 行 Python 校验)后确认两件事。

### 一、模板改造:标题不再当陈述句用

**根因量化:245 条需求里 204 条(83%)的标题本身就是一整句 MUST 陈述。** 三个已付过的代价:

1. 原生 `validate --strict` 要求 MUST/SHALL 出现在**正文**,「标题即陈述句」让人以为写过了 —— 已挂过 3 条主 spec;
2. `openspec archive` 的 MODIFIED 按**标题字符串**精确匹配,长句标题改个措辞就断链 —— 已修过 4 起;
3. `L2a/capability-duplication` 比对的是标题,整句会让同族实体互刷高分。

carry 的 32 个 spec 文件里 MUST 出现 **0 次** —— 它把规范性交给结构(Given/When/Then)承载,不靠关键词。

改法:标题降为**名词短语**,规范陈述移到正文首行固定句式 `<主体> **MUST** <行为>。`,
场景增补一行 **判据**(抄 carry,写可观测的判定方式)。
存量 204 条不强改,`L2b/requirement-title-shape`(**warn**,只对活跃 change 的 delta 报)让它可见但不挡路。

### 二、通用必填表:3 张表 → 1 条检查

`L2a/shared-impact-filled`、`L2a/crosscut-filled`、`L2c/constitution-check` 的填写校验判定逻辑
一模一样(标记列要有勾、说明列不能空),收敛成 `L2/required-table`,**由模板里的标注驱动**:

```md
<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
```

价值不在少了两条,在**以后加表零成本**(已实测:给模板第 4 张表加标注,零代码改动即被覆盖)。

### 三、一个被实测推翻的计划

原计划「删 3 条与原生 CLI 重复的检查」。实测后只删了 2 条,因为前提错了:

| 用例 | 原生 `--strict` | check.mjs |
|---|---|---|
| 整个文件没有需求 / 缺 delta 标题 | ✗ 报错 | 重复 → **已删** |
| **合法场景 + 混一个 3 井号场景** | **0 error(静默丢)** | ✗ 捕获 → **必须留** |
| **合法需求 + 混一个 5 井号需求** | **0 error(静默丢)** | ✗ 捕获 → **必须留** |

**原生只在「整个文件解析不出任何东西」时报错,对混合情形完全静默** —— 那正是
`requirement-heading-depth` / `scenario-heading-depth` 存在的全部理由。
差点把唯一拦得住最隐蔽失败模式的两条删掉。

也因此没有做原计划的「降级 6 条」:按「会不会静默出错」这条判据逐条过,找不到 6 条够格的,
硬凑数字只会削弱真实防线。

### 四、真正的复杂度解法:`--explain`

「校验太复杂」的痛点不是条数,是**看不出每条在防什么** —— 说不清用途的检查,下次挡路时就会被删掉。

新增 `node openspec/check.mjs --explain`,按层打印每条检查守护的失效模式;
`META/check-undocumented` 兜底:加检查忘写说明直接报错,删检查后说明还留着会 warn。
**清单从此不会漂**(此前 README 写「42 项」时实际是 47 项)。

### 五、spec status(抄 carry,取值按本仓库问题定)

carry 用 `delivered / delivered-partial / blocked-external` 表达**交付到什么程度**;
本仓库要表达的是**还 normative 不 normative**,所以取 `active / partial / superseded`。

此前主 spec 是个一元世界:只要在 `openspec/specs/` 里就永远以 MUST 生效。
于是被后续实现推翻的能力仍在约束线上代码,而唯一记录是 `project.json` 注释里的一句话 ——
**退役一个能力没有落脚点**,只能往豁免清单里再加一条。
现在 `superseded` 必须写 `superseded_by`,且已退役能力不再进 `capability-duplication` 的比对基线。

52 份主 spec 已回填 `status: "active"`。⚠️ `openspec archive` 不会写这个字段,
归档后要手动补(`L10/spec-status` 会拦,ff-workflow skill 的 Phase 8 已加提示)。

### 六、宪法速查表

`rules/enforced/constitution.md` 顶部加「一句话约束」速查表(抄 carry 的 `decisions/README.md`)——
填「宪法对照」时先扫这张,需要理由再翻正文。

---

## 2026-08-14(二) · 让宪法可执行:存量棘轮 + 占位符检查 + 主 spec 进 CI

### 动机

上一条落地了宪法,但第二轮自查发现三个洞,都是「看起来有约束、实际没有」:

1. **`L2c/constitution-check` 只验「答了」,不验「答得对」。** 它能保证 CP-3 那一行非空,
   保证不了填 ☑ 的人真的没用旧协议。同时宪法里写了一堆裸数字(「103 个调用方里 27 个用 mode」),
   没有任何机制维护 —— 数字一过期,宪法就开始撒谎。
2. **40 份主 spec 的 Purpose 还是 `TBD - created by archiving`**(占 52 个的 77%)。
   规则早写在 config.yaml 里,但没有任何机器拦得住。
3. **CI 从不校验主 spec。** workflow 只跑 `validate --changes`。实测 `--specs`:49 passed / 3 failed,
   其中 `biz-contract-list` 的主 spec 干脆是 delta 文件的副本(带 `## ADDED Requirements`、
   无 `## Purpose`)—— 归档合并漏做了转换,而主 spec 才是这套流程的最终产物。

### 改动

**1. 存量棘轮 `openspec/guards/ratchet.mjs` + `openspec/ratchet.json`**

把「MUST NOT 新增 X」这类条款变成可执行约束:存量数冻成基线,**只准降不准升**。
首条规则 `appmodal-legacy-props` 盯 CP-2 / CP-3,基线 61(播种时实测)。

- 实测 > 基线 → error(新增了旧协议调用点,正是要拦的)
- 实测 < 基线 → error 并给出该改成的数字(清理成果必须锁进基线,否则基线停在最高水位,
  等于给「以后再加回去」留额度)

**宪法里的数字改为只引用基线,不复述**;其余数字一律标注「(YYYY-MM-DD 快照)」。
往宪法里写没人维护的裸数字,比不写更糟。

⚠️ **配套改了 CI 触发路径**:workflow 原本只在 `openspec/**` 变更时触发,
而棘轮数的是 `packages/` 里的源码 —— 不加 `packages/**`,「改前端代码时新增旧协议调用点」
就完全绕过了检查。这是加棘轮时最容易漏的一步。

**2. `L2/placeholder`(对应 Spec Kit `/analyze` 的 Ambiguity Detection)**

主 spec / delta spec / proposal / design 里残留 TBD、TODO、FIXME、`<placeholder>`、`???` 一律判错。
只认无歧义的 ASCII 标记 —— 中文「待补」「待定」不判,因为
「已知缺口:contract 侧尚未实现,留待后续 change 补齐」是**合法的缺口声明**,判它会误伤。

同时**清掉了全部 40 份 TBD Purpose**:逐个按其需求内容重写,legacy 能力(8 个事件名产物)
如实标注「本能力名是 change 事件名的历史产物,应并入 X」,不粉饰。

**3. 主 spec 进 CI + 修掉 3 个失败**

- workflow 新增 `validate --strict --specs`
- `biz-contract-list`:delta 副本 → 补 `## Purpose`,`## ADDED Requirements` 改回 `## Requirements`
- `biz-ledger-modal-toolbar` / `invoice-form-table`:MUST 只在标题里、正文没有 → 正文补 MUST

结果:主 spec 从 **49 passed / 3 failed** 变成 **52 / 0**。

### 一个复盘

改完发现,新写的 4 份 Purpose 因为不足 50 字符又被 `--strict` 判失败(原生有下限)。
**这恰恰说明第 3 条的价值**:如果不是把 `--specs` 加进 CI,这 4 个新洞会和之前那 3 个一样,
静静躺在主 spec 里没人知道 —— 而它们是我自己在同一个会话里刚制造出来的。

---

## 2026-08-14 · 补治理层:工程宪法 + 需求稳定 ID + 两项语义检查

### 动机

对照 GitHub Spec Kit(`/speckit.constitution` → `specify` → `clarify` → `plan` → `tasks`
→ `analyze` → `implement`)评估本流水线后,暴露出三处结构性缺口。三处都不是纪律问题,
是缺一层的必然后果 —— 证据都来自本仓库自己的 31 个归档 change:

1. **没有 constitution 层**:31 个 change 里 8 个(26%)是 AppModal 的 fullscreen/scroll/
   header 之争,每个都在自己的 design.md 里重新推导一遍「AppModal 该怎么用」。
   结果:`AppModal.tsx` 并存三套 prop 协议;三个能力同时以 MUST 约束同一个
   `ProjectCreateModal.tsx` 且互相矛盾,而全部校验绿。
2. **check.mjs 全是结构检查,没有语义检查**:`L2a/capability-novelty` 要求 agent
   自述「查过哪些既有能力」—— 让被检查方写检查报告。实际结果是 52 个能力 / 31 个 change,
   40 个主 spec 的 Purpose 还是 `TBD - created by archiving`。
3. **需求没有稳定 ID**:`AC-n → Requirement → Scenario → task X.Y` 这条链中间两段靠
   标题字符串串联,而 `openspec archive` 的 MODIFIED 匹配同样按字符串走 ——
   「顺手改个措辞」会静默地把一条需求变成另一条(已修过 4 起,见 project.json 的注释)。

### 改动

**1. 新增 `openspec/rules/enforced/constitution.md`(CP-1 ~ CP-8)**

跨 change 不变的项目级原则,每条含断言 / 为什么 / **现状**(现状必须是核实过的数字,
不是愿望)。design.md 新增「## 宪法对照」表逐条回答,标记三选一:
☑ 符合 / ☐ 不涉及 / ⚠ 偏离,三者都要写说明,⚠ 还要写清代价。

注入方式是个受控例外(详见 `pipeline.md`「提示词来自哪」):
原则**标题**住在 design 模板(自动注入)、**校验**住在 check.mjs、**正文与为什么**住在
constitution.md。两份 CP 清单由 `TEMPLATE/constitution-rows` 防漂移。

**2. 需求稳定 ID `[FR-NNN]`**

`### Requirement: [FR-003] <名称>`,能力内唯一、只增不复用。已回填 52 个主 spec 共 245 条。
归档件**不回填**(不可变审计记录),跨代比对一律先 `stripReqId` 归一化 ——
`L10/archive-fidelity` 因此不受影响。

**3. 新增 7 项检查**

| 检查 | 守护什么 |
|---|---|
| `L2b/requirement-id-format` / `-unique` | 需求缺 ID 或能力内撞号 |
| `L2b/requirement-id-collision` | ADDED 复用已占用的号 |
| `L2b/requirement-id-unknown` | MODIFIED/REMOVED 指向主 spec 没有的号 —— 把 `openspec archive` 的 not found 拒绝提前到写 delta 的当下 |
| `L2a/capability-duplication` | 新能力的需求与既有能力逐字重复 |
| `L2c/constitution-check` | design 没有逐条回答宪法 |
| `L8/requirement-coverage` | delta 里有需求但 tasks 里没人实现它 |
| `TEMPLATE/constitution-rows` | 宪法与 design 模板的 CP 清单漂移 |

### 一个必须记下来的标定结论

`L2a/capability-duplication` 的阈值是在本仓库 245 条需求(26335 个跨能力对)上**实测**
标定的,不是拍的:

> **相似度 0.85~0.96 这一整段全是同族误报。** `leave 列表 MUST 改用 BizLedgerStatusBadge`
> 与 `travel 列表 MUST 改用 BizLedgerStatusBadge` 得分 0.96,但它们是两个实体的合法平行需求。
> 真重复几乎都落在 1.00(逐字相同)。

因此判据是**两段式**的:非同族 ≥0.90 判错,同族(能力名共享 ≥2 段后缀,如 `*-form-table`)
只在 ≥0.99 时判错。标定结果:49 对 error 只对应 6 条真实重复文本,同族误报 0。

若不做这个区分,第 14 个台账实体一建就会报错 —— 而那正是本仓库最高频的例行工作
(13 个 `align-*-to-biz-ledger-spec`)。**一条会误报的检查很快就会被关掉,那等于没有这条检查。**
改阈值前先重跑标定。

---

## 2026-08-12 · 规范内容下沉,ai-specs 降级为纯说明文档

### 动机

`readme/` 原本同时承担两个角色:**规范正文**(agent 必须遵守)和**设计说明**(讲为什么)。
但 OpenSpec CLI 只把三处内容拼进 agent 的提示词 —— `config.yaml` 的 `context`/`rules`、
`schema.yaml` 的 `instruction`、`templates/` 的模板。**`readme/` 从不被自动加载。**

于是「规范」实际是靠 18 处「详见 `openspec/design/xxx.md`」的文字指针维系的:
agent 有没有真的去 Read 那个文件,无法观测也无法保证。规则写得再硬,命中率都是未知数。

### 改动

**规范内容下沉到会被自动注入的位置:**

| 内容 | 原处 | 现处 |
|---|---|---|
| 共享层识别三张表(桶文件/跨包契约/序号型资源) | `02-handoff-contract.md` 规则 2 | `templates/explore.md` 的「共享层命中」三张表 —— **填表即比对** |
| L4 交接检查清单(10 项) | `02-handoff-contract.md` 末尾 | `templates/exec-plan.md` 的 `## Gate`(原为 5 项且不对应) |
| worktree 判据表(7 行) | `05-worktree-tradeoffs.md` | `templates/exec-plan.md` 第 5 节,前置于 worktree 分配表 |
| 收尾笔记骨架 | `03-notes-format.md` | **新增** `templates/exec-note.md` |
| 8 条交接规则的判定口径 | `02-handoff-contract.md` | `schema.yaml` 各层 instruction |
| 依赖判定 4 类 / 越界申报 2 分类 | `02-handoff-contract.md` 规则 3、7 | `schema.yaml` exec-plan / integration instruction |

**指针清除:** `schema.yaml` 5 处、`config.yaml` 4 处、`templates/` 6 处全部改为自包含表述;
`check.mjs` 3 处报错文案改为指向本目录 README(说明性引用,非依赖)。

**文件重命名(去掉序号,序号会暗示它们是流程的一部分):**

| 旧路径 | 新路径 | 说明 |
|---|---|---|
| `01-pipeline.md` | `pipeline.md` | 流水线设计说明;操作命令让给 README |
| `02-handoff-contract.md` | `why-handoff-rules.md`(2026-08-28 并入 `why.md` 第一节) | 删去已下沉的规范段,只留 8 条规则的「为什么」 |
| `03-notes-format.md` | `why-exec-notes.md`(2026-08-28 并入 `why.md` 第二节) | 骨架搬走,只留「为什么必须写」 |
| `04-sample-customer-basic-info-table-layout.md` | `sample-customer-basic-info-table-layout.md` | 内容未变 |
| `05-worktree-tradeoffs.md` | `why-worktree-tradeoffs.md`(2026-08-28 并入 `why.md` 第三节) | 判据表搬走,保留实测证据(APFS CoW、现场快照) |

> ⚠️ **历史 change 文档(`changes/` 与 `changes/archive/`)里引用的是旧路径,现已失效。**
> 这些是审计记录,按「归档不可变」原则**不做修改** —— 需要查内容时对照上表。

### 结果

`openspec/design/` 现在只承载三类内容:**使用说明(README)/ 流程定义与设计说明(pipeline + why-*)/ 修改记录(本文)**。
整个目录删掉,流水线仍能正常运行 —— 这是本次改动的验收标准。

### 副作用

模板全文注入,所以提示词变长了:`explore` 约 +30%(三张表),`exec-plan` 约 +12%(Gate + 判据表),
其余 artifact 基本不变。这个代价换掉的是「靠 agent 主动去读一个不在上下文里的文件」这种不可观测的依赖。

---

## 2026-08-11 · 引入机械校验与三层强制力

### 动机

状态机只强制两件事:`requires` 依赖顺序,以及 `generates` 路径能否匹配到文件。
**内容对不对,它一概不看。** 于是「`#### Scenario` 写成 3 个 `#` 会被静默忽略」
「tasks 条目静默丢弃」「拿旧日志冒充 L7 证据」这类问题全流程无人拦截。

### 改动

- **新增 `openspec/check.mjs`** —— 38 项机械校验,覆盖 L0~L8 + 仓库级 drizzle journal 单调性。零依赖。
- **启用 `config.yaml` 的 `rules:`** —— 此前完全未使用。实测确认 CLI 1.6.0 读取它并渲染成
  `<rules>` 块;不支持 `*` / `all` 全局键,须逐 artifact 写。
- **三层强制力**:提示(instruction + rules)→ 即时反馈(Claude Code PostToolUse 钩子,不阻断)
  → 硬拦截(`.githooks/pre-commit` + `.github/workflows/openspec-check.yml`)。
- **模板补齐**:`proposal.md` 补 `## Capabilities`;`exec-plan.md` 映射表示例改为编号形式;
  `interview.md` 未决歧义默认值改为 `- 无`、验收标准加 `AC-N` 编号;`spec.md` 从 8 行扩为完整 delta 骨架。

### 踩到的坑

- **npm 上的 `openspec` 是无关的 0.0.0 占位包**,真实 CLI 是 `@fission-ai/openspec`。
- `.gitignore` 的 `*.log` 会连带吞掉 `exec/evidence/*.log`,导致 L7 审计证据从未进入版本库。
- `config.yaml` 的 `rules` 值含 `: `(冒号空格)或 ` #` 时会破坏 YAML 纯量,必须加引号。

## 2026-08-28 · `ai-specs/` 拆成 `readme/` + `state/`,三份 `why-*` 合并为 `why.md`

**目录按「时态」重新划分**,`openspec/` 下形成三个平行目录:

| 目录 | 时态 | 回答 |
|---|---|---|
| `rules/` | 现在必须 | 我该遵守什么 |
| `readme/` | 过去为什么 | 这套流水线为什么长这样 |
| `state/` | 现状 + 将来 | 现在实际什么样,还欠着什么 |

`ai-specs/` 就此移除。迁移明细:

| 原路径 | 新路径 | 说明 |
|---|---|---|
| `ai-specs/{README,pipeline,CHANGELOG,sample-*}.md` | `readme/` 同名 | 说明性文档,原样迁入 |
| `ai-specs/why-handoff-rules.md` | `design/why.md` 第一节 | 见下 |
| `ai-specs/why-exec-notes.md` | `design/why.md` 第二节 | 见下 |
| `ai-specs/why-worktree-tradeoffs.md` | `design/why.md` 第三节 | 见下 |
| `ai-specs/WAITLIST.md` | `state/waitlist-tech.md` | 改名求对称:原名隐含「技术」但看不出,并列时易误认为总表 |
| `ai-specs/WAITLIST.business.md` | `state/waitlist-business.md` | 同上 |
| `ai-specs/pages/biz_projects.md` | `reality/pages/biz_projects.md` | 页面现状说明,属「现实」不属「心路历程」 |
| `ai-specs/project-specs.md` | `rules/components.md` | **它其实是公共组件清单**(「开发时先查再造」),属「必须先查」而非说明性 —— 原名把它藏住了 |

**三份 `why-*` 为什么合并**:它们本就是一条推理的三段 —— `why-worktree-tradeoffs` 开篇即
「配套 `why-handoff-rules` 的规则 6」,而 `why-handoff-rules` 的末节「附:为什么收尾笔记是硬要求」
与 `why-exec-notes` 全文是**同一论证的两份副本**。拆成三份让读者在同一条推理里跳来跳去,
且那处重复没有任何机制看守。合并后统一 preamble、去重一次说清,原三处交叉引用改为本文内锚点。

**连带**:`state/` 建立了「问题不修必须登记」的约定,并把它写进**会被自动注入**的两处 ——
`config.yaml` 的 `rules.verify` 与 `templates/exec-verify.md` 的「遗留问题」节。
理由:判为「越界扩大、本次不修」的问题只写在 `exec/verify.md` 里,会随 change 归档进
`changes/archive/` 而再也没人翻得到。

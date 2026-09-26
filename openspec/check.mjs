#!/usr/bin/env node
/**
 * openspec/check.mjs —— OpenSpec 流水线的机械校验
 *
 * 背景:devops-workflow 的状态机(schema.yaml)只强制两件事——`requires` 依赖顺序,
 * 以及 `generates` 路径能否匹配到文件。**内容对不对,它一概不看。**
 * 本脚本补的就是这一段:把原本写在 instruction 里、只能靠 agent 自觉遵守的判定口径,
 * 变成会返回非零退出码的检查。
 *
 * 用法:
 *   node openspec/check.mjs                  # 校验 changes/ 下的活跃 change(不含 archive)
 *   node openspec/check.mjs --change <id>    # 只校验某一个 change
 *   node openspec/check.mjs --all            # 连 archive 一起校验
 *   node openspec/check.mjs --json           # 机器可读输出
 *
 * 退出码:0 = 无 error;1 = 存在 error。warn 不影响退出码。
 *
 * 每条检查都标了它守护的流水线层级(L0~L8)。层级含义见 openspec/design/README.md。
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OPENSPEC_DIR = join(ROOT, 'openspec')
const CHANGES_DIR = join(OPENSPEC_DIR, 'changes')
const SPECS_DIR = join(OPENSPEC_DIR, 'specs')

/**
 * 项目事实中【必须被程序读取】的部分,来自 openspec/project.json。
 * 其余项目事实(共享层清单、worktree 判据、横切关注点…)以自由文本住在
 * templates/ 的 `openspec:slot` 槽里 —— 那些只有 agent 读,不需要结构化。
 *
 * 缺失时用保守默认值:不猜源码路径,只跑与宿主项目无关的通用检查。
 */
const PROJECT = (() => {
  const p = join(OPENSPEC_DIR, 'project.json')
  const fallback = { commands: {}, sourcePaths: [], checks: [], capabilities: {} }
  if (!existsSync(p)) return fallback
  try {
    return { ...fallback, ...JSON.parse(readFileSync(p, 'utf8')) }
  } catch (e) {
    console.error(`openspec/project.json 解析失败:${e.message}`)
    process.exit(2)
  }
})()

/**
 * 「用 change 事件名当能力名」的历史豁免清单(见 project.json)。
 * 能力是持久的领域名词,change 是一次性事件 —— 两者同名意味着每做一次改动就新增一个能力,
 * 既有能力永远不会被修订或退役,于是同一份实现会被多个互相矛盾的主 spec 同时约束。
 */
const LEGACY_CHANGE_NAMED = new Set(PROJECT.capabilities?.legacyChangeNamed ?? [])

/**
 * L10/archive-fidelity 的历史豁免:归档合并已经漂掉、且主 spec 已发布的能力。
 * 与 legacyChangeNamed 同理 —— 只豁免,不放宽规则,清完一条删一条。
 */
const KNOWN_ARCHIVE_DRIFT = new Set(PROJECT.capabilities?.knownArchiveDrift ?? [])

/** 事件名的形状:动词开头,或 -fixed / -cleanup 结尾。持久能力不会长这样。 */
const EVENT_SHAPED_CAP =
  /^(fix|add|remove|update|create|migrate|refactor|audit|align|generalize|drop|restore|enable|disable)-|-(fixed|cleanup)$/

/** openspec/specs/ 下已落库的能力名 */
function mainSpecCaps() {
  if (!existsSync(SPECS_DIR)) return new Set()
  return new Set(
    readdirSync(SPECS_DIR).filter((n) => existsSync(join(SPECS_DIR, n, 'spec.md'))),
  )
}

const argv = process.argv.slice(2)
const OPT = {
  all: argv.includes('--all'),
  json: argv.includes('--json'),
  hook: argv.includes('--hook'),
  explain: argv.includes('--explain'),
  inventory: argv.includes('--inventory'),
  writeIndex: argv.includes('--write-index'),
  change: argv.includes('--change') ? argv[argv.indexOf('--change') + 1] : null,
}

/**
 * 每条检查守护的**失效模式**,一句话。`--explain` 打印本表。
 *
 * 为什么要有它:「这套校验太复杂」的真正痛点不是条数,是**看不出每条在防什么** ——
 * 一条说不清用途的检查,下次挡路时就会被删掉。此前这份知识散在 README、CHANGELOG
 * 和代码注释三处,且已经漂过(README 写 42 项时实际 47 项)。
 *
 * 现在它有唯一事实源:`META/check-undocumented` 会扫本文件里出现的每个检查 ID,
 * 缺条目就报错。**加检查必须同时加一行说明,忘不了。**
 */
const CHECK_DOC = {
  'L0/ambiguity': '缺「未决歧义」节,或 proposal 已存在但歧义没清零 —— 歧义没落盘则换 session 即蒸发;带着歧义往下走,返工成本翻 10 倍',
  'L0/ac-numbered': '验收标准没有 AC-N 编号,L8 只能整体估,无法逐条回指(warn)',

  'L2/placeholder': '残留 TBD / TODO / FIXME / ??? —— 没写完却过了闸,主 spec 里的占位没人会回来补',
  'L2/required-table': '模板标注的必填表整行留空 —— 勾 ☐ 合法,留空不是。这类表是全流程唯一的漏项防线',

  'L2a/capabilities-section': '缺 Capabilities 节 —— 它是 proposal 与 specs 之间的契约,漏建 spec 全靠它兜',
  'L2a/capability-has-spec': 'Capabilities 声明了能力却没建 spec 目录',
  'L2a/spec-declared': '建了 spec 目录却没在 Capabilities 声明',
  'L2a/capability-not-change-name': '能力名与 change 同名 —— 每次改动都新增能力,既有能力永不被修订',
  'L2a/capability-name-shape': '能力名是事件名形状(动词开头 / -fixed 结尾)—— 同上,且改 change 名绕不过',
  'L2a/capability-duplication': '新能力的需求与既有能力逐字重复 —— 两条会一起生效并互相矛盾,旧的不会自动失效',

  'L2b/requirement-heading-depth': '需求标题层级错 —— 原生只在「整个文件解析不出东西」时报错,混合情形完全静默,archive 时才丢',
  'L2b/scenario-heading-depth': '场景标题层级错 —— 同上,原生对混合情形静默,archive 合并时才丢内容',
  'L2b/requirement-needs-scenario': '需求没有场景 —— 无法测,也无法在 L8 逐条验证',
  'L2b/removed-incomplete': 'REMOVED 缺 Reason 或 Migration —— 退役一条需求必须说清为什么、以及现有数据/调用方怎么迁',
  'L2b/no-gate-requirement': 'change 期的一次性闸门被写成 Requirement —— 会把当时的文件清单和测试数冻成 MUST,越老越假',
  'L2b/requirement-id-format': '需求缺 [FR-NNN] 稳定 ID —— 只能靠标题字符串指认,改措辞就静默指向另一条',
  'L2b/requirement-id-unique': '能力内 ID 撞号 —— delta 引用它时指向不确定',
  'L2b/requirement-id-collision': 'ADDED 复用了主 spec 已占用的号 —— 合并后同 ID 两条需求',
  'L2b/requirement-id-unknown': 'MODIFIED/REMOVED 指向主 spec 没有的号 —— 正是 archive 的 not found 拒绝形态,提前拦住',
  'L2b/scenario-needs-criterion': '场景缺「判据」行 —— THEN 说「应该怎样」,判据说「怎么验」,L8 逐条核对靠后者(warn)',
  'L2b/requirement-title-shape': '标题写成整句 MUST —— 原生要求 MUST 在正文、archive 按标题匹配、相似度比对也比标题,三头出事(warn)',

  'L2c/frontmatter': 'design 缺 frontmatter —— L3 审阅结论无处落章',
  'L2c/constitution-check': 'design 没有逐条回答宪法 —— 项目级约定会在每个 change 里被重新推导',

  'L2d/empty-task': '「无变更」类空任务,或把流水线闸门写成任务 —— 每条还要在 exec/plan.md 占一行映射,把真任务淹掉(warn)',
  'L2d/task-id-format': '任务行缺 X.Y 编号 —— apply 阶段追踪不到',
  'L2d/task-id-unique': '任务编号重号 —— exec/plan.md 的映射会指错条目',

  'L3/design-approved': 'tasks.md 已存在但 design 没落 approved_by(L3 人闸被跳过),或 approved_at 不是 YYYY-MM-DD',

  'L4/derived-from': 'exec/plan.md 没声明它派生自 tasks.md —— 单向不变量失去锚点',
  'L4/mapping-section': 'exec/plan.md 缺任务映射表',
  'L4/task-mapped': 'tasks 条目被静默丢弃 —— 单一权威源唯一的漏项防线',
  'L4/unmapped-needs-reason': '未映射条目没写原因 —— 「漏做」与「有意不做」混为一谈',
  'L4/contract-frozen': '实现已开始但契约冻结表仍是 ☐ —— 并行单元各自猜同一个接口',
  'L4/gate-checked': '集成已开始但 L4 交接 Gate 没勾完',

  'L5/notes-required': '集成阶段已开始却没有收尾笔记 —— subagent 上下文一销毁,实现知识永久丢失',
  'L5/note-per-unit': 'plan 声明的执行单元缺对应笔记(warn)',

  'L7/evidence-missing': 'verify 已生成但 build/test/lint 日志缺失或为空文件 —— 没有证据的「跑过」等于没跑',
  'L7/evidence-fresh': '日志比代码还旧 —— 拿旧日志冒充「跑过」',

  'L8/verdict-line': 'verify 找不到「通过 / 打回实现 / 打回设计」结论行',
  'L8/overreach-section': 'verify 没提越界检查(warn)',
  'L8/requirement-coverage': 'delta 里有需求但 tasks 里没人实现它 —— 此前只有 agent 自己读得出来',

  'L10/renamed-format': 'RENAMED 段格式不合规 —— 原生静默忽略,随后引用新名的 MODIFIED 以 not found 失败(判在 checkSpecFile,活跃 change 即拦,不等归档)',
  'L10/delta-target-missing': 'MODIFIED/REMOVED 指向从未声明过的需求名',
  'L10/spec-index': '能力索引过期 —— 手工维护的索引必然过期,而过期的索引比没有索引更糟:它让人以为自己看过全貌了',
  'L10/spec-status': '主 spec 没有 status —— 能力只有「存在=永远生效」一种状态,退役它只能往豁免清单里加条目',
  'L10/archive-fidelity': '归档合并丢了或改写了需求 —— 事后主 spec 完全合法,validate 也全绿',

  'TEMPLATE/slot-malformed': '抽离槽被写坏(空/嵌套/未闭合/开闭不匹配/有闭无开)→ 换项目时会漏掉该重写的项目事实',
  'TEMPLATE/constitution-rows': '宪法与 design 模板的 CP 清单漂移 —— 模板是宪法唯一被注入 prompt 的途径',
  'TEMPLATE/profile-rows': 'rules/enforced/project.md 与六个模板槽(SL/WT/CC/PK/TG/DS-N)清单漂移 —— 模板是这些项目事实唯一被注入 prompt 的途径',

  'META/check-undocumented': '有检查 ID 没写进 CHECK_DOC —— 说不清用途的检查,下次挡路时就会被删掉',
  'META/check-doc-stale': 'design/check.md 没跟上 check.mjs 的结构变化(CLI flag / project.json 字段 / guards 插件)—— 手写的说明书一旦落后,就变成一份看起来权威的假说明',

  'REPO/plugin-error': '检查插件跑不起来(声明了但文件不存在/加载失败/未按契约导出/抛异常/配置无法解析)→ 静默少跑检查',
  'REPO/spec-xref-dangling': '主 spec 正文引用了本能力内不存在的需求 —— 退役一条需求后,引用它的正文会静默悬空,且往往还在描述被推翻的旧行为',
  'REPO/journal-parse': 'drizzle journal 无法解析',
  'REPO/journal-when-monotonic': 'journal 的 when 未递增 —— 迁移被静默跳过,库结构与 schema 悄悄分叉',
  'REPO/journal-idx-monotonic': 'journal 的 idx 未递增',
  'REPO/journal-tag-unique': 'journal tag 重复 —— 两个 worktree 各自 db:generate 撞号',
  'REPO/journal-sql-exists': 'journal 记了但 SQL 文件不在',
  'REPO/worktree-orphan': 'change 已归档而 worktree 还在,或目录还在而注册项没了 —— 泄漏不报错、不变红,只是磁盘上多一份 11 万文件的副本,而存放目录被忽略,没人会替你清',
  'REPO/rules-index-dangling':
    'CLAUDE.md 的规则索引表指向 openspec/rules/ 下不存在的文件 —— agent 会 Read 到空结果,'
    + '然后当作「这份规则没有内容」继续干活,不会停下来问',
  'REPO/rules-index-missing':
    'openspec/rules/ 下新增的规则文件没登记进 CLAUDE.md 的索引表 —— rules/ 不会被自动加载,'
    + '漏登记后它永远不会被读到,而这个失效完全静默:文件在仓库里、grep 得到,只是没人会想起读它',
  'REPO/state-id-dangling': '别处以「文件名.md#NN」引用了 openspec/state/bizs/ 下某文件里不存在的条目编号 —— 条目被删或编号写错后,引用它的那句话静默悬空,读的人翻不到,与 spec-xref-dangling 是同一种失效模式',
  'REPO/state-id-dup': 'openspec/state/bizs/*.md 同一文件内两个条目用了同一个 #NN —— 跨文件引用「文件名.md#NN」从此指向两处,读的人拿到哪条全凭运气',
  'REPO/state-id-legacy': 'openspec/state/bizs/**/*.md 里又出现已废止的全局 T-NN/B-NN —— 旧编号不再对应任何条目,写下它等于写了一个永远翻不到的引用',
  'REPO/components-unregistered': '新增公共组件没登记进 rules/advisory/components.md —— 那份清单是「先查再造」的唯一依据,漏登记等于下一个人会把它重造一遍;清单自述的失效方向只有「删除/改协议」,少了「新增未登记」这一种',
  'REPO/ratchet-baseline': '棘轮基线未播种,或存量降了但基线没跟着降 —— 基线停在最高水位等于给「以后再加回来」留额度',
  'REPO/ratchet-increased': '存量比基线涨了 —— 让宪法「MUST NOT 新增」真正生效的唯一机制',
}

/** @type {{level:'error'|'warn', id:string, file:string, msg:string, line?:number}[]} */
const findings = []
const err = (id, file, msg, line) => findings.push({ level: 'error', id, file, msg, line })
const warn = (id, file, msg, line) => findings.push({ level: 'warn', id, file, msg, line })

// ─────────────────────────── 通用解析工具 ───────────────────────────

const read = (p) => readFileSync(p, 'utf8')
const rel = (p) => relative(ROOT, p)

/** 取顶部 frontmatter 的扁平 key/value(够用即可,不做完整 YAML) */
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const out = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

/**
 * 取某个标题下的内容,到下一个同级或更高级标题为止。
 * @returns {{text:string, line:number}|null}
 */
function section(text, headingRe) {
  const lines = text.split('\n')
  let start = -1
  let level = 0
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s+(.*)$/)
    if (!h) continue
    if (start === -1) {
      if (headingRe.test(lines[i])) {
        start = i
        level = h[1].length
      }
      continue
    }
    if (h[1].length <= level) return { text: lines.slice(start + 1, i).join('\n'), line: start + 1 }
  }
  return start === -1 ? null : { text: lines.slice(start + 1).join('\n'), line: start + 1 }
}

/** markdown 表格 → 单元格二维数组(已去掉分隔行;第一行是表头) */
function tableRows(text) {
  return text
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !/^\s*\|[\s:|-]+\|\s*$/.test(l.trim()))
    .map((l) =>
      l
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim()),
    )
}

/** 表格数据行(不含表头) */
const dataRows = (text) => tableRows(text).slice(1)

/** 单元格是否为空占位(空串、—、-、/、N/A) */
const blank = (cell) => !cell || /^[-—–/]+$/.test(cell) || /^n\/?a$/i.test(cell)

function lineOf(text, needle) {
  const idx = text.split('\n').findIndex((l) => l.includes(needle))
  return idx === -1 ? undefined : idx + 1
}

// ─────────────────────────── 需求稳定 ID(FR-NNN) ───────────────────────────

/**
 * 需求标题的稳定 ID:`### Requirement: [FR-003] <名称>`,**在能力内唯一**、只增不复用。
 *
 * 为什么需要:在此之前,`AC-n(interview) → Requirement → Scenario → task X.Y` 这条追溯链
 * 中间两段是**靠标题字符串**串起来的。标题一改,链就断,而 `openspec archive` 的
 * MODIFIED 匹配同样按标题字符串走 —— 于是「改名」这个最常见的编辑动作会静默地
 * 把一条需求变成另一条。
 * 有了 ID,delta 引用哪条需求就成了可机检的事实,L8 的逐条核对也才能从「agent 自觉」
 * 变成 `L8/requirement-coverage`。
 *
 * 归档件不回填 —— 它们是不可变审计记录。跨代比对一律先 stripReqId 归一化。
 */
const REQ_ID_RE = /^\[(FR-\d{3})\]\s*/

/** 需求标题 → `{ id, name }`;无 ID 前缀时 id 为 null */
function splitReqId(title) {
  const m = title.match(REQ_ID_RE)
  return m ? { id: m[1], name: title.slice(m[0].length).trim() } : { id: null, name: title.trim() }
}

/** 去掉 `[FR-NNN] ` 前缀。用于「已回填的主 spec」与「未回填的归档 delta」之间比对需求名 */
const stripReqId = (title) => splitReqId(title).name

// ─────────────────────────── spec 解析(唯一实现) ───────────────────────────

/**
 * spec 文件的统一解析:**一次读盘、一次解析,全场复用。**
 *
 * 在此之前,`### Requirement:` 这条正则在本文件里出现过 6 次,各自实现一遍解析
 * (有的剥注释有的不剥,已经出现细微差异);主 spec 语料被 8 处独立遍历。
 * 加一条 spec 相关的检查等于再抄一遍正则 —— 这里把它收敛成一个结构。
 *
 * 返回结构对 delta spec 与主 spec 通用:
 * - `fm`           frontmatter(主 spec 用它读 status)
 * - `purpose`      `## Purpose` 段正文
 * - `requirements` 每条含 `{ id, name, raw, line, depth, op, scenarios }`
 *                  · `op` 是所在 delta 段(ADDED/MODIFIED/REMOVED/RENAMED),主 spec 里为 null
 *                  · `depth` 是实际的 `#` 个数 —— 层级校验要用,不能在解析时丢掉
 * - `scenarios`    每条含 `{ name, line, depth, hasCriterion }`
 * - `renamed`      RENAMED 段解析出的 FROM/TO 对
 * - `badScenarioBullets` 写成列表项的场景(行号)
 * - `deltaSections` 出现过的 delta 段标题数
 * - `lines`         已剥注释的行数组(行号与原文一致),供需要原文的检查复用
 */
function parseSpecText(text) {
  const lines = stripComments(text)
  const out = {
    fm: frontmatter(text),
    purpose: '',
    requirements: [],
    renamed: [],
    renamedRaw: [],
    badScenarioBullets: [],
    deltaSections: 0,
  }
  let op = null
  let cur = null
  let inPurpose = false
  const purposeLines = []

  const criterionAfter = (from) => {
    for (let j = from; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) {
      if (/^\s*[-*]\s*\**判据\**\s*[::]/.test(lines[j])) return true
    }
    return false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (/^\s*[-*]\s*\**Scenario\b/i.test(line)) {
      out.badScenarioBullets.push(i + 1)
      continue
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (!h) {
      if (inPurpose) purposeLines.push(line)
      if (op === 'RENAMED' && line.trim()) {
        out.renamedRaw.push({ text: line, line: i + 1 })
        const f = line.match(/^\s*[-*]?\s*\**FROM\**:\s*`###\s+Requirement:\s*(.*?)`\s*$/)
        const t = line.match(/^\s*[-*]?\s*\**TO\**:\s*`###\s+Requirement:\s*(.*?)`\s*$/)
        if (f) {
          const { id, name } = splitReqId(f[1].trim())
          out.renamed.push({ from: name, to: null, id, line: i + 1 })
        }
        if (t && out.renamed.length) out.renamed[out.renamed.length - 1].to = stripReqId(t[1].trim())
      }
      continue
    }

    const depth = h[1].length
    const title = h[2]

    if (/^Scenario\s*:/i.test(title)) {
      const sc = {
        name: title.replace(/^Scenario\s*:\s*/i, '').trim(),
        line: i + 1,
        depth,
        hasCriterion: criterionAfter(i + 1),
      }
      if (cur) cur.scenarios.push(sc)
      continue
    }

    if (/^Requirement\s*:/i.test(title)) {
      const raw = title.replace(/^Requirement\s*:\s*/i, '').trim()
      const { id, name } = splitReqId(raw)
      cur = { id, name, raw, line: i + 1, depth, op, scenarios: [] }
      out.requirements.push(cur)
      inPurpose = false
      continue
    }

    // 其余标题:切换 delta 段 / Purpose 段,并结算当前需求
    if (depth <= 2) {
      const sec = title.match(/^(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i)
      if (sec) {
        op = sec[1].toUpperCase()
        out.deltaSections += 1
      } else {
        op = null
      }
      inPurpose = !sec && /^Purpose\s*$/i.test(title)
      cur = null
    }
  }

  out.purpose = purposeLines.join('\n').trim()
  out.lines = lines
  return out
}

/** 按路径缓存的解析结果 —— 同一个文件在一次运行里只读一次、只解析一次 */
const specCache = new Map()
function loadSpec(path) {
  let v = specCache.get(path)
  if (!v) {
    v = parseSpecText(read(path))
    specCache.set(path, v)
  }
  return v
}

/** 主 spec 的解析结果 */
const mainSpec = (cap) => loadSpec(join(SPECS_DIR, cap, 'spec.md'))

/**
 * 某个 spec 文件里**层级正确**的需求(正好 3 个 `#`)。
 * 层级写错的需求由 `L2b/requirement-heading-depth` 单独报 —— 这里不收,
 * 与原生解析口径保持一致(原生同样只认 `### Requirement:`)。
 */
const reqsOf = (path) => loadSpec(path).requirements.filter((r) => r.depth === 3)

/** 主 spec 里某能力已占用的 ID(含 name,便于报错时指出撞的是哪条) */
function mainSpecReqIds(cap) {
  const out = new Map()
  const p = join(SPECS_DIR, cap, 'spec.md')
  if (!existsSync(p)) return out
  for (const r of reqsOf(p)) if (r.id) out.set(r.id, r.name)
  return out
}

/** 下一个可用 ID(只增不复用:取已占用的最大值 +1,REMOVED 掉的号不回收) */
function nextReqId(usedIds) {
  let max = 0
  for (const id of usedIds) max = Math.max(max, Number(id.slice(3)))
  return `FR-${String(max + 1).padStart(3, '0')}`
}

/** 归档件是不可变审计记录:新增的机械规则一律不回溯适用 */
const isArchived = (c) => c.dir.includes(`${CHANGES_DIR}/archive/`)

/**
 * 去掉 HTML 注释内容但**保留行号**,让模板能用注释承载「按需取用」的骨架
 * (例如 spec 模板里另外三种 delta 操作)而不被当成真内容解析。
 */
function stripComments(text) {
  const lines = text.split('\n')
  let inComment = false
  return lines.map((line) => {
    let out = ''
    let rest = line
    while (rest.length) {
      if (inComment) {
        const end = rest.indexOf('-->')
        if (end === -1) return out
        rest = rest.slice(end + 3)
        inComment = false
      } else {
        const start = rest.indexOf('<!--')
        if (start === -1) return out + rest
        out += rest.slice(0, start)
        rest = rest.slice(start + 4)
        inComment = true
      }
    }
    return out
  })
}

/** 读文件并去掉 HTML 注释(行号不变) */
const readClean = (p) => stripComments(read(p)).join('\n')

// ─────────────────────────── git 辅助(证据新鲜度用) ───────────────────────────

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/** 最后一次改动该路径的 commit 时间(ms);无提交历史返回 0 */
function lastCommitTs(path) {
  const out = git(['log', '-1', '--format=%ct', '--', path])
  return out ? Number(out) * 1000 : 0
}

/** 该路径最早一次被加入版本库的时间(ms);无提交历史返回 0 */
function firstCommitTs(path) {
  const out = git(['log', '--diff-filter=A', '--format=%ct', '--', path])
  if (!out) return 0
  const lines = out.split('\n').filter(Boolean)
  return lines.length ? Number(lines[lines.length - 1]) * 1000 : 0
}

/** 该路径下未提交改动的文件列表(相对仓库根) */
function dirtyFiles(path) {
  const out = git(['status', '--porcelain', '--', path])
  if (!out) return []
  return out
    .split('\n')
    .map((l) => l.slice(3).trim())
    .filter(Boolean)
    .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p))
}

function mtime(p) {
  try {
    return statSync(p).mtimeMs
  } catch {
    return 0
  }
}

/** 文件的"最后有效变更时间":脏文件用 mtime,干净文件用 commit 时间 */
function effectiveTs(absPath) {
  const r = rel(absPath)
  const dirty = git(['status', '--porcelain', '--', r])
  return dirty ? mtime(absPath) : lastCommitTs(r) || mtime(absPath)
}

// ─────────────────────────── L0 · interview ───────────────────────────

/** 「未决歧义」必须清零才能进入 L2(schema.yaml interview 的 Gate) */
function checkInterview(c) {
  if (!existsSync(c.interview)) return
  const text = readClean(c.interview)
  const sec = section(text, /^##\s+未决歧义/)
  if (!sec) {
    warn('L0/ambiguity', rel(c.interview), '缺少「## 未决歧义」章节,L0 闸门无从判定')
    return
  }
  const open = sec.text.split('\n').filter((l) => /^\s*-\s*\[\s\]/.test(l))
  // 只有下游已经开工(proposal 已存在)时才算硬错误,否则是正常的进行中状态
  const gated = existsSync(c.proposal)
  for (const l of open) {
    const label = l.replace(/^\s*-\s*\[\s\]\s*/, '').trim()
    const msg = label
      ? `未决歧义未清零:「${label}」`
      : '「未决歧义」里残留空占位 `- [ ]`,清零后请写 `- 无` 或删除该行'
    gated
      ? err('L0/ambiguity', rel(c.interview), `${msg}(proposal.md 已存在,不应再有未决项)`)
      : warn('L0/ambiguity', rel(c.interview), msg)
  }

  // 验收标准需要可回指的编号,否则 L8 只能整体估
  const ac = section(text, /^##\s+验收标准/)
  if (ac) {
    const items = ac.text.split('\n').filter((l) => /^\s*-\s*\[[ xX]\]/.test(l))
    const unnumbered = items.filter((l) => !/AC-\d+/.test(l) && l.replace(/^\s*-\s*\[[ xX]\]\s*/, '').trim())
    if (unnumbered.length) {
      warn(
        'L0/ac-numbered',
        rel(c.interview),
        `${unnumbered.length} 条验收标准没有 AC-N 编号,L8 无法逐条回指`,
      )
    }
  }
}

// ─────────────────────────── 通用 · 模板标注的必填表 ───────────────────────────

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 「模板里的表必须填满」此前是三条各写一遍的检查(共享层影响 / 横切关注点 / 宪法对照),
 * 判定逻辑一模一样:标记列要有勾、说明列不能空。现在收敛成一条,**由模板里的标注驱动**:
 *
 *     <!-- openspec:required-table mark=2 note=3 -->
 *     | 类别 | 是否命中 | 说明 |
 *
 * 好处不是少了两条检查,而是**以后加表零成本** —— 在模板里加一张标注表,
 * 下一个 change 就必须填满它,不用改这份代码。
 * 与 `L2c/constitution-check` 从 rules/enforced/constitution.md 动态读原则是同一个思路。
 *
 * 勾 ☐(不涉及)始终是合法答案,要防的是「整行留空跳过」。
 */
function requiredTablesOf(templateName) {
  const p = join(TEMPLATES_DIR, 'devops-workflow/templates', templateName)
  if (!existsSync(p)) return []
  const lines = read(p).split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/<!--\s*openspec:required-table\s+mark=(\d+)\s+note=(\d+)\s*-->/)
    if (!m) continue
    let heading = null
    for (let j = i - 1; j >= 0; j--) {
      const h = lines[j].match(/^##\s+(.+?)\s*$/)
      if (h) {
        heading = h[1]
        break
      }
    }
    if (heading) out.push({ heading, mark: Number(m[1]) - 1, note: Number(m[2]) - 1 })
  }
  return out
}

function checkRequiredTables(c) {
  if (isArchived(c)) return
  for (const [file, templateName] of [
    [c.proposal, 'proposal.md'],
    [c.design, 'design.md'],
  ]) {
    if (!existsSync(file)) continue
    const text = readClean(file)
    for (const { heading, mark, note } of requiredTablesOf(templateName)) {
      const sec = section(text, new RegExp(`^##\\s+${escRe(heading)}\\s*$`))
      if (!sec) {
        err(
          'L2/required-table',
          rel(file),
          `缺少「## ${heading}」一节 —— 模板把它标成了必填表(openspec:required-table),` +
            `这类表是全流程唯一的漏项防线,删掉它等于把漏项变成默认路径`,
        )
        continue
      }
      for (const row of dataRows(sec.text)) {
        const item = row[0] ?? ''
        if (blank(item)) continue
        if (!/[☐☑⚠✅❌✔×]/.test(row[mark] ?? '')) {
          err(
            'L2/required-table',
            rel(file),
            `「${heading}」的「${item.slice(0, 30)}」没有勾选标记`,
            lineOf(text, item),
          )
        } else if (blank(row[note] ?? '')) {
          err(
            'L2/required-table',
            rel(file),
            `「${heading}」的「${item.slice(0, 30)}」勾了但没写说明 —— ` +
              `勾 ☐「不涉及」是合法答案,但要写出判断依据;整行留空不是答案`,
            lineOf(text, item),
          )
        }
      }
    }
  }
}

// ─────────────────────────── L2-a · proposal ───────────────────────────

/**
 * 「共享层影响」「横切关注点」两张表的填写校验已收敛进通用的 `L2/required-table`
 * (由模板里的 `openspec:required-table` 标注驱动)。本函数只保留 Capabilities 相关的判定。
 */
function checkProposal(c) {
  if (!existsSync(c.proposal)) return
  const text = readClean(c.proposal)

  // Capabilities 是 proposal 与 specs 阶段之间的契约(schema.yaml proposal instruction)
  const caps = section(text, /^##\s+Capabilities/)
  if (!caps) {
    err(
      'L2a/capabilities-section',
      rel(c.proposal),
      '缺少「## Capabilities」章节 —— 它是 proposal 与 specs 之间的契约,漏建 spec 全靠它兜',
    )
    return
  }
  // 能力名只认表格第一列。早先是扫全节文本抓反引号词,会把说明里的
  // `height`、`overflow` 这类普通标识符误判成能力 —— 本节说明写得越细,误报越多。
  const declared = new Set()
  for (const row of dataRows(caps.text)) {
    const m = (row[0] ?? '').match(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/)
    if (m) declared.add(m[1])
  }
  const actual = new Set(c.specDirs)

  for (const cap of declared) {
    if (!actual.has(cap)) {
      err(
        'L2a/capability-has-spec',
        rel(c.proposal),
        `Capabilities 声明了 \`${cap}\`,但 specs/${cap}/spec.md 不存在`,
      )
    }
  }
  for (const cap of actual) {
    if (!declared.has(cap)) {
      err(
        'L2a/spec-declared',
        rel(join(c.dir, 'specs', cap)),
        `specs/${cap}/ 存在,但 proposal.md 的 Capabilities 没有声明它`,
      )
    }
  }

  // 能力名 == change 名:每做一次改动就新增一个能力,既有能力永不被修订或退役。
  // 后果是同一份实现被多个主 spec 同时约束,且最旧那份会与线上代码相反 —— 而校验全绿。
  // 连 declared 一起判,好在 proposal 阶段就拦下 —— 等 spec.md 写完再报,改名成本已经翻倍
  const changeName = c.id.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  for (const cap of new Set([...declared, ...actual])) {
    if (LEGACY_CHANGE_NAMED.has(cap)) continue
    const at = actual.has(cap) ? rel(join(c.dir, 'specs', cap)) : rel(c.proposal)

    if (cap === changeName) {
      err(
        'L2a/capability-not-change-name',
        at,
        `能力名 \`${cap}\` 与 change 同名。能力是持久的领域名词(如 \`biz-project-create-modal\`),` +
          `change 是一次性事件 —— 同名会让每次改动都新增能力而非修订既有能力。` +
          `请改用领域名词,并对既有能力用 MODIFIED / REMOVED 而不是再开一个新能力`,
      )
    }
    // 单看「与 change 同名」可以靠把 change 一起改名绕过,所以再直接判名字形状:
    // 动词开头或 -fixed / -cleanup 结尾的都是事件名,不可能是持久能力。
    if (EVENT_SHAPED_CAP.test(cap)) {
      err(
        'L2a/capability-name-shape',
        at,
        `能力名 \`${cap}\` 是事件名的形状(动词开头,或 -fixed / -cleanup 结尾),不是持久能力。` +
          `能力回答的是「这块东西长期该是什么样」,用领域名词命名(如 \`biz-travel-modal\`);` +
          `「这次修了什么」属于 change 名与 proposal 的 Why`,
      )
    }
  }

  // 已删:`L2a/capability-novelty`(要求作者在 Capabilities 表自述「既有能力调研」)。
  //
  // 它当初是「只 ADDED 不 REMOVED」的唯一防线,但本质是**让被检查方写检查报告** ——
  // 实际效果有据可查:52 个能力 / 31 个 change,其中三个同时约束一个 ProjectCreateModal.tsx
  // 且互相矛盾,而这条检查全程绿灯。
  //
  // 现在它被两样更强的东西取代,所以删掉而不是保留:
  //   · `L2a/capability-duplication` —— 拿新能力的每条需求去比对全部既有主 spec,机器判,不问作者
  //   · `openspec/specs/README.md`   —— 53 个能力一页看全(名字/需求数/状态/一句话职责),
  //                                     「要改的行为是否已有能力在管」不再需要靠自述回答
}

// ─────────────────────────── L2-b · delta spec ───────────────────────────


/**
 * 场景标题必须正好 4 个 `#`。
 * 用 3 个或写成列表都会被 OpenSpec **静默忽略** —— 不报错,只是在 archive 合并时丢掉,
 * 是本流水线最隐蔽的失败模式。
 */

function checkSpecFile(path, { isDelta, archived = false }) {
  const spec = loadSpec(path)
  const at = rel(path)

  // report() 按插入顺序打印,所以发现顺序必须与「逐行扫描」一致 ——
  // 这里先按行号收集再统一发出(Array#sort 稳定,同一行内保持 push 顺序)。
  const found = []
  const bad = (id, msg, line) => found.push({ level: 'error', id, msg, line })
  const meh = (id, msg, line) => found.push({ level: 'warn', id, msg, line })

  for (const line of spec.badScenarioBullets) {
    bad('L2b/scenario-heading-depth', '场景写成了列表项。必须是标题且正好 4 个 `#`:`#### Scenario: <名称>`,否则会被静默忽略', line)
  }

  // RENAMED 段有内容却一对 FROM/TO 都解析不出来 = 格式不合规。
  //
  // 原生对这种写法**不报错,只当它不存在** —— 紧接着引用新名的 MODIFIED 就报 not found,
  // 错误信息指向 MODIFIED,真正的病根却在这里,极难反查。
  //
  // ⚠️ 这条必须在**活跃 change** 上就响。它原本长在 checkArchiveFidelity() 里,
  // 而那个函数只遍历 changes/archive/ —— 等于要归档之后才发现,那时静默丢内容已经发生了。
  if (isDelta && spec.renamedRaw.length && !spec.renamed.length) {
    bad(
      'L10/renamed-format',
      'RENAMED 段有内容,但没有任何一对 FROM/TO 能被解析。必须严格写成 ' +
        '`- FROM: `### Requirement: <旧名>`` 与 `- TO: `### Requirement: <新名>`` —— ' +
        '省略 `### Requirement:` 前缀、或写成 `- **FROM**: `<名>`` 都会被原生静默忽略,' +
        '随后引用新名的 MODIFIED 会以 not found 失败',
      spec.renamedRaw[0].line,
    )
  }

  /** 本文件内已用过的 ID → 首次出现行号 */
  const idsSeen = new Map()

  for (const r of spec.requirements) {
    if (r.depth !== 3) {
      bad('L2b/requirement-heading-depth', `需求标题用了 ${r.depth} 个 \`#\`,必须正好 3 个`, r.line)
    }

    // 归档件不回溯适用(见 isArchived 的说明)
    if (!archived) {
      if (!r.id) {
        bad(
          'L2b/requirement-id-format',
          `需求「${r.name.slice(0, 40)}」缺稳定 ID。标题必须写成 ` +
            `\`### Requirement: [FR-NNN] <名称>\` —— 没有 ID,delta 只能靠标题字符串指认需求,` +
            `改一次名就会静默指向另一条(或让 \`openspec archive\` 以 not found 失败)`,
          r.line,
        )
      } else if (idsSeen.has(r.id)) {
        const first = idsSeen.get(r.id)
        bad(
          'L2b/requirement-id-unique',
          `需求 ID ${r.id} 在本文件内重复(另一处在第 ${first} 行)—— ` +
            `ID 在能力内必须唯一,否则 delta 引用它时指向不确定`,
          r.line,
        )
      } else {
        idsSeen.set(r.id, r.line)
      }

      // 标题形状:名词短语,不是整句 MUST 陈述。只对活跃 change 的 delta 报,且只到 warn ——
      // 主 spec 里多数是老写法,存量不强改,碰到哪条改哪条(MODIFIED 时顺带,ID 不变所以链不断)。
      if (isDelta) {
        const why = /MUST|SHALL|必须/.test(r.name)
          ? '标题里写了 MUST/SHALL/必须'
          : [...r.name].length > 40
            ? `标题 ${[...r.name].length} 字,过长`
            : null
        if (why) {
          meh(
            'L2b/requirement-title-shape',
            `${why} —— 标题应是**名词短语**(这条管的是什么),规范陈述写在正文首行 ` +
              `\`<主体> **MUST** <行为>。\`。三个理由:① 原生 \`validate --strict\` 要求 MUST 在正文,` +
              `写在标题里不算;② \`openspec archive\` 按标题字符串匹配 MODIFIED,长句标题改个措辞就断链;` +
              `③ L2a/capability-duplication 比的是标题,整句会让同族实体互刷高分`,
            r.line,
          )
        }
      }
    }

    for (const sc of r.scenarios) {
      if (sc.depth !== 4) {
        bad('L2b/scenario-heading-depth', `场景标题用了 ${sc.depth} 个 \`#\`,必须正好 4 个 —— 否则会被静默忽略`, sc.line)
      }
      // 判据只对**活跃 change 的 delta** 报 —— 归档件是不可变审计记录,新规则不回溯适用
      if (isDelta && !archived && !sc.hasCriterion) {
        meh(
          'L2b/scenario-needs-criterion',
          `场景「${sc.name.slice(0, 24)}」缺一行 \`- **判据**:…\` —— ` +
            `写**可观测**的判定方式(某个 grep 无匹配、某字段值、某接口返回码),不要复述 THEN。` +
            `THEN 说的是「应该怎样」,判据说的是「怎么验」,L8 逐条核对靠的是后者`,
          sc.line,
        )
      }
    }

    if (!r.scenarios.length) {
      bad('L2b/requirement-needs-scenario', `需求「${r.name}」没有任何 Scenario —— 无法测,也无法在 L8 逐条验证`, r.line)
    }
  }

  found.sort((a, b) => a.line - b.line)
  for (const f of found) (f.level === 'error' ? err : warn)(f.id, at, f.msg, f.line)

  // 已删:`L2b/no-requirement`(整个文件没有需求)与 `L2b/delta-op-heading`(缺 delta 操作标题)。
  // 原生 `openspec validate --strict` 对这两种**整体性缺失**会直接报错,重复检查没有价值。
  //
  // ⚠️ 但**不要顺手把上面两条层级检查也删了** —— 那两条的情况正相反:
  // 原生只在「整个文件解析不出任何东西」时报错,对**混合**情形完全静默 ——
  // 一条合法 `#### Scenario` 旁边混一个 3 个 `#` 的场景,原生 0 error 直接放行,
  // 那个场景在 archive 合并时被丢掉,事后主 spec 看起来完全合法。需求标题层级同理。

  if (!isDelta) return

  const removed = section(spec.lines.join('\n'), /^##\s+REMOVED\s+Requirements/)
  if (removed && removed.text.trim()) {
    if (!/Reason\s*[::]/i.test(removed.text)) {
      err('L2b/removed-incomplete', at, 'REMOVED Requirements 缺少 **Reason**', removed.line)
    }
    if (!/Migration\s*[::]/i.test(removed.text)) {
      err('L2b/removed-incomplete', at, 'REMOVED Requirements 缺少 **Migration**', removed.line)
    }
  }

  // 只判**标题**:闸门型需求的标题一律自明,而正文里出现 `pnpm build` 往往只是某条正常需求的
  // 验收方式 —— 连正文一起判会误伤,误伤多了这条检查就会被关掉,于是精度优先于召回。
  const GATES = [
    [/MUST NOT 被修改/, '「某某文件 MUST NOT 被修改」是本次改动的越界闸门'],
    [/build\s*\/\s*test\s*\/\s*lint|MUST 全绿/, '「build / test / lint 全绿」是 L7 硬闸门'],
    [/git diff --stat/, '拿 `git diff --stat` 做断言的是 L8 越界检查'],
  ]
  for (const r of spec.requirements) {
    if (r.depth > 3) continue
    const hit = GATES.find(([re]) => re.test(r.raw))
    if (!hit) continue
    err(
      'L2b/no-gate-requirement',
      at,
      `需求「${r.raw}」是 change 期一次性闸门,不是持久能力规格(${hit[1]})。` +
        `写进 spec 会永久留在主 spec 里并冻结当时的文件清单与测试数量,越老越假 —— ` +
        `请移到 exec/verify.md 的越界检查与硬闸门证据`,
      r.line,
    )
  }
}

// ─────────────────────────── L2 · 未解决占位符 ───────────────────────────

/**
 * 未解决的占位符 —— 对应 Spec Kit `/analyze` 的 Ambiguity Detection 一环。
 *
 * 为什么值得单独一条:占位符不是「写得不好」,是**没写完却过了闸**。
 * 最典型的一种是 `TBD - created by archiving change <名字>`:主 spec 的 Purpose 缺失时
 * 归档合并会自动填这句,而没有任何后续步骤会回来补。
 *
 * 只认无歧义的 ASCII 标记与那句归档占位。中文的「待补」「待定」不判 ——
 * spec 里「已知缺口:contract 侧尚未实现,留待后续 change 补齐」是**合法的**已知缺口声明,
 * 判它会误伤,而误伤多了这条检查就会被关掉。
 */
const PLACEHOLDERS = [
  [/Update Purpose after archive/i, '归档自动填充的 Purpose 占位'],
  [/\bTBD\b/i, 'TBD'],
  [/\bTODO\b/i, 'TODO'],
  [/\bFIXME\b/i, 'FIXME'],
  [/<placeholder>/i, '<placeholder>'],
  [/\?{3,}/, '???'],
]

function checkPlaceholders(path) {
  if (!existsSync(path)) return
  const lines = stripComments(read(path))
  for (let i = 0; i < lines.length; i++) {
    for (const [re, label] of PLACEHOLDERS) {
      if (!re.test(lines[i])) continue
      err(
        'L2/placeholder',
        rel(path),
        `残留未解决的占位符「${label}」:${lines[i].trim().slice(0, 60)} —— ` +
          `占位符不是写得不好,是没写完却过了闸;主 spec 里的占位没有任何后续步骤会回来补`,
        i + 1,
      )
      break
    }
  }
}

// ─────────────────────────── L2-b · delta 的 ID 引用完整性 ───────────────────────────

/**
 * delta 引用主 spec 时,ID 必须对得上。
 *
 * 这是把 L10/archive-fidelity 的两类失败提前到写 delta 的当下:
 * - MODIFIED / REMOVED / RENAMED FROM 指向一个主 spec 里不存在的 ID
 *   → `openspec archive` 会以 `MODIFIED failed - not found` 拒绝,但那是几十步之后的事;
 * - ADDED 复用了一个已被占用的 ID
 *   → 归档合并后能力内出现两条同 ID 需求,后续 delta 引用它就成了掷骰子。
 *
 * 只对活跃 change 判:归档件没有 ID,且其引用的主 spec 状态早已改变。
 */
function checkRequirementIds(c) {
  if (isArchived(c)) return
  for (const cap of c.specDirs) {
    const f = join(c.dir, 'specs', cap, 'spec.md')
    if (!existsSync(f)) continue
    const mainIds = mainSpecReqIds(cap)
    const isNewCap = !existsSync(join(SPECS_DIR, cap, 'spec.md'))
    const d = deltaOpsOf(f)
    const addedIds = new Set()

    for (const { op, id, line } of d.ops) {
      if (!id) continue // 缺 ID 已由 L2b/requirement-id-format 报过,不重复报

      if (op === 'ADDED') {
        if (mainIds.has(id)) {
          err(
            'L2b/requirement-id-collision',
            rel(f),
            `ADDED 的 ${id} 已被主 spec 占用(那条是「${mainIds.get(id).slice(0, 30)}…」)。` +
              `ID 只增不复用,本条请改用 ${nextReqId([...mainIds.keys(), ...addedIds])};` +
              `若本意是改这条既有需求,应该用 MODIFIED 而不是 ADDED`,
            line,
          )
        }
        addedIds.add(id)
        continue
      }

      // MODIFIED / REMOVED / RENAMED 都是「指向既有需求」的操作
      if (isNewCap) {
        err(
          'L2b/requirement-id-unknown',
          rel(f),
          `${op} 引用了 ${id},但 \`openspec/specs/${cap}/\` 还不存在 —— ` +
            `新建能力只能有 ADDED。要修订既有行为,请沿用管着它的那个能力名`,
          line,
        )
      } else if (!mainIds.has(id)) {
        err(
          'L2b/requirement-id-unknown',
          rel(f),
          `${op} 引用了 ${id},但主 spec \`openspec/specs/${cap}/spec.md\` 里没有这个 ID。` +
            `\`openspec archive\` 会直接拒绝(${op} failed - not found)—— ` +
            `请先读一遍主 spec 确认要改的是哪条,对齐它的 ID`,
          line,
        )
      }
    }
  }
}

// ─────────────────────────── L2-a · 新能力与既有能力的重复检出 ───────────────────────────

/** 归一化:去 markdown 修饰与标点,只留 CJK 与 alnum。比对的是意思,不是排版。 */
const normReq = (s) =>
  s
    .replace(/[`*_~]/g, '')
    .toLowerCase()
    .replace(/[^\p{Script=Han}\p{L}\p{N}]/gu, '')

/** 字符二元组多重集 */
function bigrams(s) {
  const m = new Map()
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2)
    m.set(g, (m.get(g) ?? 0) + 1)
  }
  return m
}

/** Dice 系数(多重集)。中英混排都稳,且无外部依赖。 */
function dice(a, b) {
  const A = bigrams(a)
  const B = bigrams(b)
  let inter = 0
  let sizeA = 0
  let sizeB = 0
  for (const n of A.values()) sizeA += n
  for (const n of B.values()) sizeB += n
  for (const [g, n] of A) if (B.has(g)) inter += Math.min(n, B.get(g))
  return sizeA + sizeB === 0 ? 0 : (2 * inter) / (sizeA + sizeB)
}

/**
 * 两个能力名共享 ≥2 段后缀 → **同族**(`leave-form-table` / `travel-form-table`、
 * `biz-project-list-page` / `biz-invoice-red-list-page`)。
 *
 * 同族能力由同一套模板派生、各管一个实体,需求文本只差一个领域词。
 * **必须把它们和真重复分开**,否则每新建一个平行实体都会报错。
 */
function isSiblingCap(a, b) {
  const A = a.split('-')
  const B = b.split('-')
  let n = 0
  while (n < A.length && n < B.length && A[A.length - 1 - n] === B[B.length - 1 - n]) n++
  return n >= 2
}

/**
 * 阈值是在全量主 spec 需求上标定过的,不是拍的:同族误报集中在 0.85~0.96 段,
 * 真重复几乎都落在 1.00(逐字相同)。因此非同族 ≥0.90 判错、≥0.84 提醒;
 * 同族只在逐字相同(≥0.99)时判错。
 *
 * **改阈值前先重跑标定**(方法与历次结果见 design/CHANGELOG.md)——
 * 一条会误报的检查很快就会被关掉,那等于没有这条检查。
 */
const DUP_ERR = 0.9
const DUP_SIBLING_ERR = 0.99
const DUP_WARN = 0.84
/** 太短的标题没有区分度,比对它们只会制造误报 */
const DUP_MIN_LEN = 12

/**
 * 新建能力时,拿它的每条需求去比对**全部既有主 spec** 与本 change 的其他 delta 能力。
 *
 * 为什么必须由机器做:`L2a/capability-novelty` 要求 agent 自述「查过哪些既有能力、
 * 为何本次不是它们的修订」—— 那是让被检查方写检查报告,防不住「新开一个能力把旧的晾在那儿」。
 * 逐条比对可以。
 */
function checkCapabilityDuplication(c) {
  if (isArchived(c)) return
  const existing = mainSpecCaps()
  const newCaps = c.specDirs.filter((cap) => !existing.has(cap) && !LEGACY_CHANGE_NAMED.has(cap))
  if (!newCaps.length) return

  // 比对基线:全部主 spec 的需求 + 本 change 里其他 delta 能力的需求。
  // 已 superseded 的能力不进基线 —— 新能力取代它正是它被退役的原因,判成重复等于拦住正当演进。
  const retired = supersededCaps()
  const baseline = []
  for (const cap of existing) {
    if (retired.has(cap)) continue
    for (const n of requirementNamesOf(join(SPECS_DIR, cap, 'spec.md'))) {
      baseline.push({ cap, name: n, norm: normReq(n) })
    }
  }
  for (const cap of c.specDirs) {
    if (newCaps.includes(cap)) continue
    const f = join(c.dir, 'specs', cap, 'spec.md')
    if (!existsSync(f)) continue
    for (const n of requirementNamesOf(f)) {
      baseline.push({ cap, name: n, norm: normReq(n) })
    }
  }

  for (const cap of newCaps) {
    const f = join(c.dir, 'specs', cap, 'spec.md')
    if (!existsSync(f)) continue
    const text = read(f)
    // 同一 change 内的两个新能力也要互比 —— 一次提出两个近重复能力是常见形态
    const peers = newCaps
      .filter((o) => o !== cap && existsSync(join(c.dir, 'specs', o, 'spec.md')))
      .flatMap((o) =>
        requirementNamesOf(join(c.dir, 'specs', o, 'spec.md')).map((n) => ({
          cap: o,
          name: n,
          norm: normReq(n),
        })),
      )

    for (const name of requirementNamesOf(f)) {
      const norm = normReq(name)
      if (norm.length < DUP_MIN_LEN) continue
      let best = null
      for (const cand of [...baseline, ...peers]) {
        if (cand.norm.length < DUP_MIN_LEN) continue
        const score = dice(norm, cand.norm)
        if (!best || score > best.score) best = { ...cand, score }
      }
      if (!best) continue

      const sibling = isSiblingCap(cap, best.cap)
      const errAt = sibling ? DUP_SIBLING_ERR : DUP_ERR
      const isErr = best.score >= errAt
      // 同族只在逐字相同时才说话 —— 平行实体之间的高分是常态,不是问题
      if (!isErr && (sibling || best.score < DUP_WARN)) continue

      const at = lineOf(text, name)
      const msg =
        `新能力 \`${cap}\` 的需求「${name.slice(0, 36)}…」与` +
        `${sibling ? '同族' : '既有'}能力 \`${best.cap}\` 的「${best.name.slice(0, 36)}…」` +
        `相似度 ${best.score.toFixed(2)}。` +
        `同一块行为被两个能力同时以 MUST 约束时,旧的那条不会自动失效,两条会一起生效并互相矛盾 —— ` +
        `确认是同一块行为就改用 \`${best.cap}\` 的 MODIFIED、或把这条需求上提到两者共同的父能力;` +
        `确认不是就把两者的边界写进 proposal 的「既有能力调研」列`
      isErr
        ? err('L2a/capability-duplication', rel(f), msg, at)
        : warn('L2a/capability-duplication', rel(f), msg, at)
    }
  }
}

// ─────────────────────────── L2-c · design(L3 人闸) ───────────────────────────

/**
 * L3 是全流程唯一一次"改起来还便宜"的审阅点,但 schema 的 requires 只看文件在不在。
 * 这里补上:tasks.md 一旦存在,design.md 就必须已被人批准。
 */
/**
 * 「宪法对照」表:design.md 必须逐条回答 `openspec/rules/enforced/constitution.md` 里的每条原则。
 *
 * 为什么放在 design:那是全流程唯一一次「改起来还便宜」的审阅点(L3),也是唯一
 * 同时看得见架构意图与项目既有约定的地方。放到 verify 阶段再问就太晚了。
 *
 * 为什么原则清单从 rules/enforced/constitution.md **动态读取**而不是写死在这里:写死的清单会与
 * 宪法漂移,而漂移的检查比没有检查更糟 —— 它让人以为已经检查过了。
 * 在 rules/enforced/constitution.md 里加一条 `### CP-N`,下一个 change 的 design 就必须回答它,不用改本文件。
 */
function constitutionPrinciples() {
  const p = join(OPENSPEC_DIR, 'rules', 'enforced', 'constitution.md')
  if (!existsSync(p)) return []
  const out = []
  for (const l of stripComments(read(p))) {
    const m = l.match(/^###\s+(CP-\d+)\s*[·:：-]\s*(.+)$/)
    if (m) out.push({ id: m[1], title: m[2].trim() })
  }
  return out
}

function checkConstitution(c) {
  if (isArchived(c) || !existsSync(c.design)) return
  const principles = constitutionPrinciples()
  if (!principles.length) return // 没有宪法就没有这条检查,不为难早于宪法的仓库

  const text = readClean(c.design)
  const sec = section(text, /^##\s+宪法对照/)
  if (!sec) {
    err(
      'L2c/constitution-check',
      rel(c.design),
      `缺少「## 宪法对照」表 —— 必须逐条回答 openspec/rules/enforced/constitution.md 的 ${principles.length} 条原则。` +
        `这是全流程唯一一处跨 change 不变量的落地点,漏掉它,项目级约定就会在每个 change 里被重新推导一遍`,
    )
    return
  }

  const rows = dataRows(sec.text)
  for (const { id, title } of principles) {
    const row = rows.find((r) => (r[0] ?? '').includes(id))
    if (!row) {
      err(
        'L2c/constitution-check',
        rel(c.design),
        `宪法对照表没有 ${id}(${title.slice(0, 24)}）这一行 —— 每条原则都要回答,` +
          `勾 ☐「不涉及」是合法答案,整条不写不是。` +
          `注意本清单是从 rules/enforced/constitution.md 动态读取的:若本 change 的 design 早已通过 L3 落章,` +
          `而这条原则是之后才进宪法的,那不是你漏填 —— 补上该行(通常是 ☐ 不涉及 + 判断依据),` +
          `并在 L9 终审时把「落章后改过 design」明示给人类重新确认,不要默认沿用原 approved_by`,
        sec.line,
      )
      continue
    }
    // 「有标记 + 说明非空」由通用的 L2/required-table 判(宪法对照表在 design 模板里已标注),
    // 这里只管宪法特有的两件事:每条原则都有行、⚠ 偏离要写够理由。
    const mark = row[1] ?? ''
    const note = row[2] ?? ''
    // 偏离是允许的,但必须付出「写清楚」的代价 —— 否则 ⚠ 会退化成绕过原则的快捷键
    if (/⚠/.test(mark) && !blank(note) && note.replace(/\s/g, '').length < 15) {
      err(
        'L2c/constitution-check',
        rel(c.design),
        `${id} 标为「⚠ 偏离」但理由只有 ${note.trim().length} 个字符。` +
          `偏离宪法必须写清:为什么必须偏离、代价是什么、是否要连带修订 rules/enforced/constitution.md ——` +
          `这一行正是 L3 人类审阅的重点`,
        sec.line,
      )
    }
  }
}

function checkDesign(c) {
  if (!existsSync(c.design)) return
  const fm = frontmatter(read(c.design))
  if (!fm) {
    err('L2c/frontmatter', rel(c.design), '缺少 frontmatter,无法记录 L3 审阅结论')
    return
  }
  const downstream = existsSync(c.tasks)
  const approved = fm.approved_by && fm.approved_at
  if (!approved) {
    const missing = [!fm.approved_by && 'approved_by', !fm.approved_at && 'approved_at']
      .filter(Boolean)
      .join(' / ')
    const msg = `frontmatter 缺 ${missing} —— L3 人类审阅未落章`
    downstream
      ? err('L3/design-approved', rel(c.design), `${msg}(tasks.md 已存在,不应先行下推)`)
      : warn('L3/design-approved', rel(c.design), msg)
  }
  if (fm.approved_at && !/^\d{4}-\d{2}-\d{2}$/.test(fm.approved_at)) {
    warn('L3/design-approved', rel(c.design), `approved_at 应为 YYYY-MM-DD,当前是「${fm.approved_at}」`)
  }
}

// ─────────────────────────── L2-d / L4 · tasks ↔ exec/plan ───────────────────────────

const TASK_LINE = /^\s*-\s*\[([ xX])\]\s*(\d+(?:\.\d+)+)\s+(.+)$/

function parseTasks(path) {
  const lines = stripComments(read(path))
  const tasks = []
  let inFence = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*```/.test(line)) inFence = !inFence
    if (inFence) continue
    const m = line.match(TASK_LINE)
    if (m) {
      tasks.push({ id: m[2], done: m[1].toLowerCase() === 'x', text: m[3].trim(), line: i + 1 })
      continue
    }
    // 引用块里的示例(如模板说明)不算任务
    if (/^\s*-\s*\[[ xX]\]/.test(line) && !/^\s*>/.test(line)) {
      tasks.push({ id: null, done: false, text: line.trim(), line: i + 1 })
    }
  }
  return tasks
}

/**
 * 「无变更 / 无需 / 不涉及」类空任务。
 *
 * 二次成本:`L4/task-mapped` 要求每条任务在 exec/plan.md 都有归宿 ——
 * 空任务同样要占一行映射,把真任务淹掉。
 *
 * 判 warn 不判 error:空任务不会导致静默失败,它只是噪音 —— 但噪音会把真任务淹掉。
 * 漏项防线由 proposal 的两张表(`L2/required-table`)承担,删空任务不降低覆盖。
 */
const EMPTY_TASK = /(无变更|无需(?:变更|新增|改动)?|不涉及|无新增|不适用|N\/A|暂不涉及)\s*[。.]?\s*$/i

/**
 * 判空前先剥掉 markdown 强调与反引号。
 * `类型定义:**无变更**` 结尾是 `**`,不剥掉就匹配不上 `$` 锚点 —— 而这是最常见的写法。
 */
const plainTask = (s) => s.replace(/[*`_~]/g, '').trim()

/** 流水线自身的闸门,已由机器管,不该写成任务 */
const GATE_TASK =
  /(未决歧义.*清零|explore\.md 已完成|补齐 ?`?(proposal|design|specs)|人类审阅 ?`?design|openspec-archive-change|openspec-sync-specs)/i

function checkTasks(c) {
  if (!existsSync(c.tasks)) return null
  const tasks = parseTasks(c.tasks)
  const seen = new Map()

  if (!isArchived(c)) {
    for (const t of tasks) {
      if (!t.id) continue
      const plain = plainTask(t.text)
      if (EMPTY_TASK.test(plain)) {
        warn(
          'L2d/empty-task',
          rel(c.tasks),
          `任务 ${t.id} 是「无变更」类空条目:${t.text.slice(0, 48)} —— ` +
            `本组不涉及就**整组删掉**,不要逐条写。漏项防线在 proposal 的两张勾选表(勾 ☐ 也要写依据),` +
            `tasks 的空条目是重复的第二道防线,而且每条还要在 exec/plan.md 占一行映射`,
          t.line,
        )
      } else if (GATE_TASK.test(plain)) {
        warn(
          'L2d/empty-task',
          rel(c.tasks),
          `任务 ${t.id} 写的是流水线自身的闸门:${t.text.slice(0, 40)} —— ` +
            `这些已由机器管(未决歧义→L0/ambiguity,design 审阅→L3/design-approved,` +
            `补齐各 artifact→状态机的 requires/generates),写成任务只是让 L4 多映射几条`,
          t.line,
        )
      }
    }
  }

  for (const t of tasks) {
    if (!t.id) {
      err(
        'L2d/task-id-format',
        rel(c.tasks),
        `任务行缺少 \`X.Y\` 编号,apply 阶段追踪不到:${t.text.slice(0, 60)}`,
        t.line,
      )
      continue
    }
    if (seen.has(t.id)) {
      err(
        'L2d/task-id-unique',
        rel(c.tasks),
        `任务编号 ${t.id} 重复(另一处在第 ${seen.get(t.id)} 行)—— 会让 exec/plan.md 的映射指错条目`,
        t.line,
      )
    } else {
      seen.set(t.id, t.line)
    }
  }
  return tasks.filter((t) => t.id)
}

/** 把 plan.md 里出现的条目引用展开成任务 id 集合 */
function coveredIds(planSectionText, allIds) {
  const set = new Set()

  // §N —— 整组引用,如「§6 测试覆盖」
  for (const m of planSectionText.matchAll(/§\s*(\d+)/g)) {
    for (const id of allIds) if (id.split('.')[0] === m[1]) set.add(id)
  }

  // 区间,如 0.1-0.4 / 4.3-4.6 / 5.3.1-5.3.4
  for (const m of planSectionText.matchAll(/(\d+(?:\.\d+)+)\s*[-–~至]\s*(\d+(?:\.\d+)+)/g)) {
    const a = m[1].split('.')
    const b = m[2].split('.')
    if (a.length === b.length && a.slice(0, -1).join('.') === b.slice(0, -1).join('.')) {
      const from = Number(a.at(-1))
      const to = Number(b.at(-1))
      const prefix = a.slice(0, -1).join('.')
      for (let n = Math.min(from, to); n <= Math.max(from, to); n++) {
        const base = `${prefix}.${n}`
        set.add(base)
        // 区间也覆盖其子条目,如 4.3-4.6 覆盖 4.3.1
        for (const id of allIds) if (id.startsWith(`${base}.`)) set.add(id)
      }
    }
    set.add(m[1])
    set.add(m[2])
  }

  // 单个 id
  for (const m of planSectionText.matchAll(/\b\d+(?:\.\d+)+\b/g)) {
    set.add(m[0])
    // 父条目被映射时,其子条目视为已覆盖
    for (const id of allIds) if (id.startsWith(`${m[0]}.`)) set.add(id)
  }

  return set
}

/**
 * 规则 1(02-handoff-contract.md):每条 tasks.md 条目必须有归宿 ——
 * 要么在「任务映射」表,要么在「未映射条目」表并写明原因。
 * 静默丢弃的条目在 L8 会被判为漏做,而这是"单一权威源"唯一的漏项防线。
 */
function checkPlanCoverage(c, tasks) {
  if (!existsSync(c.plan)) return
  const text = readClean(c.plan)
  const map = section(text, /^##\s+1\.\s*任务映射/)
  if (!map) {
    err('L4/mapping-section', rel(c.plan), '缺少「## 1. 任务映射」章节')
    return
  }
  if (!tasks || !tasks.length) return

  const allIds = tasks.map((t) => t.id)
  const covered = coveredIds(map.text, allIds)
  // 规则 1 允许「1 条 task 拆成 N 个执行单元」:plan 里若以更细的粒度
  // (5.3.1 / 5.3.2 …)引用了某条任务,该任务视为已映射。
  const refined = (id) => [...covered].some((ref) => ref.startsWith(`${id}.`))
  const missing = allIds.filter((id) => !covered.has(id) && !refined(id))

  for (const id of missing) {
    const t = tasks.find((x) => x.id === id)
    err(
      'L4/task-mapped',
      rel(c.plan),
      `tasks.md 的 ${id}「${t.text.slice(0, 40)}」既未映射到执行单元,也未列入「未映射条目」—— L8 会判为漏做`,
    )
  }

  // 未映射条目必须写原因
  const unmapped = section(text, /^###\s+未映射条目/)
  if (unmapped) {
    for (const row of dataRows(unmapped.text)) {
      if (row.length < 2) continue
      if (!blank(row[0]) && blank(row[1])) {
        err('L4/unmapped-needs-reason', rel(c.plan), `未映射条目「${row[0]}」没有写不执行的原因`)
      }
    }
  }

  // 规则 8:exec/ 不得回写需求侧
  const fm = frontmatter(text)
  if (fm && !fm.derived_from) {
    warn('L4/derived-from', rel(c.plan), 'frontmatter 缺 derived_from,单向派生关系未声明')
  }

  // 契约冻结表在进入实现前必须有锁定标记
  // 判据是「exec/notes 下有没有 .md 文件」,不是「目录存不存在」——
  // 写 plan.md 时顺手 mkdir 出来的空目录不是实现已开始的证据(2026-08-22 实测误报 4 条)。
  const notesDirPath = join(c.dir, 'exec/notes')
  const hasNotes =
    existsSync(notesDirPath) && readdirSync(notesDirPath).some((f) => f.endsWith('.md'))
  const freeze = section(text, /^##\s+4\.\s*契约冻结/)
  if (freeze && hasNotes) {
    const rows = dataRows(freeze.text).filter((r) => r.length >= 2 && !blank(r[0]))
    const unlocked = rows.filter((r) => /☐/.test(r.at(-1)))
    for (const r of unlocked) {
      err(
        'L4/contract-frozen',
        rel(c.plan),
        `契约「${r[0]}」未标记冻结,但实现已开始(exec/notes 已存在)—— 并行单元会各自猜签名`,
      )
    }
  }

  // Gate 清单:集成阶段开始后必须已逐条勾完
  const gate = section(text, /^##\s+Gate/)
  const marker = integrationMarker(c)
  if (gate && marker) {
    const open = gate.text.split('\n').filter((l) => /^\s*-\s*\[\s\]/.test(l))
    for (const l of open) {
      err(
        'L4/gate-checked',
        rel(c.plan),
        `L4 Gate 未勾:${l.replace(/^\s*-\s*\[\s\]\s*/, '').trim()}(${rel(marker)} 已存在)`,
      )
    }
  }
}

/**
 * 「集成阶段已开始」的落盘标记。
 *
 * 集成原本是独立 artifact(`exec/integration.md`),已并入 `exec/verify.md` ——
 * 单执行单元的 change 里它中位 6.9KB 全是凑数内容(4 单元的反而只有 2.3KB)。
 * 归档件仍带着旧文件,所以两者取其一:新 change 认 verify.md,旧归档认 integration.md。
 * 判定不能只认 verify.md —— 那会让 31 个归档件的 L4/L5 检查集体失效。
 */
function integrationMarker(c) {
  if (existsSync(c.integration)) return c.integration
  if (existsSync(c.verify)) return c.verify
  return null
}

// ─────────────────────────── 模板 · 宪法对照表与宪法同步 ───────────────────────────

/**
 * design 模板里的「宪法对照」表必须覆盖 `rules/enforced/constitution.md` 的全部 `### CP-N`。
 *
 * 为什么需要这条:`rules/enforced/constitution.md` **不在** OpenSpec 自动注入的三处
 * (config.yaml 的 context/rules、schema.yaml 的 instruction、templates/)之内 ——
 * 按本流水线的组织原则,写「详见 constitution.md」只是一句祈使句,不是一条依赖。
 * 让宪法真正生效的是**模板里那张表**:它被全文注入,agent 看得见每条原则的标题;
 * `L2c/constitution-check` 再逐条校验回答。
 *
 * 代价是出现了第二份 CP 清单(宪法一份、模板一份),而两份必然漂移 ——
 * 本条检查就是用来兜这个的:在宪法里加一条却忘了加进模板,立刻报错。
 * 顺序不要求一致,只要求覆盖。
 */
function checkConstitutionTemplate() {
  const principles = constitutionPrinciples()
  if (!principles.length) return
  const tpl = join(TEMPLATES_DIR, 'devops-workflow/templates/design.md')
  if (!existsSync(tpl)) return

  const sec = section(readClean(tpl), /^##\s+宪法对照/)
  if (!sec) {
    err(
      'TEMPLATE/constitution-rows',
      rel(tpl),
      'design 模板缺「## 宪法对照」表 —— 宪法不在自动注入的三处之内,' +
        '这张表是它唯一能被 agent 看见的途径',
    )
    return
  }
  const covered = dataRows(sec.text).map((r) => r[0] ?? '')
  for (const { id, title } of principles) {
    if (!covered.some((cell) => cell.includes(id))) {
      err(
        'TEMPLATE/constitution-rows',
        rel(tpl),
        `rules/enforced/constitution.md 有 ${id}(${title.slice(0, 24)}),但 design 模板的宪法对照表里没有这一行 —— ` +
          `两份清单已漂移。模板是宪法唯一被注入 prompt 的途径,漏一行等于这条原则对 agent 不存在`,
      )
    }
  }
  for (const cell of covered) {
    const m = cell.match(/CP-\d+/)
    if (m && !principles.some((p) => p.id === m[0])) {
      err(
        'TEMPLATE/constitution-rows',
        rel(tpl),
        `design 模板的宪法对照表有 ${m[0]},但 rules/enforced/constitution.md 里没有这条原则 —— ` +
          `原则被删/改名后模板没跟上,agent 会被要求回答一条不存在的原则`,
      )
    }
  }
}

// ─────────────────────────── 模板 · project-profile 同步 ───────────────────────────

/**
 * `openspec/rules/enforced/project.md` 里 `### <prefix>-N` 条目 → { id, title }。
 * `prefix` 取 `SL` / `WT` / `CC` / `PK` / `TG` / `DS` 之一。
 *
 * 与 `constitutionPrinciples()` 是同一种机制:项目结构事实(共享层清单、worktree 判据、
 * 横切关注点、影响的包、任务分组、design 必填章节)只在这里断言一次,不在每个 change 里
 * 重新调研。加一条 `<prefix>-N`,下一次校验就会要求对应模板槽也有这一行,不用改本文件。
 */
function profileItems(prefix) {
  const p = join(OPENSPEC_DIR, 'rules', 'enforced', 'project.md')
  if (!existsSync(p)) return []
  const out = []
  const re = new RegExp(`^###\\s+(${prefix}-\\d+)\\s*[·:：-]\\s*(.+)$`)
  for (const l of stripComments(read(p))) {
    const m = l.match(re)
    if (m) out.push({ id: m[1], title: m[2].trim() })
  }
  return out
}

/**
 * 六个槽里,`shared-layers` / `worktree-tradeoffs` / `crosscuts` / `project-structure`
 * 各有一个包在单个 `##`/`###` 标题下的表格;`task-groups` / `design-sections` 的内容跨了
 * 多个同级标题,没有单一外层标题可用,只能按槽标记本身取内容。两条定位路径最终都喂给
 * 同一个 `idCoverage()`——它只比较 ID 集合,不管内容是表格行还是标题文字。
 *
 * 为什么需要这条:`rules/enforced/project.md` **不在** OpenSpec 自动注入的三处之内 ——
 * 与 rules/enforced/constitution.md 同理,写「详见 project-profile.md」只是祈使句,不是依赖。
 * 让项目结构事实真正生效的是**模板里那几处**:它们被全文注入,agent 看得见每一行/每个标题;
 * 本函数保证两边 ID 集合不漂移(只比 ID,不比文字——文字可以各自措辞)。
 */
function idCoverage(tpl, text, items, prefix) {
  if (!items.length) return
  if (text == null) {
    err(
      'TEMPLATE/profile-rows',
      rel(tpl),
      `模板缺少对应内容 —— rules/enforced/project.md 的 ${items.length} 条 ${prefix}-N 条目无法被镜像到 prompt`,
    )
    return
  }
  const lines = text.split('\n')
  for (const { id, title } of items) {
    if (!lines.some((l) => l.includes(id))) {
      err(
        'TEMPLATE/profile-rows',
        rel(tpl),
        `rules/enforced/project.md 有 ${id}(${title.slice(0, 24)}),但模板里没有这一行 —— ` +
          `两份清单已漂移。模板是它唯一被注入 prompt 的途径,漏一行等于这条事实对 agent 不存在`,
      )
    }
  }
  const seen = new Set()
  for (const l of lines) {
    const m = l.match(new RegExp(`${prefix}-\\d+`))
    if (m && !seen.has(m[0])) {
      seen.add(m[0])
      if (!items.some((it) => it.id === m[0])) {
        err(
          'TEMPLATE/profile-rows',
          rel(tpl),
          `模板里有 ${m[0]},但 rules/enforced/project.md 里没有这一条 —— ` +
            `项目事实被删/改名后模板没跟上,agent 会被要求核对一条不存在的条目`,
        )
      }
    }
  }
}

/**
 * 取 `openspec:slot slotId` 标记之间的原始正文(跳过槽头的问题说明注释)。
 *
 * 六个槽全部包在各自的 `openspec:slot` 块里(包括 shared-layers / worktree-tradeoffs /
 * crosscuts / project-structure 这四个曾经改用标题定位的——验证过它们和 task-groups /
 * design-sections 一样是单一完整的槽块),按槽 ID 定位比按标题文字定位更稳:
 * 标题措辞被顺手改一下,标题定位会静默失效;槽标记是 `TEMPLATE/slot-malformed`
 * 已经在看护的稳定契约,不会。
 *
 * 与 `checkSlots()` 共用同一对标记正则(见 `SLOT_OPEN_RE` / `SLOT_CLOSE_RE`),
 * 但不共用状态机——`checkSlots()` 要为嵌套/未闭合/开闭不匹配给出具体错误,
 * 本函数只需要"假设已通过 slot-malformed 校验,取出目标槽的正文"这一件事,
 * 两者的状态机复杂度不对等,硬合并会让 `checkSlots()` 的错误分支变难读。
 */
function slotBody(tpl, slotId) {
  if (!existsSync(tpl)) return null
  const lines = read(tpl).split('\n')
  let collecting = false
  let inHeader = false
  const body = []
  for (const line of lines) {
    const o = line.match(SLOT_OPEN_RE)
    const c = line.match(SLOT_CLOSE_RE)
    if (o && o[1] === slotId) {
      collecting = true
      inHeader = !line.includes('-->')
      continue
    }
    if (collecting && inHeader) {
      if (line.includes('-->')) inHeader = false
      continue
    }
    if (c && c[1] === slotId) return collecting ? body.join('\n') : null
    if (collecting) body.push(line)
  }
  return collecting ? body.join('\n') : null
}

function checkProfileCoverageInSlot(tpl, slotId, items, prefix) {
  if (!items.length) return
  idCoverage(tpl, slotBody(tpl, slotId), items, prefix)
}

function checkProfileTemplate() {
  const T = (name) => join(TEMPLATES_DIR, 'devops-workflow/templates', name)
  checkProfileCoverageInSlot(T('explore.md'), 'shared-layers', profileItems('SL'), 'SL')
  checkProfileCoverageInSlot(T('exec-plan.md'), 'worktree-tradeoffs', profileItems('WT'), 'WT')
  checkProfileCoverageInSlot(T('proposal.md'), 'crosscuts', profileItems('CC'), 'CC')
  checkProfileCoverageInSlot(T('proposal.md'), 'project-structure', profileItems('PK'), 'PK')
  checkProfileCoverageInSlot(T('tasks.md'), 'task-groups', profileItems('TG'), 'TG')
  checkProfileCoverageInSlot(T('design.md'), 'design-sections', profileItems('DS'), 'DS')
}

// ─────────────────────────── L5 · 收尾笔记 ───────────────────────────

/**
 * 收尾笔记在 schema 里是硬要求,却不是 artifact —— 没有 generates 追踪,不写也没人知道。
 * 而 subagent 上下文一销毁,未落盘的实现知识永久丢失,集成恰恰需要它。
 */
function checkNotes(c) {
  const marker = integrationMarker(c)
  if (!marker) return
  const notesDir = join(c.dir, 'exec/notes')
  if (!existsSync(notesDir)) {
    err('L5/notes-required', rel(marker), 'exec/notes/ 不存在,但集成阶段已开始 —— 实现知识没有落盘')
    return
  }
  const notes = readdirSync(notesDir).filter((f) => f.endsWith('.md'))
  if (!notes.length) {
    err('L5/notes-required', rel(notesDir), 'exec/notes/ 为空,但集成阶段已开始')
    return
  }
  // plan.md 里声明的执行单元都应有对应笔记
  if (existsSync(c.plan)) {
    const planText = read(c.plan)
    const units = new Set()
    const map = section(planText, /^##\s+1\.\s*任务映射/)
    if (map) for (const m of map.text.matchAll(/`(E\d+)`/g)) units.add(m[1])
    // 单 worktree 串行时,plan.md 第 8 节允许把笔记「按层合并落盘」(逐单元分节),
    // 文件名形如 `E2-E6-grid-fallback.md`。因此文件名前缀里的 `Ea-Eb` 视为**闭区间**,
    // 覆盖 Ea..Eb 全部单元;单个 `E10-xxx.md` 只覆盖 E10。
    // 否则 11 个单元 / 4 份合并笔记会误报 7 条(2026-08-22 实测)。
    const covered = new Set()
    for (const f of notes) {
      const m = f.toUpperCase().match(/^((?:E\d+[-.])+)/)
      if (!m) continue
      const ids = [...m[1].matchAll(/E(\d+)/g)].map((x) => Number(x[1]))
      if (ids.length === 2 && ids[0] < ids[1]) {
        for (let i = ids[0]; i <= ids[1]; i += 1) covered.add(`E${i}`)
      } else {
        for (const n of ids) covered.add(`E${n}`)
      }
    }
    for (const u of units) {
      if (!covered.has(u)) {
        warn('L5/note-per-unit', rel(notesDir), `执行单元 ${u} 没有对应的收尾笔记`)
      }
    }
  }
}

// ─────────────────────────── L7 · 硬闸门证据 ───────────────────────────

/**
 * 硬闸门要留几份日志,由 `project.json` 的 `commands` 决定 —— 键名即日志名。
 * 写死成 build/test/lint 会让「加一条 typecheck 命令」这件事无声无息:
 * 命令加了、日志没人要求,闸门就漏了一项。缺配置时退回三件套(不猜,但也不静默放行)。
 */
const EVIDENCE = Object.keys(PROJECT.commands ?? {}).map((k) => `${k}.log`)
const EVIDENCE_CMD = (name) => PROJECT.commands?.[name.replace(/\.log$/, '')] ?? name

/**
 * L7 是唯一验证「代码能不能跑」的一层,但它连 artifact 都不是,
 * verify.md 可以在完全没有日志的情况下生成。这里补上存在性 + 新鲜度。
 */
function checkEvidence(c) {
  if (!existsSync(c.verify)) return
  const dir = join(c.dir, 'exec/evidence')

  for (const name of EVIDENCE) {
    const p = join(dir, name)
    if (!existsSync(p)) {
      err(
        'L7/evidence-missing',
        rel(c.verify),
        `exec/evidence/${name} 不存在,但 verify.md 已生成 —— 跑 \`${EVIDENCE_CMD(name)}\` 并把输出留到这里`,
      )
      continue
    }
    if (statSync(p).size === 0) {
      err('L7/evidence-missing', rel(p), '证据日志为空文件')
    }
  }

  // 新鲜度:证据必须晚于它所证明的代码。
  //
  // ⚠️ 归档件不判。这条比的是「日志 vs `packages/` 的**最新** commit」——
  // 一个 change 归档之后,任何后续代码提交都会让它的日志变「陈旧」,
  // 于是 100% 的归档件必然报错,且只会越攒越多。
  // 「证据能否证明当前代码能跑」对已结案的 change 本就不成立:那些日志是历史记录,
  // 它们**应该**是旧的。存在性与非空仍然要查 —— 那两条对归档件依然有意义。
  if (isArchived(c)) return

  // 源码位置来自 project.json 的 sourcePaths —— 没配就跳过这条(不猜)。
  const srcPaths = PROJECT.sourcePaths ?? []
  if (!srcPaths.length) return

  let srcTs = 0
  for (const sp of srcPaths) {
    srcTs = Math.max(srcTs, lastCommitTs(sp))
    for (const f of dirtyFiles(sp)) srcTs = Math.max(srcTs, mtime(join(ROOT, f)))
  }
  if (!srcTs) return

  const label = srcPaths.join(' / ')
  for (const name of EVIDENCE) {
    const p = join(dir, name)
    if (!existsSync(p)) continue
    const logTs = effectiveTs(p)
    if (logTs && logTs < srcTs) {
      const gapMin = Math.round((srcTs - logTs) / 60000)
      err(
        'L7/evidence-fresh',
        rel(p),
        `证据日志比 ${label} 的最后一次改动早 ${gapMin} 分钟 —— 是旧日志,不能证明当前代码能跑`,
      )
    }
  }
}

// ─────────────────────────── L8 · 需求 ↔ 任务 覆盖率 ───────────────────────────

/** 任务行里的需求引用:`FR-003` 或跨能力限定的 `biz-ledger-form-table/FR-003` */
const TASK_REQ_REF = /(?:([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\/)?\b(FR-\d{3})\b/g

/** 实现类分组(见 tasks 模板的固定分组顺序)—— 只有这几组该落到需求上 */
const IMPL_GROUP = /共享契约层|数据层|后端|前端/

/** 把每条任务归到它上方最近的 `## N. 分组名` */
function taskGroups(path, tasks) {
  const lines = stripComments(read(path))
  const heads = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+)$/)
    if (m) heads.push({ line: i + 1, title: m[1].trim() })
  }
  const groupOf = (taskLine) => {
    let cur = null
    for (const h of heads) {
      if (h.line < taskLine) cur = h
      else break
    }
    return cur?.title ?? null
  }
  const out = new Map()
  for (const t of tasks) {
    const g = groupOf(t.line)
    if (!g) continue
    if (!out.has(g)) out.set(g, [])
    out.get(g).push(t)
  }
  return out
}

/**
 * 每条 delta 需求都必须被至少一条任务显式引用(按 ID,不按标题)。
 *
 * 这是 L8「tasks.md 逐条核对」的机械化下半段。此前 L4/task-mapped 只保证
 * 「每条任务都有执行单元归宿」—— 那是 tasks → exec 方向;反方向
 * 「每条需求都有任务实现」全靠 agent 在 verify 阶段自己读一遍,漏了没人知道。
 * 需求有了稳定 ID 之后,这一段就可以由机器来算。
 *
 * 只判正向为 error:「需求没有任务」是确凿的漏做。反向(任务不指向任何需求)
 * 按**分组**报 warn —— 逐条报会在中位数 41 条任务的清单上刷出几十条噪音,
 * 而一条被忽略的检查等于没有这条检查。
 */
function checkRequirementCoverage(c, tasks) {
  if (isArchived(c) || !tasks?.length || !c.specDirs.length) return
  if (!existsSync(c.tasks)) return

  // 能力 → 本次 delta 里需要被实现的需求(RENAMED 是纯规格操作,不要求任务)
  const wanted = [] // { cap, id, op, name, line, file }
  const idToCaps = new Map()
  for (const cap of c.specDirs) {
    const f = join(c.dir, 'specs', cap, 'spec.md')
    if (!existsSync(f)) continue
    for (const o of deltaOpsOf(f).ops) {
      if (!o.id || o.op === 'RENAMED') continue
      wanted.push({ cap, ...o, file: f })
      if (!idToCaps.has(o.id)) idToCaps.set(o.id, new Set())
      idToCaps.get(o.id).add(cap)
    }
  }
  if (!wanted.length) return

  // 任务侧的引用集合
  const qualified = new Set() // "cap/FR-003"
  const bare = new Set() // "FR-003"
  const refsByTask = new Map()
  for (const t of tasks) {
    const refs = [...t.text.matchAll(TASK_REQ_REF)].map(([, cap, id]) => ({ cap: cap ?? null, id }))
    refsByTask.set(t.id, refs)
    for (const r of refs) {
      if (r.cap) qualified.add(`${r.cap}/${r.id}`)
      else bare.add(r.id)
    }
  }

  // 裸引用在本 change 涉及多个能力且该 ID 撞号时无法判定指向谁
  for (const t of tasks) {
    for (const r of refsByTask.get(t.id) ?? []) {
      if (r.cap) continue
      const caps = idToCaps.get(r.id)
      if (caps && caps.size > 1) {
        err(
          'L8/requirement-coverage',
          rel(c.tasks),
          `任务 ${t.id} 引用的 ${r.id} 在本 change 的 ${[...caps].join(' / ')} 里都存在,` +
            `无法判定指向哪个能力 —— 请写成 \`<能力名>/${r.id}\``,
          t.line,
        )
      }
    }
  }

  // 正向:需求 → 任务
  for (const w of wanted) {
    const covered = qualified.has(`${w.cap}/${w.id}`) || bare.has(w.id)
    if (covered) continue
    err(
      'L8/requirement-coverage',
      rel(w.file),
      `${w.op} 的 ${w.id}「${w.name.slice(0, 32)}…」没有任何 tasks.md 条目引用它 —— ` +
        `要么补一条任务并在描述里写上 ${w.id}(或 \`${w.cap}/${w.id}\`),` +
        `要么这条需求本次不该改,从 delta 里去掉`,
      w.line,
    )
  }

  // 反向:引用了本 change 与主 spec 都不存在的 ID,多半是笔误
  const knownIds = new Set(wanted.map((w) => w.id))
  for (const cap of c.specDirs) for (const id of mainSpecReqIds(cap).keys()) knownIds.add(id)
  for (const t of tasks) {
    for (const r of refsByTask.get(t.id) ?? []) {
      if (!knownIds.has(r.id)) {
        warn(
          'L8/requirement-coverage',
          rel(c.tasks),
          `任务 ${t.id} 引用的 ${r.id} 在本 change 的 delta 与相关主 spec 里都不存在 —— 请核对编号`,
          t.line,
        )
      }
    }
  }

  // 反向(分组粒度):整组实现任务一条需求都不指,说明这组要么不该在这里,要么规格漏了
  for (const [title, group] of taskGroups(c.tasks, tasks)) {
    if (!IMPL_GROUP.test(title)) continue
    const any = group.some((t) => (refsByTask.get(t.id) ?? []).length > 0)
    if (!any && group.length) {
      warn(
        'L8/requirement-coverage',
        rel(c.tasks),
        `实现分组「${title}」的 ${group.length} 条任务没有任何一条引用需求 ID —— ` +
          `这组要么在实现规格之外的东西,要么对应的需求没写进 delta spec`,
        group[0].line,
      )
    }
  }
}

// ─────────────────────────── L8 · verify 结论 ───────────────────────────

/**
 * 归属判定是本流程最关键的一步:不允许默认改文档去迁就代码。
 * 结论必须落成可识别的文本,否则 L8 只是一篇读后感。
 */
function checkVerify(c) {
  if (!existsSync(c.verify)) return
  const text = readClean(c.verify)
  if (!/(通过|打回实现|打回设计)/.test(text)) {
    err(
      'L8/verdict-line',
      rel(c.verify),
      '找不到结论(通过 / 打回实现 / 打回设计)—— 归属判定没有落成可识别的结论',
    )
  }
  if (!/越界/.test(text)) {
    warn('L8/overreach-section', rel(c.verify), '没有提到越界检查 —— 未申报的越界是 L8 唯一的红线')
  }
}

// ─────────────────────────── 模板 · 抽离槽的完整性 ───────────────────────────

const TEMPLATES_DIR = join(OPENSPEC_DIR, 'schemas')

/** `openspec:slot` 开始/结束标记 —— `checkSlots()` 与 `slotBody()` 共用同一对正则,别处不要再抄一遍。 */
const SLOT_OPEN_RE = /<!--\s*openspec:slot\s+([a-z0-9-]+)/
const SLOT_CLOSE_RE = /<!--\s*\/openspec:slot\s+([a-z0-9-]+)\s*-->/

/**
 * `openspec:slot` 标记圈出的是**项目特定内容**:换项目时整槽重写,槽外原样带走。
 * 这里只校验机械可判定的三件事 —— 标记成对、不嵌套、槽内非空。
 * 槽内容**对不对**校验不了(共享层清单是否列全,只有懂这个项目的人能判断),
 * 那正是它不该被做成结构化 schema 的原因。
 */
function checkSlots() {
  if (!existsSync(TEMPLATES_DIR)) return
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('.md')) files.push(p)
    }
  }
  walk(TEMPLATES_DIR)

  for (const f of files) {
    const lines = read(f).split('\n')
    let open = null
    for (let i = 0; i < lines.length; i++) {
      const o = lines[i].match(SLOT_OPEN_RE)
      const c = lines[i].match(SLOT_CLOSE_RE)
      if (o) {
        if (open) {
          err('TEMPLATE/slot-malformed', rel(f), `槽 ${o[1]} 嵌套在 ${open.id} 内 —— 槽必须平级`, i + 1)
        }
        // 槽头注释(问 / 为什么问 / 答案要求)不算槽内容,否则空槽永远检测不出来
        open = { id: o[1], line: i + 1, body: [], inHeader: !lines[i].includes('-->') }
        continue
      }
      if (open?.inHeader) {
        if (lines[i].includes('-->')) open.inHeader = false
        continue
      }
      if (c) {
        if (!open) {
          err('TEMPLATE/slot-malformed', rel(f), `槽 ${c[1]} 有结束标记但没有开始标记`, i + 1)
        } else {
          if (open.id !== c[1]) {
            err('TEMPLATE/slot-malformed', rel(f), `槽 ${open.id} 的结束标记写成了 ${c[1]}`, i + 1)
          }
          if (!open.body.join('').trim()) {
            err('TEMPLATE/slot-malformed', rel(f), `槽 ${open.id} 是空的 —— 项目必须填写本槽`, open.line)
          }
          open = null
        }
        continue
      }
      if (open && !/^\s*(<!--|-->)/.test(lines[i])) open.body.push(lines[i])
    }
    if (open) {
      err('TEMPLATE/slot-malformed', rel(f), `槽 ${open.id} 没有结束标记`, open.line)
    }
  }
}

// ─────────────────────────── L10 · 归档保真度 ───────────────────────────

/**
 * delta 操作解析(与 openspec 原生 parseDeltaSpec 同口径,只取需求名)。
 * 注释已在调用处剥离,这里只按标题层级切段。
 */
/**
 * delta 操作视图 —— 从统一解析结果里投影出来,不再自己扫一遍。
 *
 * 需求名一律去掉 `[FR-NNN] ` 前缀后再比对:主 spec 已回填 ID 而归档件没有,
 * 不归一化会让全部归档件被误判为漂移。
 */
function deltaOpsOf(path) {
  const spec = loadSpec(path)
  const out = { added: [], modified: [], removed: [], renamed: [], renamedRaw: spec.renamedRaw, ops: [] }
  for (const r of spec.requirements) {
    if (!r.op || r.depth !== 3) continue
    out.ops.push({ op: r.op, id: r.id, name: r.name, line: r.line })
    if (r.op === 'ADDED') out.added.push(r.name)
    else if (r.op === 'MODIFIED') out.modified.push(r.name)
    else if (r.op === 'REMOVED') out.removed.push(r.name)
  }
  for (const rn of spec.renamed) {
    out.renamed.push({ from: rn.from, to: rn.to })
    out.ops.push({ op: 'RENAMED', id: rn.id, name: rn.from, line: rn.line })
  }
  return out
}

/** 某个 spec 文件里的需求名(已去掉 [FR-NNN] 前缀) */
const requirementNamesOf = (path) => reqsOf(path).map((r) => r.name)

/**
 * 按归档顺序重放全部 delta,推演每个能力「应有的需求名集合」,再与主 spec 对账。
 *
 * 为什么需要:主 spec 的合并由谁执行取决于归档路径 —— `openspec archive` 是确定性合并
 * (逐字复制 ADDED、MODIFIED 找不到就 throw),而 `openspec-archive-change` skill 走的是
 * agent 手写合并 + agent 自查。后者会漂(整条需求丢失、需求名被改写、标题里的数字被改),
 * 且不留痕迹 —— 主 spec 事后看完全合法,`openspec validate` 也全绿。
 *
 * 这条检查与走哪条路径无关 —— 官方 skill 怎么改都兜得住,因此不放在 skill 里而放在这里。
 * 后续 change 的 REMOVED / RENAMED 是合法演进,必须计入重放,否则会把正常演进误判成漂移。
 */
function checkArchiveFidelity() {
  const archiveDir = join(CHANGES_DIR, 'archive')
  if (!existsSync(archiveDir)) return

  const expected = new Map() // cap -> Set(需求名)
  const seenIn = new Map() // cap -> [change...]

  // 排序:先按目录名的 YYYY-MM-DD 前缀,同日再按「首次进版本库的时间」。
  // 只按目录名字典序会排错:同一天归档多个 change 时,字典序与真实先后无关 ——
  // 顺序一颠倒,后归档件 ADDED 的需求就会被先归档件的 MODIFIED 误判成「从未声明过」。
  const ordered = readdirSync(archiveDir)
    .filter((n) => statSync(join(archiveDir, n)).isDirectory())
    .map((n) => {
      const day = (n.match(/^\d{4}-\d{2}-\d{2}/) ?? [''])[0]
      // 未提交的归档目录没有 commit 时间,用 mtime 兜底(它们必然是最新的)
      const ts = firstCommitTs(rel(join(archiveDir, n))) || mtime(join(archiveDir, n))
      return { n, day, ts }
    })
    .sort((a, b) => a.day.localeCompare(b.day) || a.ts - b.ts || a.n.localeCompare(b.n))
    .map((x) => x.n)

  for (const cd of ordered) {
    const specsRoot = join(archiveDir, cd, 'specs')
    if (!existsSync(specsRoot) || !statSync(specsRoot).isDirectory()) continue
    const changeName = cd.replace(/^\d{4}-\d{2}-\d{2}-/, '')

    for (const cap of readdirSync(specsRoot)) {
      const f = join(specsRoot, cap, 'spec.md')
      if (!existsSync(f)) continue
      if (KNOWN_ARCHIVE_DRIFT.has(cap)) continue
      if (!expected.has(cap)) {
        expected.set(cap, new Set())
        seenIn.set(cap, [])
      }
      seenIn.get(cap).push(changeName)
      const set = expected.get(cap)
      const d = deltaOpsOf(f)

      // RENAMED 格式本身由 `L10/renamed-format` 在 checkSpecFile() 里判 ——
      // 那里对活跃 change 也跑,能在归档**之前**拦住;这里只用解析结果推演需求名的演变。

      // 顺序:RENAMED 必须先于 MODIFIED。原生的规则是「存在 rename 时 MODIFIED 必须引用**新**标题」,
      // 先判 MODIFIED 就会把写法完全正确的 delta 误判成「引用了从未声明过的名字」。
      for (const { from, to } of d.renamed) {
        if (from && !set.has(from)) {
          err('L10/delta-target-missing', rel(f), `RENAMED FROM「${from}」此前从未声明过这个需求名`)
        }
        if (from) set.delete(from)
        if (to) set.add(to)
      }
      for (const n of d.added) set.add(n)
      // MODIFIED / REMOVED 指向不存在的需求名,原生会直接 throw
      // (specs-apply.js: "MODIFIED failed … - not found")。skill 路径会放行,
      // 常见形态是「把重命名写成了 MODIFIED」—— 主 spec 里的需求名会被悄悄换掉。
      for (const n of d.modified) {
        if (!set.has(n)) {
          err(
            'L10/delta-target-missing',
            rel(f),
            `MODIFIED 指向「${n}」,但该能力此前从未声明过这个需求名 —— ` +
              `\`openspec archive\` 会直接拒绝(MODIFIED failed - not found)。` +
              `若本意是改名,要用格式合规的 RENAMED 段声明(见 L10/renamed-format);` +
              `否则请对齐 ADDED 时的原名`,
          )
          set.add(n)
        }
      }
      for (const n of d.removed) {
        if (!set.has(n)) {
          err(
            'L10/delta-target-missing',
            rel(f),
            `REMOVED 指向「${n}」,但该能力此前从未声明过这个需求名`,
          )
        }
        set.delete(n)
      }
    }
  }

  for (const [cap, exp] of expected) {
    if (KNOWN_ARCHIVE_DRIFT.has(cap)) continue
    const p = join(SPECS_DIR, cap, 'spec.md')
    const via = `经手 ${seenIn.get(cap).join(' → ')}`

    if (!existsSync(p)) {
      if (exp.size) {
        err(
          'L10/archive-fidelity',
          rel(join(SPECS_DIR, cap)),
          `重放 delta 推演出 ${exp.size} 条需求,但主 spec 不存在 —— 归档时没有落库,或被后续误删(${via})`,
        )
      }
      continue
    }

    const actual = new Set(requirementNamesOf(p))
    for (const n of exp) {
      if (actual.has(n)) continue
      err(
        'L10/archive-fidelity',
        rel(p),
        `delta 声明过需求「${n}」,但主 spec 里没有 —— 归档合并把它丢了或改写了(${via})`,
      )
    }
    for (const n of actual) {
      if (exp.has(n)) continue
      err(
        'L10/archive-fidelity',
        rel(p),
        `主 spec 有需求「${n}」,但没有任何 delta 声明过它 —— ` +
          `要么是归档合并擅自改写/杜撰,要么是绕过 change 直接手改了主 spec(${via})`,
      )
    }
  }
}

// ─────────────────────────── META · 检查清单自解释 ───────────────────────────

/** 本文件与插件里实际出现过的检查 ID */
function emittedCheckIds() {
  const ids = new Set()
  const files = [join(OPENSPEC_DIR, 'check.mjs')]
  const guardsDir = join(OPENSPEC_DIR, 'guards')
  if (existsSync(guardsDir)) {
    for (const f of readdirSync(guardsDir)) if (f.endsWith('.mjs')) files.push(join(guardsDir, f))
  }
  for (const f of files) {
    for (const m of read(f).matchAll(/'((?:L\d*[a-z]?|REPO|TEMPLATE|META)\/[a-z0-9-]+)'/g)) {
      ids.add(m[1])
    }
  }
  return ids
}

/**
 * 每条检查都必须在 CHECK_DOC 里写明它守护什么失效模式。
 * 这条 meta 检查是「检查清单不会漂移」的唯一保证 —— 加检查忘了写说明,直接报错。
 */
function checkDocs() {
  const emitted = emittedCheckIds()
  for (const id of emitted) {
    if (id === 'META/check-undocumented') continue
    if (!CHECK_DOC[id]) {
      err(
        'META/check-undocumented',
        'openspec/check.mjs',
        `检查 ${id} 没有写进 CHECK_DOC —— 请补一行「它守护什么失效模式」。` +
          `说不清用途的检查,下次挡路时就会被删掉,而它可能正是唯一拦得住某个静默失败的那条`,
      )
    }
  }
  for (const id of Object.keys(CHECK_DOC)) {
    if (!emitted.has(id)) {
      warn(
        'META/check-undocumented',
        'openspec/check.mjs',
        `CHECK_DOC 里的 ${id} 已经没有对应的检查了 —— 检查删了但说明留着,清单开始失真`,
      )
    }
  }
}

const CHECK_MANUAL = join(OPENSPEC_DIR, 'design/check.md')

/**
 * `design/check.md` 是**手写**的说明书,没有「同源生成」保护 ——
 * 它描述的机制变了而它没改,就会变成一份看起来权威的假说明。
 *
 * 但**不是所有内容都值得机械看守**:`design/README.md` §4 里有明令 ——
 * 手抄检查 ID 全集的那份清单已经因为漂移被删除过一次,不要再加回来。
 * 所以这条检查刻意**只看三样能机械判定、且加了会静默失效的结构性事实**:
 *
 *   1. CLI flag —— 加了个 flag 没写进说明书,使用者根本不知道它存在
 *   2. project.json 顶层字段 —— 加了个字段没写语义,下一个人只能去读 2000+ 行代码
 *   3. guards/ 插件文件 —— 增删插件而说明书里的插件表不动,那张表就开始撒谎
 *
 * 检查 ID 全集**不在此列**,它归 CHECK_DOC / `--explain` 管(见 META/check-undocumented)。
 * 说明书里其余部分(编排顺序、ctx 字段、棘轮语义)没有守卫,靠说明书自己的 §11 唤起。
 */
function checkDocSync() {
  if (!existsSync(CHECK_MANUAL)) {
    err('META/check-doc-stale', rel(CHECK_MANUAL), '说明书不存在 —— check.mjs 的机制没有任何文档描述')
    return
  }
  const doc = read(CHECK_MANUAL)
  const miss = (what, name, hint) =>
    err('META/check-doc-stale', rel(CHECK_MANUAL), `${what} \`${name}\` 没有写进说明书 —— ${hint}`)

  // 1. CLI flag:以 check.mjs 里 OPT 的解析式为准。
  //    ⚠️ 这里不能在注释里写出那个解析式的字面样子 —— 本检查按源码文本匹配,
  //    会把示例文字本身数成一个叫 `--x` 的 flag(实测踩过)。同族坑见 rules/advisory/pitfalls.md「跨层 · 通用」。
  for (const m of read(join(OPENSPEC_DIR, 'check.mjs')).matchAll(/argv\.includes\('(--[a-z-]+)'\)/g)) {
    if (!doc.includes(m[1])) miss('CLI flag', m[1], '使用者不会知道它存在,§3 补一行')
  }

  // 2. project.json 顶层字段(`$` 开头与 `-note` 结尾是给人读的注释键,不算字段)
  for (const key of Object.keys(PROJECT)) {
    if (key.startsWith('$') || key.endsWith('-note')) continue
    if (!doc.includes(key)) miss('project.json 字段', key, '语义只剩代码里有,§5 补一节')
  }

  // 3. guards/ 插件:双向 —— 加了没写会漏,删了没删说明书那张表就开始撒谎
  const guardsDir = join(OPENSPEC_DIR, 'guards')
  const plugins = existsSync(guardsDir) ? readdirSync(guardsDir).filter((f) => f.endsWith('.mjs')) : []
  for (const f of plugins) {
    if (!doc.includes(f)) miss('检查插件', f, '§6 的插件表补一行')
  }
  // 反向匹配只认「裸文件名」与「guards/ 前缀」两种写法。
  // 不能用光秃秃的 `([a-z0-9-]+\.mjs)`:说明书里也会提到 `guards/` 之外的脚本,
  // 那种提及会被误判成「插件删了说明书还留着」—— 而修法是删掉一句正确的说明,
  // 恰好是最坏的结果。
  for (const m of doc.matchAll(/(?:^|[^\w./-])(?:\.?\/?guards\/)?([a-z0-9-]+\.mjs)/g)) {
    if (m[1] !== 'check.mjs' && !plugins.includes(m[1])) {
      err(
        'META/check-doc-stale',
        rel(CHECK_MANUAL),
        `说明书提到插件 \`${m[1]}\`,但 openspec/guards/ 下没有它 —— 插件删了说明书还留着`,
      )
    }
  }
}

/**
 * `--inventory`:存量盘点。
 *
 * 为什么单独一个入口:这几类存量**故意不在日常检查里报** ——
 * 主 spec 里 200 多条老写法标题、245 条需求一条判据都没有、棘轮离目标还差 61 处,
 * 天天报就是天天被忽略,而忽略久了检查本身也会被关掉。
 * 但「不报」不等于「不存在」—— 缺一个能一次看清欠了多少的地方,债就永远是隐形的。
 */
async function inventory() {
  console.log('\nopenspec 存量盘点 —— 日常检查刻意不报的那些债\n')

  // ① 主 spec 里「标题即整句 MUST」的老写法
  const caps = [...mainSpecCaps()].sort()
  const oldStyle = []
  let totalReq = 0
  for (const cap of caps) {
    if (mainSpec(cap).fm?.status === 'superseded') continue // 已退役的不用再改写法
    const reqs = reqsOf(join(SPECS_DIR, cap, 'spec.md'))
    totalReq += reqs.length
    const n = reqs.filter((r) => /MUST|SHALL|必须/.test(r.name) || [...r.name].length > 40).length
    if (n) oldStyle.push([cap, n])
  }
  const oldTotal = oldStyle.reduce((s, [, n]) => s + n, 0)
  console.log(`── 需求标题写法 ${'─'.repeat(46)}`)
  console.log(`  ${oldTotal} / ${totalReq} 条是「标题即整句 MUST」的老写法(涉及 ${oldStyle.length} 个能力)`)
  console.log(`  改法见 templates/spec.md;MODIFIED 时顺带改,ID 不变所以链不断`)
  for (const [cap, n] of oldStyle.sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${String(n).padStart(3)}  ${cap}`)
  }
  if (oldStyle.length > 8) console.log(`    …… 另有 ${oldStyle.length - 8} 个能力`)
  console.log('')

  // ② 场景缺「判据」
  let scen = 0
  let noCrit = 0
  for (const cap of caps) {
    for (const r of mainSpec(cap).requirements) {
      for (const sc of r.scenarios) {
        if (sc.depth !== 4) continue
        scen += 1
        if (!sc.hasCriterion) noCrit += 1
      }
    }
  }
  console.log(`── 场景判据 ${'─'.repeat(52)}`)
  console.log(`  ${noCrit} / ${scen} 个场景没有 \`- **判据**:\` 行`)
  console.log(`  判据是 L8 逐条核对的抓手:THEN 说「应该怎样」,判据说「怎么验」`)
  console.log('')

  // ③ 已退役能力
  const retired = [...supersededCaps()].sort()
  console.log(`── 能力状态 ${'─'.repeat(52)}`)
  console.log(`  ${caps.length} 个能力,其中 ${retired.length} 个已 superseded`)
  for (const cap of retired) {
    const fm = frontmatter(read(join(SPECS_DIR, cap, 'spec.md')))
    console.log(`    ${cap} → ${fm?.superseded_by ?? '?'}`)
  }
  console.log('')

  // ④ 项目级插件的盘点(棘轮进度与退役计划)
  const ctx = pluginContext()
  for (const { mod } of await loadPlugins()) {
    if (typeof mod?.inventory !== 'function') continue
    const lines = mod.inventory(ctx)
    if (!lines?.length) continue
    console.log(`── 存量棘轮 ${'─'.repeat(52)}`)
    for (const l of lines) console.log(`  ${l}`)
  }

  console.log('这些都不进日常检查 —— 天天报等于天天被忽略。要看进度就跑本命令。')
}

/** `--explain`:按层打印全部检查及其守护的失效模式 */
function explain() {
  const emitted = emittedCheckIds()
  const groups = new Map()
  for (const [id, doc] of Object.entries(CHECK_DOC)) {
    const g = id.split('/')[0]
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push([id, doc, emitted.has(id)])
  }
  const order = ['L0', 'L2', 'L2a', 'L2b', 'L2c', 'L2d', 'L3', 'L4', 'L5', 'L7', 'L8', 'L10', 'TEMPLATE', 'META', 'REPO']
  const keys = [...groups.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b))

  console.log('\nopenspec 检查清单 —— 每条守护的失效模式\n')
  console.log('判据只有一条:**出错时会不会不报错**。防静默失败的留,防「写得糙」的降 warn 或不做。\n')
  let n = 0
  for (const g of keys) {
    console.log(`── ${g} ${'─'.repeat(Math.max(0, 60 - g.length))}`)
    for (const [id, doc, live] of groups.get(g)) {
      console.log(`  ${live ? ' ' : '!'} ${id.padEnd(34)} ${doc}`)
      n += 1
    }
    console.log('')
  }
  console.log(`共 ${n} 条(前缀 ! = CHECK_DOC 有记录但代码里已无对应检查)`)
  console.log('\n判定口径见各 artifact 的 instruction 与模板;流程说明见 openspec/design/README.md')
}

// ─────────────────────────── 项目级检查(插件) ───────────────────────────

/** 传给插件的上下文。刻意只暴露只读能力 + 两个报告函数,插件不能改变编排。 */
function pluginContext() {
  return { ROOT, project: PROJECT, join, existsSync, statSync, read, rel, err, warn, git, lastCommitTs, dirtyFiles, mtime }
}

/**
 * 加载 project.json 里声明的项目级检查。
 *
 * 通用检查(L0~L8,共 34 项)校验的是 openspec 文档自身的结构,与宿主语言无关;
 * 而「序号型资源长什么样」「哪些文件是注册表」这类判断是项目事实 —— 判定**方法**写在模板的槽里,
 * 判定**代码**放这里。换项目时,通用部分原样带走,只换 guards/ 与 project.json。
 */
async function runProjectChecks() {
  const ctx = pluginContext()
  for (const { mod, abs } of await loadPlugins({ report: true })) {
    if (typeof mod?.run !== 'function') {
      err('REPO/plugin-error', rel(abs), '未 default export `{ id, run(ctx) }`')
      continue
    }
    try {
      mod.run(ctx)
    } catch (e) {
      err('REPO/plugin-error', rel(abs), `检查 ${mod.id ?? '?'} 抛异常:${e.message}`)
    }
  }
}

/**
 * 加载 `project.json` 声明的插件。三个调用方(`run` / `inventory` / `--hook` 的 watches)
 * 各自 import 一遍是同一份 Node 模块缓存,不重复执行。
 *
 * `report: true` 才报 `REPO/plugin-error` —— `--inventory` 与 `--hook` 只是取信息,
 * 让它们也报会在两条独立路径上重复同一个错误。
 */
async function loadPlugins({ report = false } = {}) {
  const out = []
  for (const spec of PROJECT.checks ?? []) {
    const abs = spec.startsWith('.') ? join(OPENSPEC_DIR, spec) : spec
    if (spec.startsWith('.') && !existsSync(abs)) {
      if (report) err('REPO/plugin-error', rel(abs), `project.json 声明了检查 ${spec},但文件不存在`)
      continue
    }
    try {
      out.push({ mod: (await import(pathToFileURL(abs).href)).default, abs })
    } catch (e) {
      if (report) err('REPO/plugin-error', rel(abs), `加载失败:${e.message}`)
    }
  }
  return out
}

/**
 * `--hook` 除 openspec 目录外还要关注哪些路径 —— **由插件自己声明**(可选的 `watches: []`)。
 *
 * 曾经这里写死着 `packages/server/drizzle/meta/_journal.json`:那是 drizzle 插件的关注点,
 * 却长在与宿主项目无关的通用核心里。换项目时它既不在 project.json 也不在 guards/,grep 不到。
 */
async function pluginWatches() {
  const out = []
  for (const { mod } of await loadPlugins()) {
    for (const w of mod?.watches ?? []) out.push(w)
  }
  return out
}

// ─────────────────────────── 编排 ───────────────────────────

function collectChanges() {
  if (!existsSync(CHANGES_DIR)) return []
  const dirs = []
  for (const name of readdirSync(CHANGES_DIR)) {
    const p = join(CHANGES_DIR, name)
    if (!statSync(p).isDirectory()) continue
    // `.omc/` 等隐藏目录是运行时状态,不是 change —— 否则会被算进 change 数误导读数
    if (name.startsWith('.')) continue
    if (name === 'archive') {
      if (!OPT.all) continue
      for (const a of readdirSync(p)) {
        const ap = join(p, a)
        if (statSync(ap).isDirectory()) dirs.push(ap)
      }
      continue
    }
    dirs.push(p)
  }
  return dirs
    .filter((d) => !OPT.change || d.endsWith(`/${OPT.change}`))
    .map((dir) => {
      const specsRoot = join(dir, 'specs')
      const specDirs = existsSync(specsRoot)
        ? readdirSync(specsRoot).filter((s) => existsSync(join(specsRoot, s, 'spec.md')))
        : []
      return {
        dir,
        id: dir.split('/').pop(),
        interview: join(dir, 'interview.md'),
        explore: join(dir, 'explore.md'),
        proposal: join(dir, 'proposal.md'),
        design: join(dir, 'design.md'),
        tasks: join(dir, 'tasks.md'),
        plan: join(dir, 'exec/plan.md'),
        integration: join(dir, 'exec/integration.md'),
        verify: join(dir, 'exec/verify.md'),
        specDirs,
      }
    })
}

function checkChange(c) {
  const archived = isArchived(c)
  checkInterview(c)
  checkRequiredTables(c)
  checkProposal(c)
  for (const cap of c.specDirs) {
    checkSpecFile(join(c.dir, 'specs', cap, 'spec.md'), { isDelta: true, archived })
    if (!archived) checkPlaceholders(join(c.dir, 'specs', cap, 'spec.md'))
  }
  if (!archived) {
    checkPlaceholders(c.proposal)
    checkPlaceholders(c.design)
  }
  checkRequirementIds(c)
  checkCapabilityDuplication(c)
  checkConstitution(c)
  checkDesign(c)
  const tasks = checkTasks(c)
  checkPlanCoverage(c, tasks)
  checkRequirementCoverage(c, tasks)
  checkNotes(c)
  checkEvidence(c)
  checkVerify(c)
}

// ─────────────────────────── L10 · 主 spec 索引 ───────────────────────────

const SPEC_INDEX = join(SPECS_DIR, 'README.md')

/** Purpose 的第一句,用作索引里的「一句话职责」 */
function purposeLead(purpose) {
  for (const line of purpose.split('\n')) {
    const l = line.trim()
    if (!l || l.startsWith('⚠') || l.startsWith('>')) continue
    // 取第一个句号前的内容;句子过长则截断
    const first = l.split(/[。;;]/)[0].trim()
    return [...first].length > 60 ? `${[...first].slice(0, 58).join('')}…` : first
  }
  return ''
}

/**
 * 生成主 spec 索引。**产物要提交,并由 `L10/spec-index` 校验它没过期。**
 *
 * 为什么不做成「生成完就放着」:手工维护的索引必然过期,
 * 而过期的索引比没有索引更糟 —— 它让人以为自己看过全貌了。
 * 所以这里的规矩是:**用 `--write-index` 生成,用 `L10/spec-index` 兜底**,两者同源。
 */
function buildSpecIndex() {
  const rows = []
  for (const cap of [...mainSpecCaps()].sort()) {
    const spec = mainSpec(cap)
    const fm = spec.fm ?? {}
    rows.push({
      cap,
      status: fm.status ?? '?',
      by: fm.superseded_by ?? '',
      reqs: spec.requirements.filter((r) => r.depth === 3).length,
      lead: purposeLead(spec.purpose),
    })
  }
  const order = { active: 0, partial: 1, superseded: 2 }
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.cap.localeCompare(b.cap))

  const n = (s) => rows.filter((r) => r.status === s).length
  const totalReqs = rows.reduce((s, r) => s + r.reqs, 0)

  const out = [
    '<!-- 本文件由 `node openspec/check.mjs --write-index` 生成,不要手改 —— 手改会被 `L10/spec-index` 判为过期。 -->',
    '',
    '# 能力索引',
    '',
    `${rows.length} 个能力 / ${totalReqs} 条需求 —— ` +
      `active ${n('active')} · partial ${n('partial')} · superseded ${n('superseded')}。`,
    '',
    '状态口径见 `openspec/config.yaml` 的 `rules.specs`:',
    '`active` 现行有效 · `partial` 主体有效但有已知缺口(缺口写在 Purpose 里) · ' +
      '`superseded` 已被取代,内容仅供追溯、**不再具有约束力**。',
    '',
    '| 能力 | 需求 | 状态 | 一句话职责 |',
    '|---|---:|---|---|',
  ]
  for (const r of rows) {
    const status = r.status === 'superseded' ? `superseded → \`${r.by}\`` : r.status
    out.push(`| [${r.cap}](${r.cap}/spec.md) | ${r.reqs} | ${status} | ${r.lead} |`)
  }
  out.push('')
  out.push('> 新建能力归档后,跑 `node openspec/check.mjs --write-index` 重新生成本文件。')
  return `${out.join('\n')}\n`
}

/** 索引过期 = 主 spec 变了但没重新生成。同源比对,不可能漂。 */
function checkSpecIndex() {
  if (!existsSync(SPECS_DIR)) return
  const want = buildSpecIndex()
  if (!existsSync(SPEC_INDEX)) {
    err(
      'L10/spec-index',
      rel(SPEC_INDEX),
      '能力索引不存在 —— 跑 `node openspec/check.mjs --write-index` 生成',
    )
    return
  }
  if (read(SPEC_INDEX) !== want) {
    err(
      'L10/spec-index',
      rel(SPEC_INDEX),
      '能力索引已过期(主 spec 有增删、改名或 status 变化,但索引没跟着更新)—— ' +
        '跑 `node openspec/check.mjs --write-index` 重新生成。' +
        '**不要手改本文件**:手改的索引会在下一次归档后再次过期,而过期的索引比没有索引更糟 —— ' +
        '它让人以为自己看过全貌了',
    )
  }
}

const SPEC_STATUS = ['active', 'partial', 'superseded']

/**
 * 主 spec 的生效状态。抄自 carry 项目(`kr-judanyun/carry`)的 `status` 口径,
 * 但取值不同:那边区分「交付到什么程度」,这边区分**还 normative 不 normative**。
 *
 * 为什么需要:此前主 spec 是个一元世界 —— 只要在 `openspec/specs/` 里就永远以 MUST 生效。
 * 于是 `fix-project-create-modal-scroll` 这类早已被后续实现推翻的能力,仍在以 MUST 约束线上代码,
 * 而唯一的记录是 `project.json` 注释里的一句话。退役一个能力**没有落脚点**,
 * 只能往豁免清单里再加一条 —— 清单越长,失真越多。
 *
 * - `active`      现行有效
 * - `partial`     主体有效,但有已知缺口(缺口写进 Purpose,别让它变成隐性失效)
 * - `superseded`  已被其他能力取代,内容仅供追溯;必须写 `superseded_by`
 */
function checkSpecStatus(path) {
  const fm = frontmatter(read(path))
  const caps = mainSpecCaps()
  if (!fm?.status) {
    err(
      'L10/spec-status',
      rel(path),
      `缺 frontmatter 的 \`status\`(${SPEC_STATUS.join(' / ')})。` +
        `\`openspec archive\` 新建主 spec 时不会写它 —— 归档后请补上;新能力一律 \`status: "active"\`。` +
        `没有这个字段,能力就只有「存在=永远生效」一种状态,退役它只能往 project.json 的豁免清单里加条目`,
    )
    return
  }
  if (!SPEC_STATUS.includes(fm.status)) {
    err('L10/spec-status', rel(path), `status「${fm.status}」不是 ${SPEC_STATUS.join(' / ')} 之一`)
    return
  }
  if (fm.status !== 'superseded') return
  if (!fm.superseded_by) {
    err(
      'L10/spec-status',
      rel(path),
      'status 是 superseded 但没写 `superseded_by` —— 退役必须指明由谁接管,否则这块行为就没人管了',
    )
  } else if (!caps.has(fm.superseded_by)) {
    err(
      'L10/spec-status',
      rel(path),
      `superseded_by 指向 \`${fm.superseded_by}\`,但 openspec/specs/ 下没有这个能力`,
    )
  }
}

/** 已退役的能力:不再参与重复检出的基线(新能力取代它是正当的,不该被判重复) */
function supersededCaps() {
  const out = new Set()
  for (const cap of mainSpecCaps()) {
    if (mainSpec(cap).fm?.status === 'superseded') out.add(cap)
  }
  return out
}

function checkMainSpecs() {
  if (!existsSync(SPECS_DIR)) return
  for (const name of readdirSync(SPECS_DIR)) {
    const p = join(SPECS_DIR, name, 'spec.md')
    if (!existsSync(p)) continue
    checkSpecFile(p, { isDelta: false })
    checkPlaceholders(p)
    checkSpecStatus(p)
  }
}

function report(changes) {
  const errors = findings.filter((f) => f.level === 'error')
  const warns = findings.filter((f) => f.level === 'warn')

  if (OPT.json) {
    console.log(JSON.stringify({ ok: errors.length === 0, findings }, null, 2))
    return errors.length ? 1 : 0
  }

  const scope = OPT.change ? `change ${OPT.change}` : `${changes.length} 个 change`
  console.log(`\nopenspec check —— ${scope}\n`)

  if (!findings.length) {
    console.log('  ✓ 全部通过\n')
    return 0
  }

  const byFile = new Map()
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, [])
    byFile.get(f.file).push(f)
  }
  for (const [file, list] of byFile) {
    console.log(`  ${file}`)
    for (const f of list) {
      const icon = f.level === 'error' ? '✖' : '⚠'
      const at = f.line ? `:${f.line}` : ''
      console.log(`    ${icon} [${f.id}]${at} ${f.msg}`)
    }
    console.log('')
  }

  console.log(`  ${errors.length} error, ${warns.length} warn\n`)
  if (errors.length) {
    console.log('  判定口径见各 artifact 的 instruction 与模板;流程说明见 openspec/design/README.md\n')
  }
  return errors.length ? 1 : 0
}

async function runAll({ requireMatch = false } = {}) {
  const changes = collectChanges()
  if (requireMatch && OPT.change && !changes.length) {
    console.error(`找不到 change:${OPT.change}(归档的 change 需要加 --all)`)
    process.exit(2)
  }
  for (const c of changes) checkChange(c)
  checkMainSpecs()
  // 不受 --all / --change 影响:归档保真度是全局账,只看某一个 change 看不出来
  if (!OPT.change) checkArchiveFidelity()
  checkSlots()
  checkDocs()
  checkDocSync()
  if (!OPT.change) checkSpecIndex()
  checkConstitutionTemplate()
  checkProfileTemplate()
  await runProjectChecks()
  return changes
}

// ─────────────────────────── Claude Code PostToolUse 钩子模式 ───────────────────────────

/**
 * `--hook`:从 stdin 读 Claude Code 的钩子 JSON,只在写到 openspec 相关路径时才跑检查,
 * 并把结果作为 additionalContext 回灌给 agent。
 *
 * 刻意**不阻断**:artifact 是逐层写出来的,写到一半必然处于中间状态。
 * 这一层要的是"写完当场看见",硬拦截交给 pre-commit 与 CI。
 */
async function runHook() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk

  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  const file = payload?.tool_response?.filePath ?? payload?.tool_input?.file_path ?? ''
  const relPath = file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file

  const watches = await pluginWatches()
  const relevant = /^openspec\/(changes|specs)\//.test(relPath) || watches.includes(relPath)
  if (!relevant) process.exit(0)

  const inChange = relPath.match(/^openspec\/changes\/([^/]+)\//)
  if (inChange && inChange[1] !== 'archive') OPT.change = inChange[1]

  await runAll()

  const errors = findings.filter((f) => f.level === 'error')
  if (!errors.length) process.exit(0)

  const lines = errors.map((f) => `- ${f.file}${f.line ? `:${f.line}` : ''} [${f.id}] ${f.msg}`)
  console.log(
    JSON.stringify({
      suppressOutput: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: [
          `openspec check 发现 ${errors.length} 个问题(判定口径见对应 artifact 的 instruction 与模板):`,
          ...lines,
          '这些不阻断当前写入,但 pre-commit 与 CI 会拦。若属于本层尚未到达的阶段,可继续;否则请就地修复。',
        ].join('\n'),
      },
    }),
  )
  process.exit(0)
}

if (OPT.explain) {
  explain()
  process.exit(0)
} else if (OPT.inventory) {
  await inventory()
  process.exit(0)
} else if (OPT.writeIndex) {
  writeFileSync(SPEC_INDEX, buildSpecIndex())
  console.log(`已生成 ${rel(SPEC_INDEX)}`)
  process.exit(0)
} else if (OPT.hook) {
  await runHook()
} else {
  process.exit(report(await runAll({ requireMatch: true })))
}

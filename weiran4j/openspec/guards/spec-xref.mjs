/**
 * 项目级检查 · 主 spec 的需求交叉引用完整性
 *
 * 为什么需要它:`openspec check` 的 34 项通用检查里,没有一项在看**主 spec 正文**里的
 * `[FR-NNN]` 引用。`L10/delta-target-missing` 只管 delta → 主 spec 的需求名。
 * 于是一条需求被 REMOVED 之后,别处引用它的正文会**静默悬空** —— 而且那段正文往往还在
 * 描述被推翻的旧行为,让同一份 spec 里两条需求互相矛盾,全部校验绿灯。
 *
 * 守护的失效模式(2026-08-27 真实发生):`biz-loan-union-variable-routing` 退役了
 * `loan-form-table/FR-017`,FR-015 里却留着「该字段驱动提交时选择哪一条工作流定义,见 [FR-017]」。
 * 它是在一次**完整走完 L0–L10、含两道人类闸门的 change 之后**留下来的,修它又花掉一整个 change。
 *
 * ─── 口径:为什么只认方括号 ─────────────────────────────────────────────────
 *
 * 认「任意 `FR-NNN` 字面量」的粗口径实测在 104 个能力里命中 17 处,其中 **16 处是跨能力引用
 * 被误判**。仓库里的跨能力写法至少四种:
 *     `<能力>`/FR-004  ·  `<能力>` 能力 FR-003  ·  `<能力>` FR-004  ·  见该能力 FR-001
 * 最后一种靠上文指代,**文本规则不可解**。误报会淹没真问题,并逼人去改一堆本来正确的文字。
 *
 * 所以:**方括号 = 本能力内的活引用,目标必须存在;裸编号 = 不管**(它同时承担跨能力引用
 * 与散文提及两种既有用法)。提及一条已退役需求时,写裸编号即可,见 spec-cross-reference-integrity/FR-002。
 *
 * ─── 被否决的一个「更聪明」的方案 ────────────────────────────────────────────
 *
 * 「按归档记录判断该编号是否曾被正式 REMOVED,是则豁免」—— 否决。FR-017 正是被正式
 * REMOVED 的,那套规则会**恰好放过**我们要抓的那个 bug。判据只有一条:抓不住已经发生过的
 * 那次事故,这条检查就没有存在意义。
 *
 * ─── 为什么还要跳过代码 span 与围栏块 ──────────────────────────────────────
 *
 * 「谈论一条引用」和「作出一条引用」是两回事。规格文档里写
 *     - **WHEN** 正文中出现 `见 [FR-017]`
 * 时,那个方括号是被**引述的字面量**,不是活引用 —— 反引号正是 Markdown 里表达这个区别的方式。
 * 不跳过的话,**本检查自己的规格**会第一个被它报出来(实测:`spec-cross-reference-integrity`
 * 的 4 条 Scenario 里 6 处例子全部命中)。同类自指在本仓库两周内已出现四次
 * (spec 判据命中实现该判据的测试、tasks 编号被当成需求引用、等等),这里一并处理掉。
 *
 * 契约:default export `{ id, run(ctx) }`,可选 `watches: []`;
 * ctx 见 openspec/check.mjs 的 pluginContext() —— 它**不提供目录遍历**,
 * 故此处自行 import node:fs(与 guards/ratchet.mjs 同做法)。
 */
import { readdirSync } from 'node:fs'

const SPECS_DIR = 'openspec/specs'

/** 需求**定义**行:`### Requirement: [FR-015] …` */
const REQ_DEF = /^###\s+Requirement:\s*\[(FR-\d{3})\]/
/** 需求**引用**:方括号形式 */
const REQ_REF = /\[(FR-\d{3})\]/g

/**
 * 把 `<!-- -->` 注释块的内容抹掉,**但保留行数与行内偏移之外的行号对应关系**。
 *
 * 为什么不直接把注释段删掉:那样后续所有行的行号都会前移,报错会指向一个无关的行 ——
 * 而且**全绿时完全看不出来**,只有真报错那天才会发现指错了地方。
 * 这里逐行处理并对被吞掉的行返回空串,行数因此始终不变。
 */
/**
 * 抹掉行内代码 span(`` `…` ``)的内容。反引号内的 `[FR-NNN]` 是被**引述的字面量**,
 * 不是活引用 —— 规格文档描述「什么样的写法会被报错」时必然要写出那个写法。
 * 同样用等长空格替换,保持列偏移不变(虽然本检查只报行号,但不制造额外的意外)。
 */
function stripInlineCode(line) {
  return line.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, (m) => ' '.repeat(m.length))
}

function stripComments(text) {
  const out = []
  let inComment = false
  for (const line of text.split('\n')) {
    let s = line
    if (inComment) {
      const close = s.indexOf('-->')
      if (close === -1) { out.push(''); continue }
      s = s.slice(close + 3)
      inComment = false
    }
    let kept = ''
    for (;;) {
      const open = s.indexOf('<!--')
      if (open === -1) { kept += s; break }
      kept += s.slice(0, open)
      const rest = s.slice(open + 4)
      const close = rest.indexOf('-->')
      if (close === -1) { inComment = true; break }
      s = rest.slice(close + 3)
    }
    out.push(kept)
  }
  return out
}

export default {
  id: 'spec-xref',

  /** `--hook` 在写主 spec 时也触发本检查,不必等到 CI */
  watches: [SPECS_DIR],

  run({ ROOT, join, existsSync, read, rel, err }) {
    const dir = join(ROOT, SPECS_DIR)
    if (!existsSync(dir)) return

    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      const file = join(dir, ent.name, 'spec.md')
      if (!existsSync(file)) continue

      const raw = read(file)

      // 本能力内已定义的需求 ID。用原文匹配 —— 定义行不会出现在注释里
      const defined = new Set()
      for (const line of raw.split('\n')) {
        const m = REQ_DEF.exec(line)
        if (m) defined.add(m[1])
      }

      const lines = stripComments(raw)
      let inFence = false
      for (let i = 0; i < lines.length; i++) {
        const raw_line = lines[i]
        // 围栏代码块整块跳过 —— 里面的 [FR-NNN] 同样是被引述的字面量
        if (/^\s*(```|~~~)/.test(raw_line)) { inFence = !inFence; continue }
        if (inFence) continue
        // 定义行自身的 `[FR-NNN]` 是**定义**不是引用,跳过 ——
        // 不跳的话每条需求都会自证成立,检查等同于恒不报
        if (REQ_DEF.test(raw_line)) continue
        const line = stripInlineCode(raw_line)
        REQ_REF.lastIndex = 0
        let m
        while ((m = REQ_REF.exec(line)) !== null) {
          const ref = m[1]
          if (defined.has(ref)) continue
          err(
            'REPO/spec-xref-dangling',
            rel(file),
            `引用了本能力内不存在的需求 ${ref} —— 它可能已被退役。`
              + `方括号形式表示「活引用」,目标必须存在;若是提及一条已退役需求,写成不带方括号的 ${ref}`,
            i + 1,
          )
        }
      }
    }
  },
}

/**
 * 项目级检查 · state/bizs 条目编号(`#NN`)完整性
 *
 * 为什么需要它:`openspec/check.mjs` 主体全文搜 `state` **命中 0 次** —— 流水线完全不
 * 认识这个目录。`CLAUDE.md` 把 `state/` 的全部维护托付给「五个时机」那一节的祈使句;
 * 这条检查把其中**可机械判定的那部分**变成依赖。
 *
 * ─── 沿革 ───────────────────────────────────────────────────────────────────
 *
 * - 2026-09-23 前:守 `waitlist-tech.md` 索引表 + `changelog.md` 标题这个**集中式**
 *   `T-NN`/`B-NN` 注册表(悬空引用 + 重号)。
 * - 2026-09-23:两份源文件拆进 `bizs/**`,只剩「`T-NN` 字面量在 `bizs/**` 任意位置出现即算存活」
 *   的宽松悬空检查;条目本身改用加粗标题、不编号。
 * - 2026-09-24(本版):`T-NN`/`B-NN` **全部废止**;`bizs/*.md` 的「已知问题汇总 / changelog / 待归类」
 *   条目改为**文件内编号** `- **#NN {状态} {优先级} 标题**`,跨文件引用写 `文件名.md#NN`
 *   (规则见 `openspec/state/bizs/README.md`「编号约定」)。号码永不前移、永不复用,关闭时连号
 *   移到 changelog —— 所以引用一旦写下就应当一直有效,本检查守的正是这个前提。
 *
 * 三条检查:
 *   - `REPO/state-id-dup`      同一文件内同一 `#NN` 被两个条目使用
 *   - `REPO/state-id-dangling` `CLAUDE.md`/`openspec/{rules,design,state}` 里 `<bizs 下文件名>.md#NN`
 *                              形式的引用,指向的文件里没有这个编号的条目
 *   - `REPO/state-id-legacy`   `bizs/**` 里又出现了已废止的 `T-NN`/`B-NN` 字面量
 *
 * 裸 `#NN` 不校验:它与 PR 号(`#390`)、GitHub issue 号无法区分。
 *
 * 契约:default export `{ id, run(ctx) }`,可选 `watches: []`;
 * ctx 见 openspec/check.mjs 的 pluginContext()。
 */
import { readdirSync } from 'node:fs'

const BIZS_DIR = 'openspec/state/bizs'

/** 条目首行:`- **#03 🔴 P2 标题**` 或非加粗的 `- #03 ✅ P? ...` */
const ENTRY = /^- (?:\*\*|~~)?#(\d{2,}) /

/** `xxx.md#NN` 引用;前缀路径可有可无(`state/bizs/artifact.md#44`、`artifact.md#44`) */
const QUALIFIED_REF = /([\w-]+\.md)#(\d{2,})\b/g

/** 已废止的全局编号 */
const LEGACY_ID = /\b([TB]-\d{2,})\b/g

/** 会去引用条目编号的文件(含 bizs/ 自身:跨文件引用最多就发生在这里) */
const REF_SOURCES = [
  'CLAUDE.md',
  'openspec/rules',
  'openspec/design',
  'openspec/state',
]

/** 抹掉围栏代码块。块内的内容是被**引述的字面量**,不是活引用 */
function stripFences(text) {
  const out = []
  let inFence = false
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      out.push('')
      continue
    }
    out.push(inFence ? '' : line)
  }
  return out
}

/** 递归收集 .md 文件。ctx 不提供目录遍历,与 guards/ratchet.mjs 同做法自行 import */
function collectMd(dir, join, existsSync, acc) {
  if (!existsSync(dir)) return acc
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue
    const full = join(dir, ent.name)
    if (ent.isDirectory()) collectMd(full, join, existsSync, acc)
    else if (ent.name.endsWith('.md')) acc.push(full)
  }
  return acc
}

export default {
  id: 'state-waitlist',

  /**
   * **watches 必须覆盖 run() 实际读取的全部路径。**
   * 见 `openspec/design/check.md` 里记的教训:本插件旧版就因为只 watch 了
   * 被引用的那份清单、漏了它扫的引用方来源,导致改引用方时 hook 当场不响。
   */
  watches: [BIZS_DIR, ...REF_SOURCES],

  run({ ROOT, join, existsSync, read, rel, err }) {
    const bizsDir = join(ROOT, BIZS_DIR)
    if (!existsSync(bizsDir)) return

    // ── 收集各文件已定义的编号,顺带查重号与遗留旧编号 ──
    /** @type {Map<string, Set<string>>} 文件名 → 编号集合 */
    const defined = new Map()
    for (const ent of readdirSync(bizsDir, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.endsWith('.md')) continue
      const file = join(bizsDir, ent.name)
      const lines = stripFences(read(file))
      const seen = new Map()
      for (let i = 0; i < lines.length; i++) {
        const m = ENTRY.exec(lines[i])
        if (m) {
          const nn = String(Number(m[1])).padStart(2, '0')
          if (seen.has(nn)) {
            err(
              'REPO/state-id-dup',
              rel(file),
              `编号 #${nn} 已在第 ${seen.get(nn)} 行使用 —— 新条目取本文件当前最大号 + 1,号码不复用`,
              i + 1,
            )
          } else seen.set(nn, i + 1)
        }
        LEGACY_ID.lastIndex = 0
        let lm
        while ((lm = LEGACY_ID.exec(lines[i])) !== null) {
          err(
            'REPO/state-id-legacy',
            rel(file),
            `出现已废止的全局编号 ${lm[1]} —— 2026-09-24 起改用文件内 #NN,跨文件写「文件名.md#NN」`,
            i + 1,
          )
        }
      }
      defined.set(ent.name, new Set(seen.keys()))
    }

    // ── 限定引用 `文件名.md#NN`:文件在 bizs/ 下时,编号必须存在 ──
    const files = []
    for (const src of REF_SOURCES) {
      const full = join(ROOT, src)
      if (!existsSync(full)) continue
      if (src.endsWith('.md')) files.push(full)
      else collectMd(full, join, existsSync, files)
    }

    for (const file of files) {
      const text = stripFences(read(file))
      for (let i = 0; i < text.length; i++) {
        QUALIFIED_REF.lastIndex = 0
        let m
        while ((m = QUALIFIED_REF.exec(text[i])) !== null) {
          const [, name, num] = m
          const ids = defined.get(name)
          if (!ids) continue // 不是 bizs/ 下的文件,与本检查无关
          const nn = String(Number(num)).padStart(2, '0')
          if (ids.has(nn)) continue
          err(
            'REPO/state-id-dangling',
            rel(file),
            `引用 ${name}#${nn},但 ${BIZS_DIR}/${name} 里没有这个编号的条目 —— `
              + '核对目标文件:条目关闭时应连号移到 changelog 而不是删除;确实已删除就改写这处引用',
            i + 1,
          )
        }
      }
    }
  },
}

/**
 * 项目级检查 · CLAUDE.md 规则索引表的完整性
 *
 * 为什么需要它:`openspec/rules/` 下的规则**不会被自动加载** ——
 * OpenSpec 只把 `config.yaml` / `schema.yaml` 的 instruction / `templates/` 三处拼进提示词,
 * 其余任何文档都不会进。所以 `rules/` 唯一的唤起途径就是 `CLAUDE.md` 顶部那张「规则索引」表。
 * 那张表是这些规则的**单点** —— 它漏一行,对应文件就等于不存在;它指错文件,
 * 读的人就会去翻一个没有那节内容的文档,然后以为「这里没规则」。
 *
 * 而这张表本身零机械兜底:`check.mjs` 全文搜 `CLAUDE` 一次都不命中。
 * 表自己论证过「写『详见 XXX.md』只是祈使句,不是依赖」(见 `openspec/rules/README.md`),
 * 却没把这个推论用在自己身上 —— 这条检查补上。
 *
 * ─── 守护的两个失效模式 ────────────────────────────────────────────────────
 *
 * ① **索引表指向不存在的文件**(`REPO/rules-index-dangling`)
 *    移动或重命名 `rules/` 下任一文件,表里那行立刻失效。后果不是报错,而是
 *    agent 按表去 Read 一个不存在的路径、拿到空结果,然后继续干活 ——
 *    它不会因此停下来问,只会当作「这份规则没有内容」。
 *    注意 `enforced/constitution.md` / `enforced/project.md` 另有 `check.mjs` 硬编码引用兜底
 *    (`L2c/constitution-check` / `TEMPLATE/profile-rows`),`advisory/` 下的**只有这张表**。
 *
 * ② **新增规则文件漏登记**(`REPO/rules-index-missing`)
 *    往 `rules/` 加一份新文档而忘了往表里加一行,它就永远不会被任何 agent 读到。
 *    这个失效**完全静默**:文件在仓库里、review 时看得见、grep 得到,
 *    只是没有任何时刻会让人想起去读它。与 `L10/spec-index` 防的是同一件事
 *    ——「手工维护的索引必然过期,而过期的索引比没有索引更糟」。
 *
 * ─── 为什么不查触发条件的措辞 ───────────────────────────────────────────────
 *
 * 触发条件是**面向任务**写的自然语言(「改 X 之前」),章节标题是**面向内容**写的,
 * 两者本就不该逐条对齐 —— 一条触发条件可以对应多节,一节也可以由多个场景触发。
 * 按条数或字符串比对必然大量误报,而误报会让人把整条检查连同真问题一起关掉。
 * 措辞准确性只能靠 review,这里只守「文件在不在、有没有登记」这两件可判定的事。
 *
 * 契约:default export `{ id, run(ctx) }`,可选 `watches: []`;
 * ctx 见 openspec/check.mjs 的 pluginContext()。
 */
import { readdirSync } from 'node:fs'

const CLAUDE_MD = 'CLAUDE.md'
const RULES_DIR = 'openspec/rules'

/** 索引表行里的 `rules/<名>.md` 链接。表格行以 `| [` 开头 */
const INDEX_LINK = /rules\/((?:enforced\/|advisory\/)?[a-z0-9-]+\.md)/gi

/**
 * 不需要出现在索引表里的文件。`README.md` 是目录总览(表头那句
 * 「总览见 rules/README.md」已经引用了它),不是一条「什么时候必须读」的规则。
 */
const EXEMPT = new Set(['README.md'])

export default {
  id: 'rules-index',

  /**
   * 两边都要 watch。
   *
   * 这里原先只写了 `CLAUDE_MD`,注释称「rules/ 下增删文件由 `openspec/` 前缀的通用规则捞到」
   * —— **那个假设是错的**:hook 的通用正则是 `^openspec/(changes|specs)/`,
   * 并不覆盖 `openspec/rules/`。于是新建/改名/删除一份 rules 文件时,本检查的两条
   * 在 hook 里**当场不响**,要等到 `git commit` 才被 pre-commit 拦。
   * 守卫本身是对的,错在没想清楚它该在哪一刻响。
   */
  watches: [CLAUDE_MD, RULES_DIR],

  run({ ROOT, join, existsSync, read, rel, err }) {
    const claude = join(ROOT, CLAUDE_MD)
    const rulesDir = join(ROOT, RULES_DIR)
    if (!existsSync(claude) || !existsSync(rulesDir)) return

    const text = read(claude)
    const lines = text.split('\n')

    // ── 索引表登记了哪些文件 ──
    const listed = new Map() // 文件名 -> 行号
    for (let i = 0; i < lines.length; i++) {
      INDEX_LINK.lastIndex = 0
      let m
      while ((m = INDEX_LINK.exec(lines[i])) !== null) {
        if (!listed.has(m[1])) listed.set(m[1], i + 1)
      }
    }
    if (listed.size === 0) return // 表被整体改写成别的形态,不猜

    // ① 登记了但文件不在
    for (const [name, line] of listed) {
      if (existsSync(join(rulesDir, name))) continue
      err(
        'REPO/rules-index-dangling',
        rel(claude),
        `规则索引表指向 openspec/rules/${name},但该文件不存在 —— `
          + 'agent 会按表去 Read 一个空路径,拿到空结果后当作「这份规则没有内容」继续干活,'
          + '不会停下来问。移动或改名 rules/ 下的文件必须同步改这张表',
        line,
      )
    }

    // ② 文件在但没登记。`rules/` 分成 enforced/(有机械兜底)与 advisory/(无),
    //    所以要连子目录一起扫 —— 只扫顶层会让新分层里的文件全部漏检。
    const found = [] // 相对 rules/ 的路径,如 `enforced/constitution.md`
    const collect = (dir, prefix) => {
      let entries
      try {
        entries = readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const ent of entries) {
        if (ent.isDirectory()) {
          if (ent.name.startsWith('.')) continue // .omc 等运行时目录
          collect(join(dir, ent.name), `${prefix}${ent.name}/`)
        } else if (ent.name.endsWith('.md')) {
          found.push(`${prefix}${ent.name}`)
        }
      }
    }
    collect(rulesDir, '')

    for (const relName of found) {
      if (EXEMPT.has(relName) || listed.has(relName)) continue
      err(
        'REPO/rules-index-missing',
        rel(join(rulesDir, relName)),
        `openspec/rules/${relName} 没有登记进 CLAUDE.md 的规则索引表 —— `
          + 'rules/ 下的文件不会被自动加载,唯一的唤起途径就是那张表。'
          + '漏登记的后果完全静默:文件在仓库里、grep 得到,但没有任何时刻会让人想起读它。'
          + '往表里加一行「什么时候必须读」,或确认它不该是一条规则',
      )
    }
  },
}

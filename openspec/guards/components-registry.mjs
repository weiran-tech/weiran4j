/**
 * 项目级检查 · 公共组件清单的登记完整性
 *
 * 为什么需要它:`openspec/rules/advisory/components.md` 是「先查再造」的唯一依据 ——
 * 造新组件前查它,查不到就造。于是**漏登记一个组件 = 下一个人会把它重造一遍**。
 *
 * 而这份清单自述的失效方向只有一个:
 *
 * > **失效即改**:组件被删除或协议变更时同步更新这里
 *
 * **少了「新增未登记」这个方向** —— 而 2026-09-05 实测的 9 个缺口 100% 出在这个方向。
 * (上游 mono4ts 的实测;本仓库清单建立于 2026-09-26。)
 * 与已收录组件功能相邻的新组件,正是「先查再造」最容易失手的位置:查清单没有它,就会重造一个。
 *
 * 这个失效**完全静默**:文件在仓库里、grep 得到、review 时看得见,
 * 只是没有任何时刻会让人想起「该往清单里加一行」。与 `L10/spec-index` 同一种失效模式
 * ——「手工维护的索引必然过期,而过期的索引比没有索引更糟」。
 *
 * ─── 判据:只查「名字在不在清单里」 ────────────────────────────────────────
 *
 * 不校验条目内容是否准确(那需要语义理解),只校验**组件文件名是否在清单正文里出现过**。
 * 口径刻意宽松:清单里写 `**CompanyTag** — \`components/CompanyTag.tsx\`` 也好、
 * 只在某段话里提到 `CompanyTag` 也好,都算登记 —— 目的是拦「完全没提过」这一种,
 * 不是逼人按固定格式写。收紧到「必须有独立条目」会把合并成一族介绍的组件
 * (如 `BizLedgerNumericInput` 那一族)全判成错。
 *
 * ─── 扫描范围与豁免 ──────────────────────────────────────────────────────
 *
 * 范围取 `components.md` 自己声明的两个来源目录。豁免三类:
 * ① 测试文件(`*.test.*` / `__tests__/`)—— 不是可复用组件;
 * ② `index` / `types` / `constants` —— 桶文件与类型声明,没有「复用」语义;
 * ③ `registry.exempt` 里显式列出的 —— 给「确实不该进清单」的留出口。
 *
 * 契约:default export `{ id, run(ctx) }`,可选 `watches: []`;
 * ctx 见 openspec/check.mjs 的 pluginContext()。
 */
import { readdirSync } from 'node:fs'

const REGISTRY = 'openspec/rules/advisory/components.md'

/** components.md 自己声明的来源目录 */
const ROOTS = [
  'web/src/components',
  'web/src/layouts',
]

/** 没有「可复用组件」语义的文件名 */
const SKIP_BASENAMES = new Set(['index', 'types', 'constants'])

function walk(dir, join, existsSync, acc) {
  if (!existsSync(dir)) return acc
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const ent of entries) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === '__tests__') continue
      walk(full, join, existsSync, acc)
    } else if (/\.tsx?$/.test(ent.name) && !ent.name.endsWith('.d.ts') && !/\.test\./.test(ent.name)) {
      acc.push(full)
    }
  }
  return acc
}

export default {
  id: 'components-registry',

  /**
   * 三个来源目录 **加上清单本身** —— run() 两边都读,watches 就该两边都写。
   *
   * 清单那一侧目前也会被 `rules-index` 的 `openspec/rules` watch 顺带捞到,
   * 但那是**别人的 watch 恰好覆盖**,不是本插件自己的契约:哪天 `rules-index`
   * 收窄了 watch,这里就会静默失去即时反馈。依赖另一个插件的配置是隐式耦合,
   * 显式写出来的成本只有一行。
   */
  watches: [...ROOTS, REGISTRY],

  run({ ROOT, join, existsSync, read, rel, err, project }) {
    const registry = join(ROOT, REGISTRY)
    if (!existsSync(registry)) return

    const text = read(registry)
    const exempt = new Set(project?.componentsRegistry?.exempt ?? [])

    for (const root of ROOTS) {
      for (const file of walk(join(ROOT, root), join, existsSync, [])) {
        const relPath = rel(file)
        if (exempt.has(relPath)) continue

        const base = relPath.split('/').pop().replace(/\.tsx?$/, '')
        if (SKIP_BASENAMES.has(base)) continue
        if (text.includes(base)) continue

        err(
          'REPO/components-unregistered',
          relPath,
          `没有登记进 ${REGISTRY} —— 这份清单是「先查再造」的唯一依据,`
            + '漏登记的直接后果是下一个人查不到它、把它重造一遍('
            + 'ProjectPickerModal 就差点被 ProjectSelect 的使用者重造)。'
            + '往对应分节加一条(写清「是什么 / 什么时候用 / 有什么坑」),'
            + '或把它加进 project.json 的 componentsRegistry.exempt 说明为什么不该进清单',
        )
      }
    }
  },
}

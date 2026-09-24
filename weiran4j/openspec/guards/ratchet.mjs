/**
 * 项目级检查 · 存量棘轮(只降不升)
 *
 * 为什么需要它:`L2c/constitution-check` 只能验证 design.md **回答了**每条原则,
 * 验证不了答案是**真的** —— 填 ☑ 的人有没有真的没用旧协议,那张表看不出来。
 * 让宪法里的「MUST NOT 新增旧协议调用点」这类条款真正生效的,不是更聪明的评审,
 * 而是把存量数冻成基线,只准降不准升。
 *
 * 这同时解决了宪法的另一个毛病:CP-2 / CP-3 的「现状」里写着具体数字,
 * 而没有任何机制维护它们 —— 数字一过期,宪法就开始撒谎。
 * 现在**基线是唯一事实源**(`openspec/project.json` 的 `ratchet.rules`),宪法正文只引用它,不复述数字。
 *
 * 判定:
 * - 实测 > 基线 → error。新增了旧协议调用点,这正是要拦的。
 * - 实测 < 基线 → error,并给出该改成的数字。清理成果必须落进基线,
 *   否则基线永远停在最高水位,等于给「以后再加回去」留了额度。
 * - 基线为 null  → warn,并报出当前实测值(用于首次播种)。
 *
 * 契约:default export `{ id, run(ctx) }`,可选 `inventory(ctx)` / `watches: []`;
 * ctx 见 openspec/check.mjs 的 pluginContext()(含 `project`,所以本插件不自己读配置文件)。
 */

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** 规则住在 project.json 的 `ratchet.rules`,由 check.mjs 经 ctx.project 传进来 —— 插件不自己读文件 */
const CONFIG = 'openspec/project.json'
const rulesOf = (project) => project?.ratchet?.rules ?? []

/** 递归收集指定后缀的文件(零依赖,不引 glob) */
function walk(dir, exts, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue
    const p = join(dir, name)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(p, exts, out)
    else if (exts.some((e) => name.endsWith(e))) out.push(p)
  }
  return out
}

/** 统计一条规则当前的命中数与命中文件分布 */
function measure(ROOT, r) {
  const exclude = new Set((r.exclude ?? []).map((p) => join(ROOT, p)))
  const files = []
  for (const root of r.roots ?? []) {
    for (const f of walk(join(ROOT, root), r.extensions ?? ['.ts', '.tsx'])) {
      if (!exclude.has(f)) files.push(f)
    }
  }
  let count = 0
  const hits = new Map()
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    let n = 0
    for (const src of r.patterns ?? []) n += (text.match(new RegExp(src, 'g')) ?? []).length
    if (n) {
      count += n
      hits.set(relative(ROOT, f), n)
    }
  }
  return { count, hits }
}

const topHits = (hits, k = 5) =>
  [...hits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([f, n]) => `${f}(${n})`)
    .join('、')

export default {
  id: 'ratchet',

  /** `--inventory`:报告距离 target 还差多少 + 分阶段退役计划(平时不打扰,按需查) */
  inventory({ ROOT, project }) {
    const out = []
    for (const r of rulesOf(project)) {
      const { count, hits } = measure(ROOT, r)
      const target = r.target ?? 0
      const done = r.baseline != null ? r.baseline - count : 0
      out.push(`棘轮「${r.id}」:${r.title}`)
      out.push(
        `  当前 ${count} · 基线 ${r.baseline ?? '未播种'} · 目标 ${target} · ` +
          `已清理 ${done} · 还差 ${Math.max(0, count - target)}` +
          (r.principle ? `(守护 ${r.principle})` : ''),
      )
      if (count > target && (r.plan ?? []).length) {
        out.push('  退役计划:')
        for (const step of r.plan) out.push(`    · ${step}`)
      }
      if (count > target) out.push(`  命中最多:${topHits(hits)}`)
      out.push('')
    }
    return out
  },

  run({ ROOT, project, err, warn }) {
    for (const r of rulesOf(project)) {
      const { count, hits } = measure(ROOT, r)
      const top = topHits(hits)

      if (r.baseline == null) {
        warn(
          'REPO/ratchet-baseline',
          CONFIG,
          `棘轮「${r.id}」尚未播种基线。当前实测 ${count} 处,请把 baseline 填为 ${count}。命中最多的:${top}`,
        )
        continue
      }

      if (count > r.baseline) {
        err(
          'REPO/ratchet-increased',
          CONFIG,
          `棘轮「${r.id}」:${r.title} 从基线 ${r.baseline} 涨到 ${count}(+${count - r.baseline})。` +
            `${r.principle ? `违反 ${r.principle}。` : ''}${r.guidance ?? ''} ` +
            `命中最多的文件:${top}。` +
            `**不要为了过检查直接改基线** —— 基线只在存量真的减少时下调`,
        )
      } else if (count < r.baseline) {
        err(
          'REPO/ratchet-baseline',
          CONFIG,
          `棘轮「${r.id}」实测 ${count},低于基线 ${r.baseline} —— 存量减少了 ${r.baseline - count} 处,` +
            `请把 baseline 改为 ${count} 把成果锁进去。基线停在最高水位等于给「以后再加回来」留额度`,
        )
      }
    }
  },
}

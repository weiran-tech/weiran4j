/**
 * 项目级检查 · 孤儿 worktree
 *
 * 为什么是项目级:「worktree 放在哪、目录名怎么对应到一个 change」是本仓库的约定
 * (`.worktrees/<change-id>`,由 `scripts/wt.mjs` 建立)。换个项目,worktree 仍然会泄漏,
 * 但存放位置与命名规则完全不同 —— 判定**方法**属于流程,判定**代码**属于项目。
 *
 * 守护的失效模式:**worktree 用完没删,而且没有任何东西会告诉你。**
 * 它不报错、不变红,只是磁盘上多一份 11 万文件的副本;存放目录本身是被忽略的,
 * 不会有任何人替你清。本仓库曾同时挂着四个遗留 worktree,其中一个连 `git worktree list`
 * 都已经不认识它(见 openspec/design/why.md 的 2026-08-09 快照)。
 *
 * 覆盖两种形态,缺一不可:
 *   ① 注册项在、change 已归档  → 使命已结束,该删了
 *   ② 目录在、注册项没了       → `git worktree prune` **清不掉这一类**(它只处理反向的那种)
 *
 * ⚠️ 豁免「当前所在的 worktree」不是网开一面,是避免一处自锁:
 * 归档动作本身是一次提交,它必然改 `openspec/`,因而必然触发 pre-commit。不豁免的话,
 * 在 worktree 内提交自己的归档会被本检查拦下 —— 而此时它既删不掉(内含未提交改动)
 * 也提交不了,唯一出口是 `--no-verify`,那正是本仓库最不想养成的习惯。
 * 豁免只把报警时机推迟到「离开该 worktree 之后的第一次检查」,而那才是能真正动手删它的时刻。
 *
 * 契约:default export `{ id, run(ctx) }`,可选 `watches: []`;
 * ctx 见 openspec/check.mjs 的 pluginContext()。
 */
import { readdirSync, realpathSync } from 'node:fs';

/** 与 `scripts/wt.mjs` 的 `WORKTREES` 常量**两处必须一致**。 */
const WORKTREES = '.worktrees';
const ARCHIVE = 'openspec/changes/archive';

/** 符号链接会让字符串比对失效(/tmp 与 /private/tmp 是同一处)。解析失败时退回原值。 */
function real(p) {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

export default {
  id: 'worktree-orphan',

  run({ ROOT, join, existsSync, rel, err, git }) {
    const raw = git(['worktree', 'list', '--porcelain']);
    const registered = [];
    for (const block of raw.split('\n\n')) {
      const p = block.match(/^worktree (.+)$/m)?.[1];
      if (p) registered.push(p);
    }

    // ctx.git 失败时返回空串而不是抛异常。主工作区必然在列表里 ——
    // 它不在,就说明这次是「git 调用失败」而不是「没有 worktree」,绝不能当成通过。
    const here = real(ROOT);
    if (!registered.some((p) => real(p) === here)) {
      throw new Error(
        `git worktree list 的输出里没有主工作区(${rel(ROOT) || '.'})—— ` +
          `判为 git 调用失败,不作为「无 worktree」放行`,
      );
    }

    // 归档提交发生在该 worktree 自己内部时,它必然还没被删 —— 这一刻报错等于自锁。
    const current = real(git(['rev-parse', '--show-toplevel']) || ROOT);
    const seen = new Set();

    // ① 注册项还在,但它对应的 change 已经归档
    for (const p of registered) {
      seen.add(real(p));
      if (real(p) === current) continue;
      const id = p.split('/').filter(Boolean).pop();
      if (!id || !existsSync(join(ROOT, ARCHIVE, id))) continue;
      err(
        'REPO/worktree-orphan',
        rel(p),
        `change \`${id}\` 已归档到 ${ARCHIVE}/,但它的 worktree 还在:${p} —— ` +
          `跑 \`node scripts/wt.mjs done ${id}\` 删掉它`,
      );
    }

    // ② 目录还在,但注册项已经没了。`git worktree prune` 处理不了这个方向。
    const dir = join(ROOT, WORKTREES);
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (seen.has(real(p)) || real(p) === current) continue;
      err(
        'REPO/worktree-orphan',
        rel(p),
        `${WORKTREES}/${entry} 存在,但不在 git worktree list 中 —— ` +
          `注册项已丢失,\`git worktree prune\` 清不掉这一类;跑 \`node scripts/wt.mjs done ${entry}\``,
      );
    }
  },
};

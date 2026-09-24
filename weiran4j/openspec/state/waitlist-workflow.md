# 流水线自身的欠账

> 这里登记的是 **openspec 流水线本体**（schema / 模板 / 校验 / 目录结构）欠着什么，
> 与业务代码无关。业务侧的待办在 [`waitlist.md`](waitlist.md)（技术 `T-NN` 与业务 `B-NN`
> 同一份索引表），维护约定相同：
>
> - **新增**必须带**症状**：谁会因此拿到错的东西。没有症状的条目无法排优先级。
> - **关闭**要回来划掉，并注明是哪个 change 关的。留着已解决的条目，清单就开始撒谎。

## 待处理

### P-002 · `design/` 下的说明文档大量描述 mono4ts，而非本仓库

**症状**：`openspec/design/` 是从 mono4ts 整体拷来的，其中
`CHANGELOG.md` 记的是 **mono4ts 流水线的演进史**（2026-08 那批 worktree 改名、
drizzle journal 守卫、棘轮基线等），`pipeline.md` / `why.md` / `check.md` 里
也散着 `packages/`、drizzle、`pnpm` 的例子。

读的人会以为那是本仓库发生过的事——尤其 `CHANGELOG.md`，
它记录的每一条「起因 / 改了什么」在 weiran4j 都没有发生过。

**为什么先不动**：这些是**说明性**文档，流水线不依赖它们（删掉照常运行），
所以它们过期不会让任何检查变红。但 `design/check.md` 是例外——
它被 `META/check-doc-stale` 机械看守，必须与 `check.mjs` 同步。

**关闭条件**：逐份复核，把描述 mono4ts 的部分要么改写成 weiran4j 的事实，
要么明确标注为「上游来源，本仓库未发生」。`CHANGELOG.md` 建议清空重开，
只从 weiran4j 自己的第一次流程改动记起。

## 已解决

### P-001 · 六个模板槽仍是 mono4ts 原文，`rules/enforced/project.md` 因此建不起来 → 已关闭

**原症状**：`openspec/schemas/devops-workflow/templates/` 的六个 `openspec:slot` 槽里，
写的是上游 mono4ts 的项目事实——`packages/shared/src/index.ts`、
`packages/server/drizzle/00NN_*.sql`、`node scripts/wt.mjs`、Drizzle migration、
`pnpm --filter` 等等，这些文件在 weiran4j 一个都不存在。走流水线时这些槽会被
**全文注入 agent 的提示词**，L1 explore 会被要求核对一张本项目根本没有的共享层清单，
且 `TEMPLATE/profile-rows` 因为 `rules/enforced/project.md` 不存在而**一条都不查**，
没有任何保护。

**已修复**：

1. 新建 [`rules/enforced/project.md`](../rules/enforced/project.md)，按 weiran4j 的真实结构
   记录 `SL-1..7`（Gradle 构建配置文件 + 前端路由/菜单登记点）、`WT-0..3`（本仓库没有
   worktree,并行判据改为"同一工作区能否交替推进"）、`CC-1..9`（RBAC 已实现,数据范围/
   多租户/审计/幂等/导出/工作流绑定按现状逐项标注"尚未引入"或"不适用"）、`PK-1..4`、
   `TG-1..5`（按 DDD 五层排序）、`DS-1..6`。
2. 六个模板槽（`explore.md` shared-layers、`exec-plan.md` worktree-tradeoffs、
   `proposal.md` project-structure + crosscuts、`tasks.md` task-groups、
   `design.md` design-sections）已同步重写，ID 与 `project.md` 一一对应。
3. 顺带清理了六个槽**之外**残留的 mono4ts 引用（`exec-plan.md` 的依赖图/契约冻结示例、
   `design.md` 的 Architecture 图与 Test Plan、`exec-verify.md` 的 worktree 计数与
   `packages/` mtime 措辞、`proposal.md` 的 `pnpm db:generate`）。
4. `node openspec/check.mjs` 验证 `TEMPLATE/profile-rows` 通过（0 error）。
5. `CLAUDE.md` 规则索引表已登记 `rules/enforced/project.md`（否则会被 `REPO/rules-index-missing` 拦）。

**关闭方式**：直接编辑落地，未走独立 change。

### P-003 · `.claude/skills/devops-ff-workflow/SKILL.md` 仍带 mono4ts 专有步骤 → 已关闭

**原症状**：该 skill 里写着 `--isolate-db`、`node scripts/wt.mjs`、`pnpm build/test/lint`、
`packages/server/src/db/schema/**` 等步骤，weiran4j 没有 `scripts/wt.mjs`，
也没有 Drizzle 和 worktree 脚本，照着执行会在 Phase 0 就卡住。

**已修复**：SKILL.md 本身此前已确认"本仓库没有 worktree 工具，不发明、不照抄
`scripts/wt.mjs` 流程"（见 Phase 0 步骤 2）。本次 P-001 的处理同步更新了
`templates/exec-plan.md` 的 worktree 槽与槽外引用，使模板与 SKILL.md 的这一判断
保持一致（此前模板仍写着"用 `node scripts/wt.mjs new <change-id>` 建"，与 SKILL.md
自相矛盾）。

**关闭方式**：随 P-001 一并做完。

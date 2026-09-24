---
name: devops-ff-workflow
description: Fast-forward the devops-workflow OpenSpec pipeline (L0-L10) for a change end to end, auto-advancing through every artifact and pausing only at the genuine human gates - unresolved L0 ambiguity, L3 design approval, and L9 final-diff sign-off. Use when the user wants to drive an openspec change from interview to archive without approving every single artifact.
allowed-tools: Bash(openspec:*), Bash(./gradlew:*), Bash(node:*), Bash(pnpm:*), Bash(git:*), Skill, AskUserQuestion
license: MIT
compatibility: Requires openspec CLI (@fission-ai/openspec) with the devops-workflow schema registered in this repo's openspec/config.yaml. Project-local skill, not portable as-is to other schemas.
metadata:
  author: project
  version: "1.0"
---

Drive an OpenSpec change through the **whole** `devops-workflow` pipeline (`openspec/schemas/devops-workflow/schema.yaml`, documented in `openspec/design/pipeline.md` and `README.md`) in one continuous run, instead of stopping after every artifact.

## Why this skill exists (read before editing it)

Three things were verified empirically before writing this skill — don't assume otherwise:

1. **`openspec status --json`'s `ready`/`done` is pure file-existence, not approval-aware.** Writing a `design.md` with no `approved_by` still flips `design` to `done` and `tasks` to `ready`. The CLI will never stop you at L3/L9 — you have to.
2. **The generic `openspec-verify-change` and `openspec-archive-change` skills don't match this schema.** `openspec-verify-change` produces a Completeness/Correctness/Coherence report, not this schema's `exec/verify.md` with a 通过/打回实现/打回设计 verdict line that `check.mjs`'s `L8/verdict-line` requires — don't invoke it for the `verify` artifact. `openspec-archive-change` never asks for a final-diff review (it only warns about incomplete artifacts/tasks), and it archives by `mv` plus an agent-written spec merge instead of calling `openspec archive` — measurably lossy on this repo's history. **This skill does not use it at all**; Phase 7 runs the CLI directly.
3. **`openspec archive`'s MODIFIED matching is verbatim on Scenario titles, not just Requirement titles.** If a delta spec's MODIFIED block renames a `#### Scenario:` heading relative to the current main spec (even just "9 个" → "11 个" with the underlying content otherwise equivalent), archive refuses with `MODIFIED failed - current spec contains scenario(s) not present in the modified block` — it reads this as "you silently dropped the old scenario," not "you renamed it." There is no Scenario-level RENAMED (unlike Requirements, which do have one) — when a change genuinely needs the entity count in a title to go up, **keep the Scenario title exactly as it was and update only the count inside the body/判据**; only Requirement titles can be renamed via the RENAMED delta section. `biz-payment-record-project-select` (2026-08-22) hit this on 6 separate scenarios in one delta spec before figuring out the pattern — check every renamed `#### Scenario:` heading against the current main spec before running `archive`, not after it fails.

Because of both points, this skill **generates the `verify` artifact itself** the same generic way `openspec-continue-change`/`openspec-ff-change` generate any artifact (pull `openspec instructions <id> --change <name> --json`, follow its `template`/`instruction`/`rules` verbatim), rather than delegating that step to the mismatched skills.

## Input

A change name (existing, to resume) or a description of what to build (to start fresh). If neither is inferable from the conversation, ask once with **AskUserQuestion** (open-ended) — this is not one of the real gates, just normal input gathering.

## Phase 0 — Resolve change & confirm schema

0. **Sync with the remote before designing anything.** Run:
   ```bash
   git fetch origin && git status --short --branch
   ```
   If the branch line says `behind`, fast-forward (or rebase) **before** writing `interview.md` —
   otherwise L1 explore reads stale code and the whole design is built on it. This costs seconds.
   Note that `git status`'s ahead/behind counts are computed against the **remote-tracking ref**,
   which is only as fresh as your last fetch — without the `git fetch` the line can read "in sync"
   while the remote has moved. WT-0 in `rules/enforced/project.md` does **not** cover this: its three
   criteria are all local (working tree, `openspec/changes/`, local `git log`).

1. **Assess before creating anything.** `openspec list --json` to see existing changes, then settle three things:
   - **The change id** (kebab-case). Existing change: if ambiguous, use **AskUserQuestion** to let the user pick (don't guess).
   - **Which Gradle modules does it touch?** Java changes land in `weiran-system/weiran-system-*` (DDD five layers), `weiran-common`, or `weiran-app`; frontend changes in `web/`. This drives the L4 layering, and it is the only "scope" decision this repo needs up front.
   - **Does it touch `pam_*` table structure?** If yes, CP-7 applies: you must cross-check `weiran-v1`'s migrations and Models and state in `proposal.md` whether the change is breaking for the PHP side. The two systems read and write those tables **in parallel** during migration — checking only the Java side is checking half.

   You cannot always know these with certainty before L1 explore — decide on the best evidence you have and revise after explore.

2. **Work in the main checkout — this repo has no worktree tooling.** Upstream mono4ts drives a
   worktree-per-change workflow via `scripts/wt.mjs`; **weiran4j has no `scripts/` directory and no
   such script**, and `rules/enforced/project.md` (which held the `WT-N` criteria) does not exist here
   either. Do not invent a worktree flow, and do not copy mono4ts's — the `.worktrees/` orphan guard
   (`openspec/guards/worktree-orphan.mjs`) is carried over and will simply find nothing.

   What still applies regardless of worktrees: **do not run two changes at once against this
   checkout.** Before starting, `git status --short --branch` must be clean of someone else's
   in-progress work — otherwise their red gates bleed into your L7 evidence and their diff makes the
   L9 sign-off impossible to give for your change alone.

   > weiran4j does not use worktree-per-change isolation (see P-003, resolved, in
   > `openspec/state/waitlist-workflow.md`). This step is "stay in the main checkout, one change at
   > a time."

3. **Create the change.** `openspec new change "<change-id>"` (no `--schema` needed — this repo's
   `config.yaml` already defaults to `devops-workflow`; only pass `--schema devops-workflow`
   explicitly if `openspec status --json` on the freshly created change comes back with
   `schemaName != "devops-workflow"`).

4. `openspec status --change "<name>" --json`. If `schemaName` isn't `devops-workflow`, STOP — this skill assumes that schema's artifact set (interview/explore/proposal/specs/design/tasks/exec-plan/verify) and its `check.mjs` rules; report the mismatch instead of improvising.
5. Use the returned `artifacts[].status` (plus reading the files directly where noted below) to figure out which phase to resume at. **Don't restart from L0 if the change already has later artifacts** — jump straight to the first incomplete phase.
6. Track progress across phases with your task-tracking tool (TodoWrite/TaskCreate, whichever your harness exposes) — this run can span many steps.

## Phase 1 — Planning loop (L0-L2): interview → explore → proposal → specs → design → tasks

Loop: `openspec status --change "<name>" --json` → take the first artifact with `status: "ready"` among `interview, explore, proposal, specs, design, tasks` → `openspec instructions <id> --change "<name>" --json` → read its `dependencies` files → write the artifact to `resolvedOutputPath` following `template`, applying `context`/`rules`/`instruction` as constraints (never copy those blocks into the output) → repeat.

Two hard-coded interrupts inside this otherwise-automatic loop — **these are not suggestions, do not let "keep momentum" override them**:

- **L0 gate, right after `interview.md` exists (freshly written or already there)**: read its `## 未决歧义` section yourself. If it contains anything other than resolved items / `- 无`, STOP the loop. Present the open questions to the user directly (plain question or AskUserQuestion, whichever fits), get answers, update `interview.md` (move each to "已回答" or "本次不决定"), and only then continue to `explore`. Do not generate `explore`/`proposal` while ambiguity is open — this mirrors the schema's own instruction, but you're the one enforcing it since nothing else will.
- **L3 gate, before generating `tasks`**: `tasks` requires both `specs` and `design` to be `done`. Before creating it, open `design.md` and check its frontmatter for **both** `approved_by` and `approved_at`. If either is missing:
  - STOP. Show the user `design.md`'s content (or a summary if long) and explicitly ask for approval — this is the one point in the whole pipeline where "改起来还便宜", per `pipeline.md` L3.
  - Only after the user approves, write `approved_by: "<user>"` and `approved_at: "<YYYY-MM-DD>"` into the frontmatter yourself, then proceed to `tasks`.
  - If the user requests changes instead of approving, revise `design.md` (or `proposal.md`/`specs/` if the issue traces back further) and re-ask — don't half-approve.

## Phase 2 — L4 exec-plan

Same generic loop as Phase 1 for the `exec-plan` artifact (`requires: [tasks]`). No human gate here — auto-generate it. Follow the six things its instruction asks for (task mapping, dependency DAG, Layer 0, contract freeze, file ownership per execution unit, failure/degrade plan) and fill the Gate checklist at the template's end.

## Phase 3 — L5 implementation

Invoke the **`openspec-apply-change`** skill (via the Skill tool) for this change and let it loop through tasks to completion. It already has the right pause semantics for this phase (pauses only on genuine ambiguity/errors/design issues, not per-task) — don't reimplement it. If it pauses on a design issue, that's a real escalation: go fix the upstream artifact (which may require re-doing the L3 approval if `design.md` itself changes) rather than working around it in `exec/`.

## Phase 4 — L7 hard gate: build / test / lint

This is a **machine** gate, run it yourself — don't ask the human and don't delegate it to a skill that doesn't run it:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)   # MUST be 21 — see below
E=openspec/changes/<name>/exec/evidence
./gradlew assemble > $E/build.log 2>&1
./gradlew test     > $E/test.log  2>&1
./gradlew check    > $E/lint.log  2>&1
```

(commands come from `openspec/project.json`'s `commands` — **read it rather than hardcoding**, in case it changes. The log filename must match the key name there: `L7/evidence-missing` requires `exec/evidence/<key>.log` for every key.)

**JDK 21 is mandatory and getting it wrong does not look like a version problem.** On a higher JDK the Gradle daemon makes palantir-java-format throw `palantir-java-format(java.lang.reflect.InvocationTargetException)`, pointing at a different file each run — it reads as "some files have bad formatting" and is not. If it persists after fixing `JAVA_HOME`, `./gradlew --stop` to kill the stale daemon. Also **run `./gradlew spotlessApply` before `check`** — hand-written line breaks are almost always judged violations, and that is formatting, not a code defect.

**If you have any reason to expect a pre-existing red — a check that was already failing on `main` before you touched anything — take the baseline FIRST, before writing evidence.** The verify template's red-light attribution asks you to prove it with `git stash push -u` → rerun the failing command → `git stash pop`, but **`git stash` touches the mtime of everything under `sourcePaths`** (`weiran-common`, `weiran-system`, `weiran-app`, `web` — see `project.json`), **and `L7/evidence-fresh` compares your evidence logs against exactly those mtimes**. Stash after writing the logs and all of them are invalidated at once — you will have to rerun every one, and the failure reads as "evidence is older than the sources" right after you just generated it, which looks like a broken checker rather than your own ordering. So: suspect a pre-existing red → baseline first, then evidence. No suspicion → just run the commands.

- All green → continue to Phase 5.
- Any red → **attribute before deciding**, per the table in the verify template: baseline green means you caused a regression (back to Phase 3, no exceptions); baseline equally red means it is pre-existing, which allows a conditional pass **only** if you record the baseline comparison in `verify.md`, log it in `openspec/state/waitlist.md` with symptoms, and flag it for the L9 human gate. Either way, if you go fix it, retry once. If the **same** check is still red after the retry, STOP and surface the failing log excerpt to the user instead of guessing further — this is the "反复失败才升级问人" rule, not "never ask."

## Phase 5 — L6+L8 verify (integration + spec consistency)

Generate the `verify` artifact via the generic instructions loop (again, not the mismatched `openspec-verify-change` skill). Integration was folded into this artifact — it is section 一 of the template, the consistency check is section 二.

Its instruction gates itself on `tasks.md` having no unchecked boxes — respect that (don't generate it early). Read `exec/notes/*.md` if any exist before writing it.

- **Section 一 (integration)**: scale it to the execution-unit count in `exec/plan.md`. One unit → write "单执行单元,无并行集成" plus the overreach roll-up and **delete the Merge 顺序 / 冲突清单 / 重复实现消除 / 被牺牲的方案 subsections entirely**. Two or more → fill them all. Judge overreach per the schema's necessary-vs-excessive distinction.
- **Section 二 (consistency)**: must end with one of 通过 / 打回实现 / 打回设计 per `check.mjs`'s `L8/verdict-line`, and must include the overreach check: diff the file set touched against exec/plan.md's declared ownership + notes' declared necessary-incidental changes.

- **通过** → Phase 6.
- **打回实现** → back to Phase 3, then re-run Phase 4-5.
- **打回设计** → STOP. This is a real design defect, not something to patch in `exec/`. Tell the user design needs reopening; if `design.md` is edited, its `approved_by`/`approved_at` no longer count — Phase 1's L3 gate must be re-earned before `tasks` can change again.

**Bugs discovered while actually verifying (not while planning)** — e.g. live browser testing, or HTTP-level probing, turns up a real defect that has to be fixed before the change can be called done. This is common precisely because L7's build/test/lint gate cannot detect "compiles fine, passes unit tests, but the feature has never actually worked" bugs (route ordering, response-shape mismatches, stale caches — the kind that only show up when something real gets exercised end to end). Don't retroactively backfill `exec/plan.md`'s task-mapping table for each one — that table exists to prevent parallel agents from silently stepping on each other, and a fix discovered solo during verification was never part of that coordination problem in the first place. Instead:

1. Fix it, verify it (build/test/lint + whatever surfaced the bug), same as any other fix.
2. Record it directly in `verify.md`'s own structure — the "不一致项归属判定" and/or a new subsection is exactly where this belongs, not a fabricated pre-planned task. Explain what was found, why, and the fix.
3. Add **one line** to `tasks.md` per discovery (so `L4/task-mapped`'s coverage check has something to point at), but don't touch `exec/plan.md`'s per-unit mapping table for it — reference `verify.md` instead of inventing an execution unit that never existed.
4. If `check.mjs` still complains that the line isn't mapped, that's an acceptable, expected warning for this scenario — read it, confirm it's this exact case, and move on rather than manufacturing a fake exec-plan entry to silence it.

This holds regardless of how the change was split — the underlying reason (no parallel-coordination risk for something one agent found and fixed alone) does not depend on it.

## Phase 6 — L9 hard human gate: final diff review

Never skip this and never let `openspec-archive-change` stand in for it (it doesn't ask). Show the user:

```bash
git status --short
git diff --stat
```

and offer to show the full diff on request. Explicitly ask (AskUserQuestion or plain question) for sign-off to archive. Do not proceed to Phase 7 without an explicit yes.

## Phase 7 — L10 archive

Archive with the **native CLI**, not the `openspec-archive-change` / `openspec-sync-specs` skills:

1. `node openspec/check.mjs --change "<name>"` — must be clean (or only warnings) before archiving.
2. ```bash
   openspec archive "<name>"
   ```
   It merges the delta specs into `openspec/specs/` **and** moves the change into `changes/archive/` in one step. Do not run a separate sync beforehand and do not `mv` the directory yourself — both are what `openspec archive` already does.
3. **If the archive created any new main spec** (`openspec/specs/<cap>/spec.md` that did not exist before), add its frontmatter yourself — `openspec archive` does not write it:
   ```yaml
   ---
   status: "active"
   ---
   ```
   `L10/spec-status` fails without it. Values: `active` / `partial` (known gap, describe it in Purpose) / `superseded` (requires `superseded_by: <capability>`).
4. **Regenerate the capability index** — `openspec archive` does not touch it:
   ```bash
   node openspec/check.mjs --write-index
   ```
   This rewrites `openspec/specs/README.md`. Run it whenever the archive added, removed, renamed a capability, or changed any spec's `status`. `L10/spec-index` fails if it is stale, so this is not optional — but never hand-edit that file, since a hand-edited index goes stale again at the next archive.
5. `node openspec/check.mjs` — confirms `L10/archive-fidelity` still reconciles after the merge, that every main spec has a `status`, and that the index is current.

**Why the CLI and not the skills.** `openspec archive` merges programmatically (`buildUpdatedSpec`): ADDED requirements are copied verbatim, a MODIFIED naming a requirement the spec doesn't have throws `MODIFIED failed - not found`, a MODIFIED that drops a scenario throws, and main specs are snapshotted so a failed archive rolls back. The `openspec-archive-change` skill instead does `mv` plus an agent-written merge (`openspec-sync-specs` is explicitly "agent-driven … directly edit main specs"), which drifts: replaying this repo's archived deltas found one requirement dropped outright, one requirement name silently reworded, one number in a title changed 18→16, and five deltas the CLI would have rejected. All of them pass `openspec validate` afterwards, so nothing downstream notices. See `openspec/project.json` → `capabilities.knownArchiveDrift`.

If `openspec archive` refuses, that refusal is the point — fix the delta rather than falling back to the skill or to `mv`. `--no-validate` defeats the entire reason for using it.

## Phase 8 — Merge (only when the user asks to push / open a PR / merge)

Archiving is **not** the end of the line when the work has to reach `main`. This phase exists
because `main` moves while you work: this pipeline's planning-to-archive run routinely takes
hours, and the L7 evidence you archived describes **your branch in isolation**, not the state
that will actually land.

Do not enter this phase on your own initiative — commit, push, and merge only when the user
asks (see the harness's git rules). When they do:

1. **Rebase onto the current remote main before anything else:**
   ```bash
   git fetch origin && git rebase origin/main
   ```
2. **`openspec/specs/README.md` conflicts are expected and are never hand-merged.** Both branches
   regenerate the capability index when they archive, so it conflicts whenever two changes land
   near each other. Resolve it by regenerating:
   ```bash
   node openspec/check.mjs --write-index && git add openspec/specs/README.md
   ```
   Hand-merging it produces an index that is stale again at the next archive — the same reason
   Phase 7 forbids hand-editing it. Afterwards confirm the regenerated index contains **both**
   sides' capabilities, not just yours.
3. **Re-run the full L7 gate on the rebased state** — `build` / `test` / `lint` per
   `openspec/project.json`'s `commands`. This is the whole point of the phase: the rebase pulled in
   code your archived evidence never covered, and it can be code that touches the same Gradle modules
   you did. **`L7/evidence-fresh` cannot catch this** — it compares evidence timestamps against the
   `sourcePaths` mtimes, which say nothing about commits rebased in from someone else.
   Red here means fix it before merging, exactly like Phase 4.
4. Only then push (`--force-with-lease` after a rebase) and open the PR.
5. **Wait for CI to actually finish before merging.** A PR can report `MERGEABLE` while its checks
   are still pending (`mergeStateStatus: UNSTABLE`); merge only at `CLEAN`, or when the user
   explicitly says to merge regardless.
6. **After the PR is confirmed merged**, delete the remote branch if your workflow does not do it
   automatically. There is no worktree to tear down in this repo (see Phase 0 step 2).

Do **not** re-run Phase 7's archive steps here — the change is already archived and its evidence
logs are a historical record of the branch as verified. The re-run in step 3 is a merge-time gate,
not a rewrite of that record; if it turns up a real failure, that is a code problem to fix, and the
fix goes through the normal L5 → L7 → L8 path before merging.

## Guardrails

- Never trust `status --json` alone for L3/L9 — always read the actual file/diff yourself at those two points.
- Never generate `verify` via the generic `openspec-verify-change`/`openspec-archive-change` skills — use the direct instructions-loop so the output matches this schema's templates and `check.mjs` checks.
- Never archive with `openspec-archive-change`, `openspec-sync-specs`, or a hand-written `mv` — only `openspec archive "<name>"`. Those paths hand the spec merge to an agent and bypass the CLI's verbatim-copy, not-found, and dropped-scenario guards.
- Don't skip L1 explore, don't skip L4 contract freeze, don't merge N tasks into one exec unit — same reasons as documented in `pipeline.md` §L1/§L4, this skill doesn't relax those, only the human-input cadence.
- If at any point `openspec status --json` reports a schema other than `devops-workflow`, stop and report rather than improvising a different pipeline.
- Never skip the Phase 0 `git fetch`, and never merge without the Phase 8 rebase + L7 re-run. Both
  guard the same failure: **evidence that describes a code state which no longer exists.** The
  archived `exec/evidence/*.log` proves your branch worked in isolation; it proves nothing about the
  merged result.
- Never do Phase 1-7 work for a change directly in the main workspace, "just this once," because the
  change is nearly done or the remaining work looks small. Worktree-per-change has no size exception
  — see Phase 0 steps 1-3 and `rules/enforced/project.md` §二.
- Never start a second change against this checkout while another is mid-flight (Phase 0 step 2) —
  without worktree isolation, the only thing keeping the two apart is you.
- `openspec/specs/README.md` is generated. It is never hand-edited and never hand-merged — not in
  Phase 7, not when resolving a rebase conflict in Phase 8.
- One AskUserQuestion/plain question per real gate (L0 open items, L3 approval, L7 repeated failure, L8 打回设计, L9 sign-off) — everything else should proceed without asking "should I continue?".
- Never edit the sibling reference repos (`weiran-v1`, `mono4ts`) from this session. They are
  **read-only** sources of truth: `weiran-v1` for the PHP-side schema/Model cross-check CP-7 requires,
  `mono4ts` for where this pipeline came from. Read them, cite them, never write to them.
- Archiving and opening a PR are not the same thing as the change being merged — Phase 8 is not
  optional just because the pipeline "feels done" once the PR is open.

# E4: ci-docs

## 完成的 tasks.md 条目

- `6.1` `.github/workflows/ci.yml`
- `6.2` 宪法 CP-8 修订
- `6.3` D-014
- `6.4` artifact.md #02 / #05
- `8.1`(D-014 部分):发布影响写进 D-014

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `.github/workflows/ci.yml` | 新增 | backend / web / openspec 三个并行 job;`concurrency` 取消旧运行;`permissions: contents: read` |
| `openspec/rules/enforced/constitution.md` | 改造 | CP-8 标题不变;正文拆「本地签发的令牌」(补「不得经过跨请求缓存」)与「联邦令牌」(≤ 15 分钟、签发方吊销、实现前只允许本地 verifier);「为什么」补多实例缓存窗口 |
| `weiran4j/docs/00-决策记录.md` | 改造 | D-014(6 条决定 + 放弃项 + 发布影响) |
| `openspec/state/bizs/artifact.md` | 改造 | #02 → 🟡 部分解决并改写症状;#05 → ✅ 移入 §7 changelog |

## 为什么这么做

- CI 的 Node 版本:仓库没有 `.nvmrc` / `engines`,取当前 LTS 22;pnpm 版本由 `pnpm/action-setup` 读 `packageManager`,与本地一致。
- changelog 里提到 #02 的那一行写成「同批:#02 …」而不是 `- #02 …`:`state-waitlist` 守卫按行首 `- #NN` 识别条目,后者会被判重号(第一次就撞上了,`REPO/state-id-dup`)。

## 依赖的契约

- plan §4 的配置键与 Cookie 约定(D-014 引用)。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- [ ] 本机没有 `actionlint`,`ci.yml` 只做了 YAML 解析校验(三个 job、`on.pull_request/push.branches == [main]`);真正能否跑通要等第一次 PR。
- [ ] 分支保护仍未配置(artifact.md#12),CI 红了也能合。

## 自测结果

- `python3 -c "import yaml; …"`:解析成功,jobs = backend / web / openspec
- `node openspec/check.mjs`:全部通过

#!/bin/sh
# 下游边界检查：暂存区里改到「上游 upstream/main 已有的文件」时拦截（见 AGENTS.biz.md 第 1 条）。
# 判据：文件在 upstream/main 的树里存在 = 上游文件。下游自有文件上游永不创建，因此不会误判。
#
# 放行：
#   - 合并上游时（存在 MERGE_HEAD）不查——那正是同步上游的提交；
#   - 下面 ALLOWED 列出的上游文件（契约 §2.2 规定下游追加行的登记表、已知缺口 artifact.md#20，
#     以及归档后由 `node openspec/check.mjs --write-index` 重新生成的能力索引——生成物，同步冲突时重新生成，不手工合并）；
#   - 应急：ALLOW_UPSTREAM_EDIT=1 git commit ...（事后要回 weiran4j 修，再 merge 回来）。

ALLOWED='weiran4j/docs/business-modules.md
openspec/state/bizs/artifact.md
openspec/state/bizs/cross-biz.md
openspec/specs/README.md'

git_dir=$(git rev-parse --git-dir)
[ -f "$git_dir/MERGE_HEAD" ] && exit 0
[ "${ALLOW_UPSTREAM_EDIT:-}" = "1" ] && exit 0

if ! git rev-parse --verify -q upstream/main >/dev/null; then
  echo "upstream-boundary: 找不到 upstream/main，跳过检查（先 git fetch upstream）"
  exit 0
fi

violations=$(git diff --cached --name-only --diff-filter=MDR | while IFS= read -r f; do
  echo "$ALLOWED" | grep -qxF "$f" && continue
  git cat-file -e "upstream/main:$f" 2>/dev/null && echo "  $f"
done)

[ -z "$violations" ] && exit 0

echo "upstream-boundary: 本次提交改动了上游（weiran4j）的文件："
echo "$violations"
echo "下游只能在契约 §2.2「下游扩展入口」的位置落改动；框架问题请回 weiran4j 修再 merge。"
echo "应急绕过：ALLOW_UPSTREAM_EDIT=1 git commit ..."
exit 1

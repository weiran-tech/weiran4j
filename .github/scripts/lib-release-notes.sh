#!/usr/bin/env bash
set -euo pipefail

tag="${1:?请提供 lib-v 标签}"
version="${tag#lib-v}"
repository="${GITHUB_REPOSITORY:-weiran-tech/weiran4j}"
if [[ ! "$tag" =~ ^lib-v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "tag 必须形如 lib-v1.2.3" >&2
  exit 1
fi

curated_notes=".github/release-notes/${tag}.md"
if [[ -f "$curated_notes" ]]; then
  cat "$curated_notes"
  exit 0
fi

previous_tag="$(git describe --tags --match 'lib-v*' --abbrev=0 "${tag}^" 2>/dev/null || true)"
printf '组件包已发布到 GitHub Packages：`com.wulicode.weiran:weiran-dependencies:%s`。\n' "$version"

if [[ -z "$previous_tag" ]]; then
  printf '\n首个组件包版本。\n'
  exit 0
fi

while IFS= read -r subject; do
  if ! python3 -c 'import re, sys; sys.exit(0 if re.search("[\u4e00-\u9fff]", sys.argv[1]) else 1)' "$subject"; then
    printf '提交标题缺少中文，请新增 %s 编写中文发布说明：%s\n' "$curated_notes" "$subject" >&2
    exit 1
  fi
done < <(git log --no-merges --format='%s' "${previous_tag}..${tag}")

printf '\n## 本版改动\n\n'
git log --no-merges --format="- %s ([%h](https://github.com/${repository}/commit/%H))" "${previous_tag}..${tag}"
printf '\n[完整变更](https://github.com/%s/compare/%s...%s)\n' "$repository" "$previous_tag" "$tag"

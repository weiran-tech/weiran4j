#!/usr/bin/env bash
set -euo pipefail

tag="${1:?请提供 lib-v 标签}"
version="${tag#lib-v}"
repository="${GITHUB_REPOSITORY:-weiran-tech/weiran4j}"
if [[ ! "$tag" =~ ^lib-v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "tag 必须形如 lib-v1.2.3" >&2
  exit 1
fi

previous_tag="$(git describe --tags --match 'lib-v*' --abbrev=0 "${tag}^" 2>/dev/null || true)"
printf '组件包已发布到 GitHub Packages：`com.wulicode.weiran:weiran-dependencies:%s`。\n' "$version"

if [[ -z "$previous_tag" ]]; then
  printf '\n首个组件包版本。\n'
  exit 0
fi

printf '\n## 本版改动\n\n'
git log --no-merges --format="- %s ([%h](https://github.com/${repository}/commit/%H))" "${previous_tag}..${tag}"
printf '\n[完整变更](https://github.com/%s/compare/%s...%s)\n' "$repository" "$previous_tag" "$tag"

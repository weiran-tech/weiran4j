#!/bin/sh
# 将主仓已提交的原型目录导出为可独立克隆的仓库，不包含主仓其他目录。
set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"

repository=${RP_SUBTREE_REPOSITORY:-https://github.com/weiran-tech/rp-example.git}
git subtree push --prefix=packages/rp "$repository" main

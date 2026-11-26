/** subtree 导出会重写提交 SHA；根目录树相同的提交仍代表同一份版本源码。 */
export function resolveVersionRef(ref, tree, direct, commits) {
    if (direct(ref)) return ref;
    if (!/^[a-f0-9]{40}$/.test(tree ?? '')) throw new Error(`版本基准提交不存在：${ref}；subtree 来源需登记对应目录树`);
    const match = commits().find(item => item.tree === tree);
    if (!match) throw new Error(`历史中找不到版本源码目录树：${tree}；请拉取完整历史`);
    return match.commit;
}

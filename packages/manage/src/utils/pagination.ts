/** 分页总条目数：空结果也明确显示 0 条。 */
export function formatPaginationTotal({ total = 0 }: { total?: number } = {}): string {
    return `共 ${total} 条`;
}

/** Errors contain only test-owned descriptions, never response bodies. */
export function requireValue(condition, message = 'API 契约断言失败') {
    if (!condition) throw new Error(message);
}
export function ok(response) {
    requireValue(response?.status === 200 && response.payload?.code === 0, 'API 成功状态或数字 code 无效');
    return response.payload.data;
}
export function error(response, status, code) {
    requireValue(response?.status === status && response.payload?.code === code, 'API 错误状态或数字 code 不匹配');
}
export function id(value) {
    requireValue((typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
        || (typeof value === 'string' && /^[1-9]\d*$/.test(value)), 'API 资源 ID 无效');
    return String(value);
}
export function array(value) { requireValue(Array.isArray(value), 'API 数组契约无效'); return value; }
export function page(value, expectedPage = 1, expectedSize = 2) {
    requireValue(value && Number.isSafeInteger(value.total) && value.total >= 0
        && value.page === expectedPage && value.pageSize === expectedSize, 'API 分页字段无效');
    const rows = array(value.list);
    requireValue(rows.length <= value.pageSize && rows.length <= value.total, 'API 分页数量无效');
    rows.forEach((row) => id(row.id));
    return rows;
}
export function tree(value, parent = '0', seen = new Set()) {
    const rows = array(value), flat = [];
    for (const row of rows) {
        const key = id(row.id);
        requireValue(!seen.has(key) && String(row.parentId) === parent, 'API 树父子关系或唯一性无效');
        seen.add(key); flat.push(row);
        if (row.children !== undefined && row.children !== null) flat.push(...tree(row.children, key, seen));
    }
    return flat;
}

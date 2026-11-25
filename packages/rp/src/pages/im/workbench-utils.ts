/** IM 页面共用的小工具 */

export function formatMoney(value: number): string {
    return `¥${value.toLocaleString('zh-CN')}`;
}

export function currentTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

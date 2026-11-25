/** 两端统一使用分做金额运算，避免浮点和隐式四舍五入。 */
export function parseRefund(value, remainingCents) {
    if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return { error: '请输入最多两位小数的有效金额' };
    const [yuan, fraction = ''] = value.trim().split('.');
    const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(cents) || cents <= 0) return { error: '退款金额必须大于 0' };
    if (cents > remainingCents) return { error: '不能超过剩余可退金额' };
    return { cents };
}
export const money = (cents) => (cents / 100).toFixed(2);

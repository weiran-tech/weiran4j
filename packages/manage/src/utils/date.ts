import dayjs from 'dayjs';

/** 契约 §4 的时间格式 */
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** DatePicker 的时间范围 → startTime/endTime 查询参数 */
export function toTimeRange(range: Date[] | undefined): { startTime?: string; endTime?: string } {
    const [start, end] = range ?? [];
    return {
        ...(start ? { startTime: dayjs(start).format(DATE_TIME_FORMAT) } : {}),
        ...(end ? { endTime: dayjs(end).format(DATE_TIME_FORMAT) } : {}),
    };
}

/**
 * 按天选择的日期范围 → 整天边界的查询参数：开始取当天 00:00:00，结束取当天 23:59:59（结束日包含当天整天）。
 * 与 `toTimeRange` 的区别：后者原样格式化（日期时间选择器用），这里只认日期、补齐时分秒。
 */
export function toDayRange(range: Date[] | undefined): { start?: string; end?: string } {
    const [start, end] = range ?? [];
    return {
        ...(start ? { start: dayjs(start).startOf('day').format(DATE_TIME_FORMAT) } : {}),
        ...(end ? { end: dayjs(end).endOf('day').format(DATE_TIME_FORMAT) } : {}),
    };
}

/** 时间范围的标签文本（已选条件用）：两端「开始 ~ 结束」，只有一端时「≥ 开始」/「≤ 结束」；未选返回 null */
export function formatTimeRange(range: Date[] | undefined, pattern = DATE_TIME_FORMAT): string | null {
    const [start, end] = range ?? [];
    const fmt = (d: Date) => dayjs(d).format(pattern);
    if (start && end) return `${fmt(start)} ~ ${fmt(end)}`;
    if (start) return `≥ ${fmt(start)}`;
    if (end) return `≤ ${fmt(end)}`;
    return null;
}

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

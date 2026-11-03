import { describe, expect, it } from 'vitest';
import { formatTimeRange, toDayRange, toTimeRange } from '../date';

describe('toDayRange', () => {
    it('开始取当天 00:00:00，结束取当天 23:59:59（与所选时刻无关）', () => {
        expect(toDayRange([new Date(2026, 8, 1, 15, 30, 12), new Date(2026, 8, 27, 0, 0, 0)])).toEqual({
            start: '2026-09-01 00:00:00',
            end: '2026-09-27 23:59:59',
        });
    });

    it('同一天：覆盖整天；只有一端时只返回那一端；未选返回空对象', () => {
        expect(toDayRange([new Date(2026, 8, 27), new Date(2026, 8, 27)])).toEqual({
            start: '2026-09-27 00:00:00',
            end: '2026-09-27 23:59:59',
        });
        expect(toDayRange([new Date(2026, 8, 27)])).toEqual({ start: '2026-09-27 00:00:00' });
        expect(toDayRange(undefined)).toEqual({});
        expect(toDayRange([])).toEqual({});
    });

    it('不影响日志页在用的 toTimeRange（原样格式化）', () => {
        expect(toTimeRange([new Date(2026, 8, 1, 15, 30, 12)])).toEqual({ startTime: '2026-09-01 15:30:12' });
    });
});

describe('formatTimeRange', () => {
    it('两端「开始 ~ 结束」，单端 ≥ / ≤，未选 null；可指定格式', () => {
        const a = new Date(2026, 8, 1, 8, 0, 0);
        const b = new Date(2026, 8, 2, 18, 30, 0);
        expect(formatTimeRange([a, b])).toBe('2026-09-01 08:00:00 ~ 2026-09-02 18:30:00');
        expect(formatTimeRange([a])).toBe('≥ 2026-09-01 08:00:00');
        expect(formatTimeRange([undefined as unknown as Date, b], 'YYYY-MM-DD')).toBe('≤ 2026-09-02');
        expect(formatTimeRange(undefined)).toBeNull();
    });
});

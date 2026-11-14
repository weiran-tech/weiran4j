import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedCallback, useSingleFlightCallback } from '../useActionGuard';

afterEach(() => vi.useRealTimers());

describe('action guards', () => {
    it('locks immediately through a long request and preserves its result', async () => {
        vi.useFakeTimers();
        let finish!: (value: string) => void;
        const callback = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
        const { result } = renderHook(() => useSingleFlightCallback(callback));
        const pending = result.current();
        await result.current();
        vi.advanceTimersByTime(1000);
        await result.current();
        expect(callback).toHaveBeenCalledOnce();
        finish('saved');
        expect(await pending).toBe('saved');
    });

    it('blocks rapid completed calls and unlocks after failures', async () => {
        vi.useFakeTimers();
        const callback = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue('retried');
        const { result } = renderHook(() => useSingleFlightCallback(callback));
        await expect(result.current()).rejects.toThrow('failed');
        await result.current();
        expect(callback).toHaveBeenCalledOnce();
        vi.advanceTimersByTime(300);
        expect(await result.current()).toBe('retried');
    });

    it('combines button and Enter search with the latest committed conditions', () => {
        vi.useFakeTimers();
        const callback = vi.fn();
        const { result, rerender } = renderHook(({ keyword }) => useDebouncedCallback(() => callback(keyword)), { initialProps: { keyword: 'first' } });
        void act(() => result.current.schedule());
        void act(() => vi.advanceTimersByTime(200));
        rerender({ keyword: 'last' });
        void act(() => result.current.schedule());
        void act(() => vi.advanceTimersByTime(299));
        expect(callback).not.toHaveBeenCalled();
        void act(() => vi.advanceTimersByTime(1));
        expect(callback).toHaveBeenCalledExactlyOnceWith('last');
    });

    it('cancels a queued search on reset and unmount', () => {
        vi.useFakeTimers();
        const callback = vi.fn();
        const { result, unmount } = renderHook(() => useDebouncedCallback(callback));
        void act(() => { result.current.schedule(); result.current.cancel(); });
        void act(() => vi.advanceTimersByTime(300));
        expect(callback).not.toHaveBeenCalled();
        void act(() => result.current.schedule());
        unmount();
        void act(() => vi.advanceTimersByTime(300));
        expect(callback).not.toHaveBeenCalled();
    });
});

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/** 首次立即执行；同一实例进行中的调用和 300ms 内的连点被忽略，失败仍向调用方传播。 */
export function useSingleFlightCallback<Args extends unknown[], Result>(callback: (...args: Args) => Result, interval = 300) {
    const latest = useRef(callback);
    const running = useRef(false);
    const started = useRef(-Infinity);
    useLayoutEffect(() => { latest.current = callback; }, [callback]);
    return useCallback(async (...args: Args): Promise<Awaited<Result> | undefined> => {
        if (running.current || Date.now() - started.current < interval) return;
        running.current = true;
        started.current = Date.now();
        try {
            return await latest.current(...args);
        } finally {
            running.current = false;
        }
    }, [interval]);
}

/** 仅在最后一次操作后执行；卸载和主动重置时取消，使用最新已提交的回调。 */
export function useDebouncedCallback<Args extends unknown[]>(callback: (...args: Args) => void, delay = 300) {
    const latest = useRef(callback);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useLayoutEffect(() => { latest.current = callback; }, [callback]);
    const cancel = useCallback(() => {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = null;
    }, []);
    useEffect(() => cancel, [cancel, delay]);
    const schedule = useCallback((...args: Args) => {
        cancel();
        timer.current = setTimeout(() => {
            timer.current = null;
            latest.current(...args);
        }, delay);
    }, [cancel, delay]);
    return { schedule, cancel };
}

import { useCallback, useSyncExternalStore } from 'react';
import { mediaDown } from '@/lib/breakpoints';

function getMatches(query: string): boolean {
    if (typeof globalThis.matchMedia !== 'function') return false;
    return globalThis.matchMedia(query).matches;
}

/**
 * 订阅一个 CSS media query，返回当前是否匹配。
 *
 * 用 useSyncExternalStore 订阅 `change` 事件：首次渲染即读取真实值（不会桌面 ↔ 移动闪一下），
 * 也不存在 render 与订阅之间漏掉变化的窗口。无 `matchMedia` 的环境返回 false。
 * 断点从 `@/lib/breakpoints` 取，不要硬编码。
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (typeof globalThis.matchMedia !== 'function') return () => {};
            const mql = globalThis.matchMedia(query);
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        },
        [query],
    );
    return useSyncExternalStore(subscribe, () => getMatches(query), () => false);
}

/** 是否为移动端宽度（< 768px） */
export function useIsMobile(): boolean {
    return useMediaQuery(mediaDown('md'));
}

/** 系统是否偏好深色（prefers-color-scheme: dark）；主题的 system 模式跟随它 */
export function usePrefersDark(): boolean {
    return useMediaQuery('(prefers-color-scheme: dark)');
}

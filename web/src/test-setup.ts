import '@douyinfe/semi-ui/react19-adapter';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
});

/**
 * jsdom 不实现 Canvas 2D 上下文，Semi 部分组件内部会取它；给最小 stub，只求不崩。
 */
if (typeof HTMLCanvasElement !== 'undefined') {
    const fakeContext = new Proxy(
        {},
        {
            get: () => () => undefined,
            set: () => true,
        },
    );
    HTMLCanvasElement.prototype.getContext = (() => fakeContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

/** jsdom 不实现 ResizeObserver，Semi 的 Table / Form 等挂载时会用到 */
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

/** jsdom 不实现 matchMedia，Semi 的响应式组件会调用 */
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query: string) =>
        ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }) as MediaQueryList;
}

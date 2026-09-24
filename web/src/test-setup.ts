import '@testing-library/jest-dom/vitest';

/**
 * jsdom 不实现 Canvas 2D 上下文，而 Semi Design 的部分组件（如 `Avatar` 的加载动画）
 * 内部用 `lottie-web` 做动效，未取到 context 会在渲染时直接抛 TypeError 崩掉整个测试文件——
 * 不是被测代码的 bug，是测试环境缺失浏览器能力。给最小可用的 stub 而不装
 * `jest-canvas-mock` 这类专门的包：这里只需要不崩，不需要真的绘制。
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

/**
 * jsdom 不实现 `ResizeObserver`，而 Semi Design 的布局类组件（`Form`、`Card` 等）
 * 内部用它监听容器尺寸变化——未取到构造函数会在挂载时直接抛 ReferenceError 崩掉整个测试文件，
 * 同样不是被测代码的 bug。给最小可用的 no-op 实现。
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

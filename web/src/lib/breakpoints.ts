/** 响应式断点（px）。CSS 侧的同源定义在 styles/breakpoints.css，改一处必须同步另一处。 */
export const BREAKPOINTS = {
    xs: 480,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** 小于该断点的 media query，与 CSS 的 `--<bp>-down` 一致 */
export function mediaDown(bp: Breakpoint): string {
    return `(max-width: ${BREAKPOINTS[bp] - 1}px)`;
}

/** 大于等于该断点的 media query，与 CSS 的 `--<bp>-up` 一致 */
export function mediaUp(bp: Breakpoint): string {
    return `(min-width: ${BREAKPOINTS[bp]}px)`;
}

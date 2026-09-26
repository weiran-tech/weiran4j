/**
 * 页面组件注册表
 *
 * 通过 Vite `import.meta.glob` 收集 `src/pages/**` 下的页面组件，
 * 提供「菜单 component 字段 → 懒加载组件」的解析。
 *
 * 组件路径约定（契约 §5）：相对 `src/pages`，不含前导 `/` 与 `.tsx`，
 * 例如 `system/users/UsersPage`。
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type PageModule = { default: ComponentType };
type PageModuleLoader = () => Promise<PageModule>;

// 必须排除 __tests__：glob 结果就是打包图，测试文件会被编译成独立 chunk 发到线上，
// 连带把 vitest / @testing-library 拖进浏览器产物。
const pageModules = import.meta.glob<PageModule>(['../pages/**/*.tsx', '!../pages/**/__tests__/**']);

/** 归一化组件路径：去除前导斜杠与 .tsx 后缀 */
export function normalizeComponentPath(component: string): string {
    return component.trim().replace(/^\/+/, '').replace(/\.tsx$/, '');
}

/** 解析组件路径为动态 import loader；不存在时返回 null */
export function resolvePageLoader(component: string | null | undefined): PageModuleLoader | null {
    if (!component) return null;
    const key = `../pages/${normalizeComponentPath(component)}.tsx`;
    return pageModules[key] ?? null;
}

export function hasPageComponent(component: string | null | undefined): boolean {
    return resolvePageLoader(component) !== null;
}

// React.lazy 必须引用稳定，否则每次渲染都会重新挂载页面
const lazyCache = new Map<string, LazyExoticComponent<ComponentType>>();

/** 解析组件路径为 React.lazy 组件（按路径缓存）；不存在时返回 null */
export function lazyPageComponent(component: string | null | undefined): LazyExoticComponent<ComponentType> | null {
    const loader = resolvePageLoader(component);
    if (!loader || !component) return null;
    const key = normalizeComponentPath(component);
    let cached = lazyCache.get(key);
    if (!cached) {
        cached = lazy(loader);
        lazyCache.set(key, cached);
    }
    return cached;
}

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type PageModule = { default: ComponentType };
export type PageModuleLoader = () => Promise<PageModule>;

// loader 由注册表或调用方稳定提供；正常重开复用已完成的 lazy，恢复时才创建新实例。
const cache = new WeakMap<PageModuleLoader, LazyExoticComponent<ComponentType>>();

export function lazyPageFromLoader(loader: PageModuleLoader, retry = false): LazyExoticComponent<ComponentType> {
    const existing = cache.get(loader);
    if (existing && !retry) return existing;
    const page = lazy(() => loader().catch((error: unknown) => {
        // 旧请求晚于新实例失败时，不得删掉已建立的新缓存。
        if (cache.get(loader) === page) cache.delete(loader);
        throw error;
    }));
    cache.set(loader, page);
    return page;
}

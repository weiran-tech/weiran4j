import { sourceCatalog as catalog } from './source-catalog';
import { pathVersion, versionBase } from '../../prototype/routes.mjs';
export const runtimeVersion = import.meta.env.VITE_PROTOTYPE_VERSION || catalog.current;
export const runtimeStorageId = import.meta.env.VITE_PROTOTYPE_ARCHIVE_ID || `${runtimeVersion}-work`;
// 开发服务器只映射当前版本；生产构建由 Vite 写入真实的独立资源前缀。
export let routeVersion = typeof window !== 'undefined' ? pathVersion(window.location.pathname) : null;
export let runtimeBase = routeVersion ? versionBase(routeVersion) : import.meta.env.BASE_URL;
export const storageKey = (key: string) => `${key}_${runtimeStorageId}`;

/** 只更新协作阅读上下文，实际构建编号和存储隔离键始终不变。 */
export function syncRuntimeLocation() {
    if (import.meta.env.BASE_URL.startsWith('/releases/')) return;
    routeVersion = pathVersion(window.location.pathname);
    runtimeBase = routeVersion ? versionBase(routeVersion) : '/';
}

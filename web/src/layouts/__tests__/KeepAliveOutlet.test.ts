import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MAX_CACHED_PAGES, nextCache, type CacheEntry } from '../KeepAliveOutlet';

const el = (path: string) => createElement('div', null, path);
const visit = (cache: readonly CacheEntry[], path: string, open: string[], opts: { cacheable?: boolean; version?: number } = {}) =>
    nextCache(cache, { path, element: el(path), version: opts.version ?? 0, cacheable: opts.cacheable ?? true }, new Set(open));

describe('KeepAliveOutlet nextCache', () => {
    it('可缓存页首次进入入缓存；再次进入复用同一实例（element 不换）', () => {
        const a = visit([], '/a', ['/a']);
        expect(a.map((e) => e.path)).toEqual(['/a']);
        const b = visit(a, '/b', ['/a', '/b']);
        const back = visit(b, '/a', ['/a', '/b']);
        expect(back.find((e) => e.path === '/a')?.element).toBe(a[0]?.element);
    });

    it('无变化时返回原数组（引用不变），避免渲染期反复 setState', () => {
        const a = visit([], '/a', ['/a']);
        expect(visit(a, '/a', ['/a'])).toBe(a);
    });

    it('不可缓存的页面不入缓存，但不影响已缓存的', () => {
        const a = visit([], '/a', ['/a']);
        const next = visit(a, '/plain', ['/a', '/plain'], { cacheable: false });
        expect(next.map((e) => e.path)).toEqual(['/a']);
    });

    it('页签关闭即释放', () => {
        const ab = visit(visit([], '/a', ['/a']), '/b', ['/a', '/b']);
        expect(visit(ab, '/b', ['/b']).map((e) => e.path)).toEqual(['/b']);
    });

    it('刷新（版本号变化）重建：换成新的 element', () => {
        const a = visit([], '/a', ['/a']);
        const refreshed = visit(a, '/a', ['/a'], { version: 1 });
        expect(refreshed[0]?.version).toBe(1);
        expect(refreshed[0]?.element).not.toBe(a[0]?.element);
    });

    it(`超过 ${MAX_CACHED_PAGES} 个淘汰最久没访问的`, () => {
        const paths = Array.from({ length: MAX_CACHED_PAGES + 1 }, (_, i) => `/p${i}`);
        let cache: readonly CacheEntry[] = [];
        for (const p of paths) cache = visit(cache, p, paths);
        expect(cache).toHaveLength(MAX_CACHED_PAGES);
        expect(cache.some((e) => e.path === '/p0')).toBe(false);
    });
});

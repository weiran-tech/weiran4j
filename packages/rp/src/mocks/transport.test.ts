import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, MOCK_STORAGE_KEY } from './transport';
import { getSession } from '@/utils/session';
import { signIn } from '@/test/session';
import { menus } from './seed';
import { hasPageComponent } from '@/utils/page-registry';
import type { MenuNode, UserView, PageResult, IdResult } from '@/types/api';

vi.unmock('@/mocks/transport');
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await mockFetch(`/api-backend/${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json() as { code: number; data: T };
    expect(result.code).toBe(0);
    return result.data;
}
beforeEach(() => { localStorage.clear(); });

describe('独立原型数据流', () => {
    it('未登录拒绝受保护操作，登录校验后建立独立会话', async () => {
        const denied = await mockFetch('/api-backend/system/user/list');
        expect(denied.status).toBe(401);
        const wrong = await mockFetch('/api-backend/n/system/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'wrong' }) });
        expect((await wrong.json() as { code: number }).code).toBe(110101);
        await call('n/system/auth/login', 'POST', { username: 'admin', password: 'admin123' });
        expect(getSession()).toBe('1.prototype');
        expect((await call<PageResult<UserView>>('system/user/list')).total).toBe(28);
    });

    it('所有种子菜单都指向存在的页面入口', () => {
        function check(nodes: MenuNode[]) { nodes.forEach((node) => { if (node.component) expect(hasPageComponent(node.component), node.component).toBe(true); check(node.children); }); }
        check(menus);
    });

    it('用户增删改、筛选与分页保存到本地', async () => {
        signIn();
        const created = await call<IdResult>('system/user/create', 'POST', { username: 'prototype-user', nickname: '新用户', roleIds: [2] });
        await call(`system/user/update/${created.id}`, 'PUT', { nickname: '更新用户' });
        const found = await call<PageResult<UserView>>('system/user/list?keyword=prototype-user&page=1&pageSize=10');
        expect(found.total).toBe(1);
        expect(found.list[0]?.nickname).toBe('更新用户');
        expect(localStorage.getItem(MOCK_STORAGE_KEY)).toContain('更新用户');
        await call(`system/user/delete/${created.id}`, 'DELETE');
        expect((await call<PageResult<UserView>>('system/user/list?keyword=prototype-user')).total).toBe(0);
    });

    it('保存偏好、收藏与字典项', async () => {
        signIn();
        await call('system/auth/updatePreferences', 'PUT', { colorMode: 'dark' });
        expect(await call('system/auth/getPreferences')).toEqual({ colorMode: 'dark' });
        await call('system/auth/updateFavoriteMenus', 'PUT', { menuIds: [1, 1, 2] });
        expect(await call('system/auth/listFavoriteMenus')).toEqual([1, 2]);
        const created = await call<IdResult>('system/dict/createItem/2', 'POST', { label: '已完成', value: 'done' });
        const items = await call<Array<{ id: number }>>('system/dict/listItemsByCode/business_status');
        expect(items.some((item) => item.id === created.id)).toBe(true);
    });

    it('地区导出生成经过筛选的 CSV', async () => {
        signIn();
        const response = await mockFetch('/api-backend/region/area/export?keyword=杭州');
        expect(response.headers.get('Content-Type')).toContain('text/csv');
        const csv = await response.text();
        expect(csv).toContain('杭州市');
        expect(csv).not.toContain('西湖区');
    });

    it('批处理返回可浏览的模拟结果，序号在本地递增', async () => {
        signIn();
        const form = new FormData(); form.append('kind', 'demo_excel'); form.append('file', new File(['mock'], 'sample.xlsx'));
        const response = await mockFetch('/api-backend/system/batchJob/create', { method: 'POST', body: form });
        const result = await response.json() as { data: { id: number; succeeded: number } };
        expect(result.data.succeeded).toBe(3);
        const details = await call<{ total: number }>(`system/batchJob/listDetails/${result.data.id}`);
        expect(details.total).toBe(3);
        expect(await call('demo/sequence/next', 'POST', { type: 'order' })).toMatchObject({ sequence: 1 });
        expect(await call('demo/sequence/next', 'POST', { type: 'order' })).toMatchObject({ sequence: 2 });
    });

    it('未知路径返回明确错误并且不会发起网络请求', async () => {
        signIn();
        const network = vi.spyOn(globalThis, 'fetch');
        const response = await mockFetch('/api-backend/system/unknown/list');
        expect(response.status).toBe(404);
        expect(network).not.toHaveBeenCalled();
        network.mockRestore();
    });
});

it('收起旧交接入口时保留本机业务数据和自定义菜单', async () => {
    signIn();
    const created = await call<IdResult>('system/user/create', 'POST', { username: 'keep-user', nickname: '保留数据', roleIds: [2] });
    const saved = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)!) as { tables: { menu: { path: string; visible: boolean; title: string; component: string }[] } };
    saved.tables.menu.find((entry) => entry.path === '/rp/workflow')!.visible = true;
    saved.tables.menu.push({ ...saved.tables.menu.find((entry) => entry.path === '/rp/workflow')!, id: 99999, parentId: 0, path: '/custom/demo', visible: true, title: '自定义入口' } as typeof saved.tables.menu[number]);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(saved));
    const rows = await call<MenuNode[]>('system/auth/listCurrentMenus');
    expect(rows.flatMap((entry) => entry.children).find((entry) => entry.path === '/rp/workflow')?.visible).toBe(false);
    expect(rows.find((entry) => entry.path === '/custom/demo')?.visible).toBe(true);
    expect((await call<PageResult<UserView>>('system/user/list?keyword=keep-user')).list[0]?.id).toBe(created.id);
});
it('移除缓存中的 AI 编辑入口，保留演示入口、业务数据和自定义菜单', async () => {
    signIn();
    const created = await call<IdResult>('system/user/create', 'POST', { username: 'keep-after-removal', nickname: '保留用户', roleIds: [2] });
    const saved = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)!) as { tables: { menu: Record<string, unknown>[] } };
    const demo = saved.tables.menu.find((entry) => entry.path === '/rp/demo')!;
    saved.tables.menu.push({ ...demo, id: 99998, title: '让 AI 修改原型', path: '/rp/write', component: 'prototype/ProductRequestPage' });
    saved.tables.menu.push({ ...demo, id: 99999, path: '/custom/retained' });
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(saved));
    function flat(nodes: MenuNode[]): MenuNode[] { return nodes.flatMap((node) => [node, ...flat(node.children)]); }
    const rows = flat(await call<MenuNode[]>('system/auth/listCurrentMenus'));
    expect(rows.some((entry) => entry.path === '/rp/write')).toBe(false);
    expect(rows.find((entry) => entry.path === '/rp/demo')?.id).toBe(demo.id);
    expect(rows.find((entry) => entry.path === '/custom/retained')?.id).toBe(99999);
    expect((await call<PageResult<UserView>>('system/user/list?keyword=keep-after-removal')).list[0]?.id).toBe(created.id);
});

it('旧菜单补齐导览入口时 ID 唯一，并保留已有自定义页面', async () => {
    signIn();
    await call('system/auth/listCurrentMenus');
    // 通过一次写入将当前演示库持久化，再模拟缺少新入口的旧缓存。
    await call('system/auth/updatePreferences', 'PUT', { colorMode: 'light' });
    const saved = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)!) as { tables: { menu: Record<string, unknown>[] } };
    const legacyDocs = saved.tables.menu.find((entry) => entry.path === '/help')!;
    const docsId = legacyDocs.id;
    Object.assign(legacyDocs, { path: '/docs/', title: '使用文档', component: null, isExternal: true });
    const paths = ['/manage', '/rp/components', '/help'];
    saved.tables.menu = saved.tables.menu.filter((entry) => !paths.includes(String(entry.path)));
    const first = saved.tables.menu[0]!;
    saved.tables.menu.push({ ...first, id: 99999, title: '我的自定义页面', path: '/custom/retained' });
    const originalIds = new Map(saved.tables.menu.map((entry) => [String(entry.path), entry.id]));
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(saved));
    const rows = await call<MenuNode[]>('system/auth/listCurrentMenus');
    function flat(nodes: MenuNode[]): MenuNode[] { return nodes.flatMap((node) => [node, ...flat(node.children)]); }
    const all = flat(rows);
    expect(paths.every((path) => all.some((node) => node.path === path))).toBe(true);
    expect(all.find((node) => node.path === '/help')).toMatchObject({ id: docsId, type: 'directory', component: null, isExternal: false });
    expect(all.find((node) => node.path === '/custom/retained')?.id).toBe(99999);
    expect(all.filter((node) => node.path?.startsWith('/help/'))).toHaveLength(10);
    for (const node of all.filter((node) => node.path?.startsWith('/help/'))) expect(node.parentId).toBe(docsId);
    expect(flat(await call<MenuNode[]>('system/auth/listCurrentMenus')).map((node) => node.id)).toEqual(all.map((node) => node.id));
    expect(new Set(all.map((node) => node.id)).size).toBe(all.length);
    for (const node of all) if (originalIds.has(node.path || '')) expect(node.id).toBe(originalIds.get(node.path || ''));
});

it('工作版本复制旧演示库后独立读写，不与旧候选共用数据库', async () => {
    signIn();
    await call('system/auth/updatePreferences', 'PUT', { colorMode: 'light' });
    const working = localStorage.getItem(MOCK_STORAGE_KEY)!;
    const legacyKey = MOCK_STORAGE_KEY.replace(/-work$/, '');
    expect(legacyKey).not.toBe(MOCK_STORAGE_KEY);
    localStorage.setItem(legacyKey, working);
    localStorage.removeItem(MOCK_STORAGE_KEY);
    await call('system/auth/listCurrentMenus');
    expect(localStorage.getItem(MOCK_STORAGE_KEY)).toBe(working);
    localStorage.setItem(legacyKey, '旧候选的后续写入');
    await call('system/auth/updatePreferences', 'PUT', { colorMode: 'dark' });
    expect(localStorage.getItem(legacyKey)).toBe('旧候选的后续写入');
    expect(JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)!).preferences).toEqual({ colorMode: 'dark' });
});

it('内置旧帮助目录迁移到 /help，保留目录和文章 ID 及自定义菜单', async () => {
    signIn();
    await call('system/auth/updatePreferences', 'PUT', { colorMode: 'light' });
    const saved = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)!) as { tables: { menu: Record<string, unknown>[] } };
    const guide = saved.tables.menu.find((entry) => entry.path === '/help')!;
    const article = saved.tables.menu.find((entry) => entry.path === '/help/product')!;
    const guideId = guide.id; const articleId = article.id;
    guide.path = '/rp/help'; article.path = '/rp/help/product';
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(saved));
    const rows = await call<MenuNode[]>('system/auth/listCurrentMenus');
    const flat = (nodes: MenuNode[]): MenuNode[] => nodes.flatMap((node) => [node, ...flat(node.children)]);
    expect(flat(rows).find((entry) => entry.id === guideId)?.path).toBe('/help');
    expect(flat(rows).find((entry) => entry.id === articleId)?.path).toBe('/help/product');
});

describe('原型口令安全存储', () => {
    it('改密后仅保存 BCrypt 哈希，后续请求使用新口令', async () => {
        signIn();
        await call('system/auth/updatePassword', 'POST', { oldPassword: 'admin123', newPassword: 'test-new-pass' });
        const raw = localStorage.getItem(MOCK_STORAGE_KEY)!;
        expect(raw).not.toContain('test-new-pass');
        expect(raw).not.toContain('admin123');
        const saved = JSON.parse(raw) as Record<string, unknown>;
        expect(saved.password).toBeUndefined();
        expect(saved.passwordHash).toMatch(/^\$2[aby]\$10\$/);
        await call('n/system/auth/login', 'POST', { username: 'admin', password: 'test-new-pass' });
        const old = await mockFetch('/api-backend/n/system/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
        expect(old.status).toBe(401);
    });
    it('旧缓存口令迁移为哈希，不丢失演示数据', async () => {
        signIn();
        await call('system/auth/updatePreferences', 'PUT', { pageSize: 30 });
        const saved = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)!) as Record<string, unknown>;
        delete saved.passwordHash; saved.password = 'legacy-demo-pass';
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(saved));
        await call('n/system/auth/login', 'POST', { username: 'admin', password: 'legacy-demo-pass' });
        const raw = localStorage.getItem(MOCK_STORAGE_KEY)!;
        expect(raw).not.toContain('legacy-demo-pass');
        expect(JSON.parse(raw).preferences).toEqual({ pageSize: 30 });
    });
});

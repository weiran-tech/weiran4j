import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, page, renderWithProviders } from '@/test/helpers';
import type { OperationLogView } from '@/types/api';
import RolesPage from '../../system/roles/RolesPage';
import MenusPage from '../../system/menus/MenusPage';
import DictsPage from '../../system/dicts/DictsPage';
import LoginLogsPage from '../LoginLogsPage';
import OperationLogsPage from '../OperationLogsPage';

const role = { id: 2, name: '演示角色', code: 'editor', description: '测试角色', sort: 0, status: 'enabled', isBuiltin: false, userCount: 0, createdAt: '', updatedAt: '' };
const menu = { id: 2, parentId: 0, title: '演示菜单', type: 'directory', path: null, component: null, permission: null, icon: null, visible: true, keepAlive: false, isExternal: false, status: 'enabled', sort: 0, children: [] };
const dict = { id: 1, name: '演示字典', code: 'demo_dict', description: null, status: 'enabled', isBuiltin: false, createdAt: '', updatedAt: '' };
const item = { id: 11, dictId: 1, label: '演示字典项', value: 'demo', color: null, sort: 0, status: 'enabled', remark: null };
const login = { id: 10, userId: 1, username: '演示登录人', ip: '127.0.0.1', browser: 'Chrome', os: 'Mac', userAgent: 'Test', eventType: 'login', status: 'success', message: '', createdAt: '' };
const operation: OperationLogView = { id: 42, userId: 1, username: '演示操作人', module: '用户', description: '修改演示用户', method: 'PUT', path: '/example/users/1', responseCode: 0, success: true, durationMs: 12, ip: '127.0.0.1', userAgent: 'Test', createdAt: '', requestBody: '{"nickname":"示例"}', errorMessage: null };
const failure = () => Response.json({ code: 100005, message: '读取失败' }, { status: 500 });
const cases = [
    { name: '角色', Component: RolesPage, path: '/api-backend/system/role/list', data: page([role]), empty: page([]), text: 'editor', key: ['roles', 'list'], search: '角色名称 / 编码' },
    { name: '菜单', Component: MenusPage, path: '/api-backend/system/menu/list', data: [menu], empty: [], text: '演示菜单', key: ['menus', 'tree'] },
    { name: '字典', Component: DictsPage, path: '/api-backend/system/dict/list', data: page([dict]), empty: page([]), text: 'demo_dict', key: ['dicts', 'list'], search: '名称 / 编码' },
    { name: '字典项', Component: DictsPage, path: '/api-backend/system/dict/listItems/1', data: [item], empty: [], text: '演示字典项', key: ['dicts', 'items', 1] },
    { name: '登录日志', Component: LoginLogsPage, path: '/api-backend/system/loginLog/list', data: page([login]), empty: page([]), text: '演示登录人', key: ['login-logs'], search: '用户名' },
    { name: '操作日志', Component: OperationLogsPage, path: '/api-backend/system/operationLog/list', data: page([operation]), empty: page([]), text: '演示操作人', key: ['operation-logs', 'list'], search: '操作人' },
];
const support = {
    'GET /api-backend/system/dict/list': page([dict]),
    'GET /api-backend/system/dict/listItems/1': [item],
    'GET /api-backend/system/dict/listItemsByCode/sys_common_status': [],
};
afterEach(() => vi.unstubAllGlobals());

describe.each(cases)('$name 查询恢复', ({ Component, path, data, empty, text, key, name }) => {
    it('首次失败显示持续错误而非空态，按原参数重试恢复', async () => {
        let fail = true;
        const { calls } = mockFetch({ ...support, [`GET ${path}`]: () => fail ? failure() : data });
        renderWithProviders(<Component />);
        const alert = await screen.findByRole('alert', { name: /加载失败/ });
        expect(screen.queryByText('暂无记录')).not.toBeInTheDocument();
        if (name === '字典') expect(screen.queryByText('请选择字典')).not.toBeInTheDocument();
        const initial = calls.find((call) => call.path === path)!;
        fail = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        expect(await screen.findByText(text)).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('alert', { name: /加载失败/ })).not.toBeInTheDocument());
        expect(calls.filter((call) => call.path === path).at(-1)?.search).toBe(initial.search);
    });

    it('缓存刷新失败保留数据，重试成功清除错误', async () => {
        let fail = false;
        const { calls } = mockFetch({ ...support, [`GET ${path}`]: () => fail ? failure() : data });
        const { client } = renderWithProviders(<Component />);
        await screen.findByText(text);
        fail = true;
        await act(async () => { await client.invalidateQueries({ queryKey: key }); });
        const alert = await screen.findByRole('alert', { name: /加载失败/ });
        expect(within(alert).getByText('更新失败，当前显示上次加载的数据。')).toBeInTheDocument();
        expect(screen.getByText(text)).toBeInTheDocument();
        if (name === '字典' || name === '字典项') expect(screen.getByText('字典项：演示字典（demo_dict）')).toBeInTheDocument();
        fail = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        await waitFor(() => expect(screen.queryByRole('alert', { name: /加载失败/ })).not.toBeInTheDocument());
        expect(calls.filter((call) => call.path === path).length).toBe(3);
    });

    it('成功空结果显示空态且没有错误', async () => {
        mockFetch({ ...support, [`GET ${path}`]: empty });
        renderWithProviders(<Component />);
        expect(await screen.findByText('暂无记录')).toBeInTheDocument();
        expect(screen.queryByRole('alert', { name: /加载失败/ })).not.toBeInTheDocument();
    });
});

it.each(cases.filter((entry) => entry.search))('$name 无匹配可清空条件回到第一页', async ({ Component, path, empty, search }) => {
    const { calls } = mockFetch({ ...support, [`GET ${path}`]: empty });
    renderWithProviders(<Component />);
    await screen.findByText('暂无记录');
    const input = screen.getByPlaceholderText(search!);
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', keyCode: 13, charCode: 13 });
    await screen.findByText('没有匹配结果');
    fireEvent.click(screen.getByRole('button', { name: '清空条件' }));
    await screen.findByText('暂无记录');
    // Initial cache may satisfy the reset; explicit refresh verifies the active key.
    fireEvent.click(screen.getByRole('button', { name: search === '名称 / 编码' ? '刷新字典列表' : '刷新' }));
    await waitFor(() => expect(calls.filter((call) => call.path === path).at(-1)?.search).not.toContain('missing'));
    expect(calls.filter((call) => call.path === path).at(-1)?.search).toContain('page=1');
    expect(input).toHaveValue('');
});

it('菜单树刷新失败与重试保留手动收起状态', async () => {
    let fail = false;
    mockFetch({ 'GET /api-backend/system/menu/list': () => fail ? failure() : [{ ...menu, children: [{ ...menu, id: 3, parentId: 2, title: '子菜单', type: 'menu' }] }] });
    const { client } = renderWithProviders(<MenusPage />);
    await screen.findByText('子菜单');
    fireEvent.click(screen.getByRole('button', { name: '全部收起' }));
    await waitFor(() => expect(screen.queryByText('子菜单')).not.toBeInTheDocument());
    fail = true;
    await act(async () => { await client.invalidateQueries({ queryKey: ['menus', 'tree'] }); });
    await screen.findByRole('alert', { name: /加载失败/ });
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.queryByRole('alert', { name: /加载失败/ })).not.toBeInTheDocument());
    expect(screen.queryByText('子菜单')).not.toBeInTheDocument();
});

it.each([false, true])('操作详情首次/缓存失败可沿用 ID 恢复，缓存=%s', async (cached) => {
    let fail = !cached;
    const { calls } = mockFetch({
        'GET /api-backend/system/operationLog/list': page([operation]),
        'GET /api-backend/system/operationLog/get/42': () => fail ? failure() : operation,
    });
    const { client } = renderWithProviders(<OperationLogsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '详情' }));
    if (cached) {
        await screen.findByText('请求体');
        fail = true;
        await act(async () => { await client.invalidateQueries({ queryKey: ['operation-logs', 'detail', 42] }); });
    }
    const alert = await screen.findByRole('alert', { name: '操作详情加载失败' });
    expect(screen.queryByText('正在读取操作详情…')).not.toBeInTheDocument();
    expect(screen.queryByText('请求体') !== null).toBe(cached);
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
    await screen.findByText('请求体');
    await waitFor(() => expect(screen.queryByRole('alert', { name: /加载失败/ })).not.toBeInTheDocument());
    expect(calls.filter((call) => call.path.includes('/operationLog/get/')).every((call) => call.path.endsWith('/42'))).toBe(true);
});

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAuthorizationCalibration } from '../useAuthorizationCalibration';
import { useAuthorizationSnapshot, useMe, useMyMenus } from '../queries/auth';
import { AuthorizationFeedback } from '@/components/AuthorizationFeedback';
import { notifyPermissionRejected } from '@/utils/authorization-events';
import { http } from '@/utils/request';
import { useSession, getSession } from '@/utils/session';
import { signIn } from '@/test/session';
import { mockFetch, renderWithProviders } from '@/test/helpers';

const endpoint = 'GET /api-backend/system/auth/getAuthorizationSnapshot';
function Lifecycle({ refresh, session = '1.csrf' }: { refresh: () => Promise<unknown>; session?: string }) {
    useAuthorizationCalibration(session, refresh); return null;
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('30秒校准，可见/联网恢复立即校准，隐藏离线不轮询，卸载释放订阅', async () => {
    vi.useFakeTimers();
    let visibility = 'visible'; let online = true;
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility as DocumentVisibilityState);
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
    const refresh = vi.fn(() => Promise.resolve(undefined));
    const result = renderWithProviders(<Lifecycle refresh={refresh} />);
    await act(() => vi.advanceTimersByTimeAsync(30_000)); expect(refresh).toHaveBeenCalledTimes(1);
    visibility = 'hidden'; await act(() => vi.advanceTimersByTimeAsync(60_000)); expect(refresh).toHaveBeenCalledTimes(1);
    visibility = 'visible'; await act(async () => { await Promise.resolve(); document.dispatchEvent(new Event('visibilitychange')); }); expect(refresh).toHaveBeenCalledTimes(2);
    online = false; await act(() => vi.advanceTimersByTimeAsync(30_000)); expect(refresh).toHaveBeenCalledTimes(2);
    online = true; await act(async () => { await Promise.resolve(); window.dispatchEvent(new Event('online')); }); expect(refresh).toHaveBeenCalledTimes(3);
    result.unmount(); await act(() => vi.advanceTimersByTimeAsync(60_000)); expect(refresh).toHaveBeenCalledTimes(3);
});

it('合并并发权限拒绝，5秒冷却，会话不匹配不触发，等待中的校准不重复发起', async () => {
    vi.useFakeTimers();
    let finish = () => {};
    const refresh = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    renderWithProviders(<Lifecycle refresh={refresh} />);
    act(() => { notifyPermissionRejected('other'); notifyPermissionRejected('1.csrf'); notifyPermissionRejected('1.csrf'); });
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(30_000)); expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); notifyPermissionRejected('1.csrf'); }); expect(refresh).toHaveBeenCalledTimes(2);
    await act(async () => { finish(); await Promise.resolve(); });
});

function QueryHarness() {
    const snapshot = useAuthorizationSnapshot(); const me = useMe(); const menus = useMyMenus();
    useAuthorizationCalibration(useSession(), () => snapshot.refetch({ cancelRefetch: false }));
    return <>
        <span>{me.data?.permissions.join(',')}</span><nav>{menus.data?.map(m => <span key={m.id}>{m.title}</span>)}</nav>
        <AuthorizationFeedback failed={snapshot.isError} loading={snapshot.isFetching} onRetry={() => void snapshot.refetch()} />
        <button onClick={() => void snapshot.refetch()}>校准</button>
        <button onClick={() => { void http.put('/write', {}, { silent: true }).catch(() => {}); }}>写入</button>
    </>;
}
it('一个快照请求同时替换身份和菜单，失败保留快照并持续反馈，重试恢复', async () => {
    signIn(); let failed = false; let changed = false;
    const { calls } = mockFetch({ [endpoint]: () => failed ? Response.json({ code: 100005, message: 'failed' }, { status: 500 }) : { user: { permissions: changed ? [] : ['can:write'] }, menus: changed ? [] : [{ id: 3, title: '管理入口' }], revision: changed ? '2' : '1' } });
    renderWithProviders(<QueryHarness />);
    await screen.findByText('管理入口'); expect(screen.getByText('can:write')).toBeInTheDocument();
    expect(calls.filter(c => c.path.endsWith('/getAuthorizationSnapshot'))).toHaveLength(1);
    failed = true; fireEvent.click(screen.getByText('校准'));
    await screen.findByRole('alert'); expect(screen.getByText('管理入口')).toBeInTheDocument(); expect(screen.getByText('can:write')).toBeInTheDocument();
    failed = false; changed = true; fireEvent.click(screen.getByText('重试权限刷新'));
    await waitFor(() => expect(screen.queryByText('管理入口')).not.toBeInTheDocument());
    expect(screen.queryByText('can:write')).not.toBeInTheDocument(); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('403仅校准不重放写入，校准自身403不递归，CSRF拒绝不触发校准', async () => {
    signIn(); let calibrationFailed = false; let csrf = false;
    const { calls } = mockFetch({
        [endpoint]: () => calibrationFailed ? Response.json({ code: 100102, message: 'no permission' }, { status: 403 }) : { user: { permissions: [] }, menus: [], revision: '1' },
        'PUT /write': () => Response.json({ code: csrf ? 100103 : 100102, message: 'rejected' }, { status: 403 }),
    });
    renderWithProviders(<QueryHarness />);
    await waitFor(() => expect(calls.filter(c => c.path.endsWith('/getAuthorizationSnapshot'))).toHaveLength(1)); calibrationFailed = true;
    fireEvent.click(screen.getByText('写入')); await screen.findByRole('alert');
    expect(calls.filter(c => c.path === '/write')).toHaveLength(1);
    expect(calls.filter(c => c.path.endsWith('/getAuthorizationSnapshot'))).toHaveLength(2);
    csrf = true; fireEvent.click(screen.getByText('写入'));
    await waitFor(() => expect(calls.filter(c => c.path === '/write')).toHaveLength(2));
    expect(calls.filter(c => c.path.endsWith('/getAuthorizationSnapshot'))).toHaveLength(2);
});

it.each([false, true])('换会话后旧快照（过期=%s）不污染新会话', async (expired) => {
    signIn(1, 'old');
    let finish: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => { finish = resolve; });
    vi.stubGlobal('fetch', vi.fn((url: string) => url.includes('getAuthorizationSnapshot') ? getSession() === '1.old' ? pending : Promise.resolve(Response.json({ code: 0, data: { user: { permissions: ['new:permission'] }, menus: [{ id: 9, title: '新会话菜单' }], revision: '9' } })) : Promise.resolve(Response.json({ code: 0, data: {} }))));
    renderWithProviders(<QueryHarness />);
    await act(async () => { await Promise.resolve(); signIn(2, 'new'); });
    await screen.findByText('新会话菜单');
    await act(async () => { await Promise.resolve(); finish(expired ? Response.json({ code: 100101, message: 'old expired', data: null }, { status: 401 }) : Response.json({ code: 0, data: { user: { permissions: ['old:permission'] }, menus: [{ id: 1, title: '旧会话菜单' }], revision: '1' } })); });
    expect(getSession()).toBe('2.new');
    expect(screen.getByText('新会话菜单')).toBeInTheDocument();
    expect(screen.getByText('new:permission')).toBeInTheDocument();
});
it('15秒超时信号使挂起校准失败，手动重试可恢复', async () => {
    signIn();
    const timeout = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    let fail = false;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
        if (!url.includes('getAuthorizationSnapshot')) return Promise.resolve(Response.json({ code: 0, data: {} }));
        if (fail) return new Promise<Response>((_resolve, reject) => { if (init?.signal?.aborted) { reject(new DOMException('timeout', 'AbortError')); return; } init?.signal?.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')), { once: true }); });
        return Promise.resolve(Response.json({ code: 0, data: { user: { permissions: [] }, menus: [{ id: 3, title: '原菜单' }], revision: '1' } }));
    }));
    renderWithProviders(<QueryHarness />); await screen.findByText('原菜单');
    fail = true; fireEvent.click(screen.getByText('校准'));
    await act(async () => { await Promise.resolve(); timeout.abort(); });
    await screen.findByRole('alert'); expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    expect(screen.getByText('原菜单')).toBeInTheDocument();
    fail = false; timeoutSpy.mockRestore(); fireEvent.click(screen.getByText('重试权限刷新'));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

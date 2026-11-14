import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PageErrorBoundary } from '../PageErrorBoundary';
import { RecoverablePage } from '../RecoverablePage';
import { KeepAliveOutlet } from '@/layouts/KeepAliveOutlet';

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.restoreAllMocks(); });

it('渲染错误保持外壳，重试重建页面且不泄露原始异常', async () => {
    let broken = true;
    function Page() { if (broken) throw Error('secret-render-detail'); return <p>正常页面</p>; }
    const loader = vi.fn(() => Promise.resolve({ default: Page }));
    const home = vi.fn();
    render(<><nav>导航外壳</nav><RecoverablePage loader={loader} onHome={home} /></>);
    const alert = await screen.findByRole('alert', { name: '页面加载失败' });
    expect(screen.getByText('导航外壳')).toBeInTheDocument();
    expect(screen.queryByText(/secret-render-detail/)).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: '返回首页' }));
    expect(home).toHaveBeenCalledOnce();
    broken = false;
    fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
    expect(await screen.findByText('正常页面')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
});

it('首次加载失败后真实重新调用loader，等待与失败有独立状态', async () => {
    let reject!: (reason: Error) => void;
    const loader = vi.fn<() => Promise<{ default: () => React.JSX.Element }>>()
        .mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }))
        .mockResolvedValue({ default: () => <p>加载已恢复</p> });
    render(<RecoverablePage loader={loader} onHome={() => undefined} />);
    expect(screen.getByRole('status', { name: '页面加载中' })).toBeInTheDocument();
    reject(Error('secret-load-detail'));
    fireEvent.click(await screen.findByRole('button', { name: '重试' }));
    expect(await screen.findByText('加载已恢复')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
});

it('持续加载失败不自动重试，主动刷新有明确回调', async () => {
    const loader = vi.fn(() => Promise.reject(new Error('load failed')));
    const reload = vi.fn();
    render(<RecoverablePage loader={loader} onHome={() => undefined} onReload={reload} />);
    await screen.findByRole('alert', { name: '页面加载失败' });
    expect(loader).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    await screen.findByRole('alert', { name: '页面加载失败' });
    fireEvent.click(screen.getByRole('button', { name: '刷新页面' }));
    expect(reload).toHaveBeenCalledOnce();
    expect(loader).toHaveBeenCalledTimes(2);
});

it('根部兜底可重试，路径变化仅清除故障，不重挂正常子树', () => {
    let broken = true;
    function Page() { const [value, setValue] = useState(''); if (broken) throw Error('root failed'); return <input aria-label="根部草稿" value={value} onChange={(event) => setValue(event.target.value)} />; }
    const { rerender } = render(<PageErrorBoundary resetKey="/a"><Page /></PageErrorBoundary>);
    broken = false;
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    fireEvent.change(screen.getByLabelText('根部草稿'), { target: { value: '保留' } });
    rerender(<PageErrorBoundary resetKey="/b"><Page /></PageErrorBoundary>);
    expect(screen.getByLabelText('根部草稿')).toHaveValue('保留');
});

it.each([true, false])('保活=%s：故障页与正常页隔离，切换和刷新不破坏其他页', async (enabled) => {
    let broken = true;
    function Good() { const [value, setValue] = useState(''); return <input aria-label="正常页草稿" value={value} onChange={(event) => setValue(event.target.value)} />; }
    function Bad() { if (broken) throw Error('page failed'); return <p>故障页已恢复</p>; }
    const good = () => Promise.resolve({ default: Good });
    const bad = () => Promise.resolve({ default: Bad });
    function Shell() {
        const location = useLocation();
        const navigate = useNavigate();
        const [versions, setVersions] = useState<Record<string, number>>({});
        return <><nav><button onClick={() => void navigate('/good')}>正常页</button><button onClick={() => void navigate('/bad')}>故障页</button><button onClick={() => setVersions((old) => ({ ...old, [location.pathname]: (old[location.pathname] ?? 0) + 1 }))}>刷新页签</button></nav>
            <KeepAliveOutlet enabled={enabled} keepAlivePaths={new Set(['/good', '/bad'])} openPaths={new Set(['/good', '/bad'])} pathname={location.pathname} refreshVersion={versions} /></>;
    }
    render(<MemoryRouter initialEntries={['/good']}><Routes><Route element={<Shell />}><Route path="/good" element={<RecoverablePage loader={good} onHome={() => undefined} />} /><Route path="/bad" element={<RecoverablePage loader={bad} onHome={() => undefined} />} /></Route></Routes></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('正常页草稿'), { target: { value: '保活草稿' } });
    fireEvent.click(screen.getByRole('button', { name: '故障页' }));
    await screen.findByRole('alert', { name: '页面加载失败' });
    expect(screen.getByRole('button', { name: '正常页' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '正常页' }));
    expect(await screen.findByLabelText('正常页草稿')).toHaveValue(enabled ? '保活草稿' : '');
    broken = false;
    fireEvent.click(screen.getByRole('button', { name: '故障页' }));
    fireEvent.click(screen.getByRole('button', { name: '刷新页签' }));
    expect(await screen.findByText('故障页已恢复')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '正常页' }));
    expect(await screen.findByLabelText('正常页草稿')).toHaveValue(enabled ? '保活草稿' : '');
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { PortalRouter, PortalLink, navigatePortal } from '../PortalRouter';
import { routeVersion, runtimeVersion, runtimeStorageId, syncRuntimeLocation } from '../runtime';
import { sitePath } from '../catalog';
import { useVersionParams } from '../useVersionParams';
import { App } from '@/App';
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: true }) }));

afterEach(() => { window.history.replaceState(null, '', '/'); syncRuntimeLocation(); vi.restoreAllMocks(); });
function Probe() {
    const [params, setParams] = useVersionParams();
    const location = useLocation();
    const [text, setText] = useState('');
    return <><label>外壳输入<input value={text} onChange={(event) => setText(event.target.value)} /></label><output aria-label="版本">{params.get('version') || '全局'}</output><output aria-label="地址">{location.pathname}{location.search}{location.hash}</output><output aria-label="生成链接">{sitePath('/rp/demo')}</output><button onClick={() => setParams({ version: 'v0.2', scope: 'all', tab: 'review' })}>切换版本</button><PortalLink href="/rp">全部版本</PortalLink></>;
}
it('切换版本只改变历史路径，外壳和构建隔离信息保持，前进后退恢复版本', async () => {
    window.history.replaceState({ idx: 0 }, '', '/versions/v0.8/rp/versions?scope=all'); syncRuntimeLocation();
    const build = runtimeVersion; const storage = runtimeStorageId;
    const push = vi.spyOn(window.history, 'pushState');
    render(<PortalRouter><Probe /></PortalRouter>);
    fireEvent.change(screen.getByLabelText('外壳输入'), { target: { value: '保持外壳' } });
    const input = screen.getByLabelText('外壳输入');
    fireEvent.click(screen.getByText('切换版本'));
    expect(push).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/versions/v0.2/rp/versions');
    expect(window.location.search).toBe('?scope=all&tab=review');
    expect(screen.getByLabelText('版本')).toHaveTextContent('v0.2');
    expect(screen.getByLabelText('地址')).toHaveTextContent('/rp/versions?scope=all&tab=review');
    expect(screen.getByLabelText('生成链接')).toHaveTextContent('/versions/v0.2/rp/demo');
    expect(screen.getByLabelText('外壳输入')).toBe(input);
    expect(input).toHaveValue('保持外壳');
    expect(runtimeVersion).toBe(build); expect(runtimeStorageId).toBe(storage);
    await act(async () => { const popped = new Promise<void>((resolve) => window.addEventListener('popstate', () => resolve(), { once: true })); window.history.back(); await popped; });
    await waitFor(() => expect(screen.getByLabelText('版本')).toHaveTextContent('v0.8'));
    await act(async () => { const popped = new Promise<void>((resolve) => window.addEventListener('popstate', () => resolve(), { once: true })); window.history.forward(); await popped; });
    await waitFor(() => expect(screen.getByLabelText('版本')).toHaveTextContent('v0.2'));
    fireEvent.click(screen.getByText('全部版本'));
    expect(window.location.pathname).toBe('/');
    expect(routeVersion).toBeNull();
    expect(input).toHaveValue('保持外壳');
});
it('归档、外部地址和手机端独立构建继续使用文档导航，修饰点击不被接管', () => {
    window.history.replaceState(null, '', '/rp'); syncRuntimeLocation();
    render(<PortalRouter><PortalLink href="/versions/v0.2/rp/versions" target="_blank">新窗口</PortalLink></PortalRouter>);
    expect(navigatePortal('/releases/v0.2/manage')).toBe(false);
    expect(navigatePortal('/versions/v0.2/mobile/')).toBe(false);
    expect(navigatePortal('https://example.com/rp')).toBe(false);
    fireEvent.click(screen.getByText('新窗口'));
    expect(window.location.pathname).toBe('/rp');
});

it('无刷新进入旧版管理地址时仍由 App 拦截，进入历史目录而非当前业务页', () => {
    window.history.replaceState(null, '', '/rp'); syncRuntimeLocation();
    render(<PortalRouter><Routes><Route path="/rp" element={<span>协作</span>} /><Route path="/manage/*" element={<App />} /><Route path="/rp/manage" element={<output>历史原型目录</output>} /></Routes></PortalRouter>);
    act(() => { navigatePortal('/versions/v0.2/manage/biz/refunds?scope=all'); });
    expect(screen.getByText('历史原型目录')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/versions/v0.2/rp/manage');
    expect(window.location.search).toBe('?scope=all');
    expect(runtimeVersion).not.toBe('v0.2');
});

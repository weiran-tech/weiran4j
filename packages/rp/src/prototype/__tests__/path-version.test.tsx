import { fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import { renderWithProviders, stubLocationAssign } from '@/test/helpers';
import VersionEditorPage from '@/pages/prototype/VersionEditorPage';
import { useWorkspaceNavigate } from '../navigation';
import { useVersionParams } from '../useVersionParams';
vi.mock('../runtime', async (original) => ({ ...await original<typeof import('../runtime')>(), routeVersion: 'v0.8', runtimeBase: '/versions/v0.8/' }));
afterEach(() => vi.unstubAllGlobals());
function Probe() {
    const [params, setParams] = useVersionParams();
    const location = useLocation();
    return <><output aria-label="版本">{params.get('version')}</output><output aria-label="地址">{location.pathname}{location.search}</output><button onClick={() => setParams({ version: 'v0.2' })}>切换</button><button onClick={() => { params.set('scenario', 'failure'); setParams(params); }}>切场景</button></>;
}
it('路径版本优先，修改场景不把 version 写回参数', () => {
    renderWithProviders(<Probe />, { route: '/rp/versions?version=v0.1&scope=all' });
    expect(screen.getByLabelText('版本')).toHaveTextContent('v0.8');
    fireEvent.click(screen.getByText('切场景'));
    expect(screen.getByLabelText('地址')).toHaveTextContent('/rp/versions?scope=all&scenario=failure');
    expect(screen.getByLabelText('地址')).not.toHaveTextContent('version=');
});
it('切版本改路径并保留完整范围', () => {
    const assign = stubLocationAssign();
    renderWithProviders(<Probe />, { route: '/rp/versions?scope=all' });
    fireEvent.click(screen.getByText('切换'));
    expect(assign).toHaveBeenCalledWith('/versions/v0.2/rp/versions?scope=all');
});

it('旧编辑链接进入指南，已有草稿保持原样', () => {
    const saved = JSON.stringify({ selected: 'v0.9' });
    localStorage.setItem('prototype_editor_draft_v2', saved);
    function LocationProbe() { const location = useLocation(); return <output aria-label="地址">{location.pathname}</output>; }
    renderWithProviders(<><VersionEditorPage /><LocationProbe /></>, { route: '/rp/editor?create=1' });
    expect(screen.getByLabelText('地址')).toHaveTextContent('/help/versions');
    expect(localStorage.getItem('prototype_editor_draft_v2')).toBe(saved);
});

it('版本应用中的指南和首页离开版本 basename，业务导航仍在当前应用', () => {
    const assign = stubLocationAssign();
    function Navigation() { const navigate = useWorkspaceNavigate(); return <><button onClick={() => navigate('/rp')}>首页</button><button onClick={() => navigate('/rp/help/review')}>指南</button><button onClick={() => navigate('/manage')}>产品</button></>; }
    renderWithProviders(<Navigation />, { route: '/rp/versions' });
    fireEvent.click(screen.getByText('首页')); fireEvent.click(screen.getByText('指南'));
    expect(assign.mock.calls).toEqual([['/'], ['/help/review']]);
    fireEvent.click(screen.getByText('产品')); expect(assign).toHaveBeenCalledTimes(2);
});

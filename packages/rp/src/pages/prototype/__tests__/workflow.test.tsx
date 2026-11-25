import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { blankHandoff } from '../../../../prototype/handoff.mjs';
import { handoffTransfer } from '../../../../prototype/handoff-transfer.mjs';
import { renderWithProviders } from '@/test/helpers';
import WorkflowPage from '../WorkflowPage';
import VersionsPage from '../VersionsPage';
import VersionEditorPage from '../VersionEditorPage';
import { currentRelease, currentVersion } from '@/prototype/catalog';
beforeEach(() => { localStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => vi.unstubAllGlobals());

it('版本记录保留本机编辑和定稿基线，不提供导入导出下载', () => {
    renderWithProviders(<VersionEditorPage />);
    fireEvent.change(screen.getByLabelText('版本目标'), { target: { value: '当前本机更新' } });
    expect(screen.getByLabelText('版本目标')).toHaveValue('当前本机更新');
    expect(screen.queryByLabelText('导入说明')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /下载|导出|导入/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新建版本' }));
    expect(screen.getByLabelText('版本基线')).toHaveValue('v0.2');
});


it('旧研发入口回到原型目录，保留历史交接存储', () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(Response.json(url.includes('handoffs') ? { syncedAt: null, versions: {} } : []))));
    const saved = JSON.stringify(handoffTransfer(blankHandoff(currentRelease)));
    localStorage.setItem(`prototype_handoff_${currentVersion}`, saved);
    renderWithProviders(<WorkflowPage />, { route: '/rp/versions?tab=delivery' });
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: '研发与验收' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '研发交接摘要' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'CHG 研发与验收矩阵' })).not.toBeInTheDocument();
    expect(localStorage.getItem(`prototype_handoff_${currentVersion}`)).toBe(saved);
});


it('版本中心默认进入原型，旧对比链接不恢复已移除的预览', () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(Response.json(url.includes('handoffs') ? { syncedAt: null, versions: {} } : []))));
    const first = renderWithProviders(<VersionsPage />, { route: '/rp/versions' });
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: '概览' })).not.toBeInTheDocument();
    first.unmount();
    renderWithProviders(<VersionsPage />, { route: '/rp/versions?compare=1' });
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('heading', { name: '按页面对比' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '显示页面对比' })).not.toBeInTheDocument();
});

it('旧流程演示参数回到原型目录，不展示流程内容', () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(Response.json(url.includes('handoffs') ? { syncedAt: null, versions: {} } : []))));
    const first = renderWithProviders(<WorkflowPage />, { route: '/rp/versions' });
    expect(screen.queryByRole('button', { name: '业务流程演示' })).not.toBeInTheDocument(); first.unmount();
    renderWithProviders(<WorkflowPage />, { route: '/rp/versions?version=v0.2&tab=flow' });
    expect(screen.queryByRole('button', { name: '业务流程演示' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTitle('业务流程步骤原型')).not.toBeInTheDocument();
});





it('保留原型与评审两个入口，旧岗位偏好不改变默认页面', () => {
    localStorage.setItem('prototype_role_view', 'engineering');
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(Response.json(url.includes('handoffs') ? { syncedAt: null, versions: {} } : []))));
    renderWithProviders(<WorkflowPage />);
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '评审与结论' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '研发与验收' })).not.toBeInTheDocument();
    expect(screen.getByRole('tablist').children).toHaveLength(2);
    expect(screen.queryByRole('group', { name: '岗位视图' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '按页面对比' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '显示技术信息' }));
    expect(screen.getByRole('button', { name: /CHG-003 ·/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '研发交接摘要' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('研发负责人')).not.toBeInTheDocument();
    expect(localStorage.getItem(`prototype_handoff_${currentVersion}`)).toBeNull();
});

it('旧偏好不影响具体改动链接与只读评审', () => {
    localStorage.setItem('prototype_role_view', 'engineering');
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(Response.json(url.includes('handoffs') ? { syncedAt: null, versions: {} } : []))));
    renderWithProviders(<WorkflowPage />, { route: '/rp/versions?change=CHG-003&compare=1' });
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: '显示技术信息' }));
    expect(screen.getByRole('button', { name: /CHG-003 ·/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('tab', { name: '评审与结论' }));
    expect(screen.queryByRole('button', { name: '申请定稿' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看主评审记录 ↗' })).toBeInTheDocument();
});



it('移除交接编辑与归档能力，旧归档链接回到目录并保留原始本机数据', () => {
    const saved = JSON.stringify(handoffTransfer(blankHandoff(currentRelease)));
    localStorage.setItem(`prototype_handoff_${currentVersion}`, saved);
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(Response.json(url.includes('handoffs') ? { syncedAt: null, versions: {} } : []))));
    renderWithProviders(<WorkflowPage />, { route: '/rp/versions?tab=archive&edit=1' });
    expect(screen.getByRole('region', { name: '维护' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
    for (const name of ['编辑交接', '版本归档', '生成提交内容', '保存草稿']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '定版与归档' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('导入交接记录')).not.toBeInTheDocument();
    expect(localStorage.getItem(`prototype_handoff_${currentVersion}`)).toBe(saved);
});

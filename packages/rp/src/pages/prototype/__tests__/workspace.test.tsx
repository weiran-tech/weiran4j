import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/helpers';
import VersionEditorPage from '../VersionEditorPage';
import VersionsPage from '../VersionPrototypePanel';
import MobilePreviewPage from '../MobilePreviewPage';
import RefundDemoPage from '../RefundDemoPage';
import { currentVersion } from '@/prototype/catalog';

afterEach(() => vi.unstubAllGlobals());
describe('产品填写与开发查看', () => {
    it('新建草稿、填写后刷新恢复本机内容，未填写内容不能通过检查', async () => {
        const first = renderWithProviders(<VersionEditorPage />);
        fireEvent.click(screen.getByRole('button', { name: '新建版本' }));
        fireEvent.change(screen.getByLabelText('版本标题'), { target: { value: '产品填写的版本' } });
        fireEvent.click(screen.getByRole('button', { name: '检查说明' }));
        expect(screen.getByRole('alert')).toHaveTextContent(/缺少/);
        await waitFor(() => expect(localStorage.getItem('prototype_editor_draft_v2')).toContain('产品填写的版本'));
        first.unmount();
        renderWithProviders(<VersionEditorPage />);
        expect(screen.getByLabelText('版本标题')).toHaveValue('产品填写的版本');
    });
    it('已定稿版本在编辑器中只读', () => {
        renderWithProviders(<VersionEditorPage />);
        fireEvent.change(screen.getByLabelText('编辑版本'), { target: { value: 'v0.2' } });
        expect(screen.getByLabelText('版本标题')).toBeDisabled();
        expect(screen.queryByRole('button', { name: '新增改动' })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('改动标题')).not.toBeInTheDocument();
    });
    it('历史手机链接指向历史快照，源码来自实际归档', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([{ version: 'v0.2', base: '/releases/v0.2/', commit: 'a'.repeat(40), builtAt: '2026-11-23' }]))));
        renderWithProviders(<VersionsPage />, { route: '/rp/versions?version=v0.2' });
        const link = await screen.findByRole('link', { name: /查看 v0.2 手机端/ });
        expect(link.getAttribute('href')).toMatch(/^\/releases\/v0.2\/mobile\//);
        expect(screen.getByText(/源码 a{40}/)).toBeInTheDocument();
        expect(screen.queryByText(/尚未定稿/)).not.toBeInTheDocument();
    });
    it('没有归档的历史版本不会显示当前手机入口', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
        renderWithProviders(<VersionsPage />, { route: '/rp/versions?version=v0.2' });
        await waitFor(() => expect(screen.getByText(/已定稿 · 待归档/)).toBeInTheDocument());
        expect(screen.queryByRole('link', { name: /查看 v0.2 手机端/ })).not.toBeInTheDocument();
    });
    it('退款失败场景通过链接复现并保留输入', () => {
        renderWithProviders(<RefundDemoPage />, { route: '/manage/refund-demo?scenario=failure' });
        fireEvent.change(screen.getByLabelText('本次退款金额'), { target: { value: '12.34' } });
        fireEvent.click(screen.getByRole('button', { name: '确认模拟退款' }));
        expect(screen.getByRole('status')).toHaveTextContent('模拟退款失败');
        expect(screen.getByLabelText('本次退款金额')).toHaveValue('12.34');
        expect(localStorage.getItem(`prototype_refund_${currentVersion}`)).toBeNull();
    });
    it('纯页面隐藏演示工具和规则入口，退款失败仍保留输入', () => {
        renderWithProviders(<RefundDemoPage />, { route: '/manage/refund-demo?embed=page&scenario=failure' });
        expect(screen.queryByLabelText('演示场景')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /查看规则/ })).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('本次退款金额'), { target: { value: '10.00' } });
        fireEvent.click(screen.getByRole('button', { name: '确认模拟退款' }));
        expect(screen.getByRole('status')).toHaveTextContent('模拟退款失败');
        expect(screen.getByLabelText('本次退款金额')).toHaveValue('10.00');
    });
    it('手机端内部导航同步分享链接与场景，但不重载 iframe 丢失输入', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
        renderWithProviders(<MobilePreviewPage />, { route: `/rp/mobile?version=${currentVersion}&page=mobile%3Amobile-order-detail&scenario=failure` });
        const frame = screen.getByTitle<HTMLIFrameElement>('Vant 手机端原型');
        const source = frame.getAttribute('src');
        fireEvent(window, new MessageEvent('message', { origin: window.location.origin, source: frame.contentWindow, data: { type: 'prototype-mobile-context', version: currentVersion, path: '/mobile/#/orders', scenario: 'normal' } }));
        await waitFor(() => expect(screen.getByRole('link', { name: /独立页面/ }).getAttribute('href')).toContain('#/orders'));
        expect(screen.getByRole('link', { name: /独立页面/ }).getAttribute('href')).toContain('scenario=normal');
        expect(frame.getAttribute('src')).toBe(source);
    });

});

it('手机组件旧深链仍有效，订单产品目录不混入表单示例', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
    const first = renderWithProviders(<MobilePreviewPage />, { route: '/rp/mobile' });
    expect(screen.queryByRole('option', { name: '手机表单示例' })).not.toBeInTheDocument();
    first.unmount();
    renderWithProviders(<MobilePreviewPage />, { route: '/rp/mobile?page=mobile%3Amobile-form' });
    expect(screen.getByRole('heading', { name: 'Vant 组件预览' })).toBeInTheDocument();
    expect(screen.getByTitle('Vant 手机端原型').getAttribute('src')).toContain('#/form');
});


it('旧对比参数不再生成双页预览，改动说明仍可阅读', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
    renderWithProviders(<VersionsPage embedded />, { route: `/rp/versions?version=${currentVersion}&change=CHG-003&compare=1&baseline=v0.2&view=full` });
    expect(screen.queryByRole('heading', { name: '按页面对比' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('基线原型')).not.toBeInTheDocument();
    expect(screen.queryByTitle('目标原型')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /页面对比|对比原型|复制对比链接/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '页面对比' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '退款示例更名与场景分享' })).toBeInTheDocument();
});

it('创建版本入口一次建立草稿、清除创建参数，恢复时不重复新建，基线仅限已定版', async () => {
    localStorage.clear();
    const first = renderWithProviders(<VersionEditorPage />, { route: '/rp/editor?create=1' });
    expect(screen.getByLabelText('版本编号')).toHaveValue('v0.9');
    expect(screen.getByLabelText('版本基线')).toHaveValue('v0.2');
    expect([...screen.getByLabelText<HTMLSelectElement>('版本基线').options].map((option) => option.value)).not.toContain('v0.8');
    await waitFor(() => expect(JSON.parse(localStorage.getItem('prototype_editor_draft_v2')!).selected).toBe('v0.9'));
    first.unmount();
    renderWithProviders(<VersionEditorPage />, { route: '/rp/editor' });
    expect(screen.getByLabelText('版本编号')).toHaveValue('v0.9');
    expect(screen.queryByRole('button', { name: /下载|导出|导入/ })).not.toBeInTheDocument();
});

it('站内新版本不生成改动，现有改动只读', () => {
    renderWithProviders(<VersionEditorPage />);
    expect(screen.queryByRole('button', { name: '新增改动' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除此项' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('改动标题')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新建版本' }));
    const saved = JSON.parse(localStorage.getItem('prototype_editor_draft_v2')!);
    expect(saved.catalog.releases.find((release: { id: string }) => release.id === saved.selected).changes).toEqual([]);
});

it('版本改动说明通过按钮打开抽屉，版本页不重复列完整目录', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
    renderWithProviders(<VersionsPage embedded />);
    expect(screen.queryByRole('heading', { name: '业务规则' })).not.toBeInTheDocument();
    expect(screen.queryByText('完整页面目录', { selector: 'summary' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看改动说明' }));
    expect(await screen.findByRole('heading', { name: '业务规则' })).toBeInTheDocument();
});

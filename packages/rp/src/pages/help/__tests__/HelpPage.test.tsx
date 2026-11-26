import { PortalLayout } from '@/layouts/PortalLayout';
import { fireEvent, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers';
import HelpPage from '../HelpPage';
import { helpLink, legacyHelpDoc } from '@/prototype/help';
function Location() { const location = useLocation(); return <output aria-label="当前地址">{location.pathname}{location.search}{location.hash}</output>; }
it('旧参数转为全局子路径，按岗位阅读表格和命令', () => {
    renderWithProviders(<><HelpPage /><Location /></>, { route: '/rp/help?doc=review&version=v0.8&scope=all' });
    expect(screen.getByRole('heading', { name: '本机评审' })).toBeInTheDocument();
    expect(screen.getByText(/评审仅存当前浏览器/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '下一篇：研发与验收' }));
    expect(screen.getByRole('heading', { name: '研发交接与验收参考' })).toBeInTheDocument();
    expect(screen.getByLabelText('当前地址')).toHaveTextContent('/help/delivery');
    expect(screen.getByRole('link', { name: '查看全部版本' })).toHaveAttribute('href', '/versions');
    expect(screen.getByLabelText('当前地址')).not.toHaveTextContent('version=');
});
it('旧文档深链进入对应指南，删除的文章明确提示', () => {
    const first = renderWithProviders(<><HelpPage /><Location /></>, { route: '/docs/prototype#产品验收' });
    expect(screen.getByRole('heading', { name: '研发交接与验收参考' })).toBeInTheDocument();
    expect(screen.getByLabelText('当前地址')).toHaveTextContent('/help/delivery');
    first.unmount();
    renderWithProviders(<HelpPage />, { route: '/rp/help?doc=removed' });
    expect(screen.getByRole('alert')).toHaveTextContent('此文档已移除或不存在');
    expect(screen.queryByRole('heading', { name: '从这里开始协作' })).not.toBeInTheDocument();
});
it('相对 Markdown 与历史目录链接正确转换，不给外链追加上下文', () => {
    expect(helpLink('./deployment.md')).toBe('/help/deployment');
    expect(legacyHelpDoc('/docs/components/file-upload')).toBe('removed');
    expect(helpLink('https://example.com/reference')).toBe('https://example.com/reference');
});

it('旧指南迁移清理版本上下文，同时保留仅页面嵌入参数', () => {
    renderWithProviders(<><HelpPage /><Location /></>, { route: '/rp/help?doc=review&version=v0.8&scope=all&embed=page' });
    expect(screen.getByLabelText('当前地址')).toHaveTextContent('/help/review?embed=page');
    expect(screen.getByRole('heading', { name: '本机评审' })).toBeInTheDocument();
});

it('长文末尾切换下一篇后滚动回顶部', () => {
    renderWithProviders(<Routes><Route element={<PortalLayout />}><Route path="/help/*" element={<HelpPage />} /></Route></Routes>, { route: '/help/onboarding' });
    const container = document.querySelector<HTMLElement>('.portal-layout')!;
    container.scrollTop = 1200;
    fireEvent.click(screen.getByRole('link', { name: '下一篇：岗位与流程' }));
    expect(container.scrollTop).toBe(0);
    expect(screen.getByRole('heading', { name: '岗位与流程', level: 1 })).toBeInTheDocument();
});

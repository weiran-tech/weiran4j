import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import HelpPage from '@/pages/help/HelpPage';
import { PortalLayout } from '../PortalLayout';
import { PortalRouter } from '@/prototype/PortalRouter';
import { syncRuntimeLocation } from '@/prototype/runtime';

vi.mock('../ThemeSwitcher', () => ({ ThemeModeButton: () => null }));
afterEach(() => { window.history.replaceState(null, '', '/'); syncRuntimeLocation(); });

it('公共版本切换保留公共导航，返回清单退出版本路径', async () => {
    window.history.replaceState(null, '', '/versions/v0.8/rp/versions'); syncRuntimeLocation();
    render(<PortalRouter><Routes><Route element={<PortalLayout />}><Route path="/rp/versions" element={<h1>版本详情</h1>} /><Route path="/versions" element={<h1>版本清单</h1>} /></Route></Routes></PortalRouter>);
    fireEvent.click(screen.getByRole('combobox', { name: '查看版本' }));
    fireEvent.click(await screen.findByRole('option', { name: /v0.7/ }));
    expect(window.location.pathname).toBe('/versions/v0.7/rp/versions');
    expect(screen.queryByRole('link', { name: '进入原型' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '← 版本清单' }));
    expect(window.location.pathname).toBe('/versions');
    expect(screen.getByRole('heading', { name: '版本清单' })).toBeInTheDocument();
});

it('文章目录收进顶部帮助下拉，选择文章后关闭菜单并显示正文', async () => {
    window.history.replaceState(null, '', '/help/deployment'); syncRuntimeLocation();
    render(<PortalRouter><Routes><Route element={<PortalLayout />}><Route path="/help/*" element={<HelpPage />} /></Route></Routes></PortalRouter>);
    expect(screen.queryByRole('navigation', { name: '帮助文档目录' })).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: '帮助文档' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(await screen.findByRole('link', { name: '候选与部署' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '快速开始' })).toHaveAttribute('href', '/help/start');
    fireEvent.click(screen.getByRole('link', { name: '岗位与流程' }));
    expect(screen.getByRole('heading', { name: '岗位与流程', level: 1 })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

import { fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import { menus } from '@/mocks/seed';
import { flattenMenuPages, menusToRoutes } from '@/utils/menu';
import { readingPath, readingScope, workspaceFor, workspaceMenus } from '../workspaces';
import { currentRelease, currentVersion, releases } from '../catalog';
import { WorkspaceSwitcher } from '../WorkspaceSwitcher';
import { renderWithProviders, stubLocationAssign } from '@/test/helpers';

afterEach(() => vi.unstubAllGlobals());
it('三个工作区只投影菜单，不删除业务路由或修改种子', () => {
    const original = JSON.stringify(menus);
    const paths = (workspace: Parameters<typeof workspaceMenus>[1]) => flattenMenuPages(workspaceMenus(menus, workspace)).filter((item) => item.visible).map((item) => item.path);
    expect(paths('collaboration')).toEqual(['/rp', '/rp/demo']);
    expect(paths('collaboration')).not.toContain('/manage/biz/refunds');
    expect(paths('manage')).toContain('/manage/biz/refunds');
    expect(paths('manage')).not.toContain('/manage/demo/fields');
    expect(paths('manage')).not.toContain('/rp/components');
    expect(paths('mobile')).toEqual(['/rp/mobile']);
    expect(menusToRoutes(menus).some((item) => item.path === '/manage/biz/refunds')).toBe(true);
    expect(menusToRoutes(menus).some((item) => item.path === '/rp/workflow')).toBe(true);
    expect(JSON.stringify(menus)).toBe(original);
});
it('直接业务地址自动选择工作区，跨页只保留阅读上下文', () => {
    expect(workspaceFor('/manage/biz/refunds')).toBe('manage');
    expect(workspaceFor('/manage/demo/list')).toBe('manage');
    expect(workspaceFor('/rp/mobile', '?library=1')).toBe('manage');
    expect(readingPath('/manage/biz/refunds', '?version=v0.8&scene=refund&step=manage&scenario=failure&change=CHG-003&review=1&token=secret')).toBe('/manage/biz/refunds?version=v0.8&scene=refund&step=manage&scenario=failure');
});
function Location() { const location = useLocation(); return <output aria-label="当前地址">{location.pathname}{location.search}</output>; }
it('工作区切换保留版本和场景，不携带页面专属改动', () => {
    renderWithProviders(<><WorkspaceSwitcher /><Location /></>, { route: '/rp/scenes?version=v0.8&scene=refund&step=apply&scenario=failure&change=CHG-005' });
    fireEvent.click(screen.getByRole('button', { name: '管理端' }));
    expect(screen.getByLabelText('当前地址')).toHaveTextContent('/manage?version=v0.8&scope=version&scene=refund&step=apply&scenario=failure');
    expect(screen.getByRole('button', { name: '管理端' })).toHaveAttribute('aria-pressed', 'true');
});
it('按版本仅展示本版管理端页面，完整范围保留完整产品目录', () => {
    const paths = (scope: 'version' | 'all') => flattenMenuPages(workspaceMenus(menus, 'manage', scope, currentRelease)).map((item) => item.path);
    expect(paths('version')).toContain('/manage/refund-demo');
    expect(paths('version')).not.toContain('/manage/biz/refunds');
    expect(paths('all')).toContain('/manage/biz/refunds');
    expect(paths('all')).not.toContain('/rp/components');
    expect(readingScope('')).toBe('version');
    expect(readingPath('/manage', '?scope=all')).toBe('/manage?scope=all');
    expect(flattenMenuPages(workspaceMenus(menus, 'manage', 'version'))).toHaveLength(1);
});
it('切换完整与差异，选择旧版保留当前端', () => {
    const assign = stubLocationAssign();
    renderWithProviders(<><WorkspaceSwitcher /><Location /></>, { route: '/manage' });
    expect(screen.queryByRole('button', { name: '组件示例' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '完整' }));
    expect(screen.getByLabelText('当前地址')).toHaveTextContent(`/manage?version=${currentVersion}&scope=all`);
    expect(screen.getByRole('combobox', { name: '工作区版本' })).toHaveTextContent(`${currentVersion}（当前）`);
    fireEvent.click(screen.getByRole('button', { name: '差异' }));
    fireEvent.click(screen.getByRole('combobox', { name: '工作区版本' }));
    fireEvent.click(screen.getByRole('option', { name: /v0\.2$/ }));
    expect(assign).toHaveBeenCalledWith('/versions/v0.2/rp/manage?scope=version');
    const historical = readingPath('/manage/refund-demo', '?version=v0.2&scope=version');
    expect(historical).toMatch(/^\/rp\/versions\?version=v0.2&scope=version/);
    expect(historical).not.toContain('compare=');
});

it('完整范围切换仍保留所选历史版本，不暴露当前业务菜单', () => {
    renderWithProviders(<><WorkspaceSwitcher /><Location /></>, { route: '/manage?version=v0.2&scope=version' });
    fireEvent.click(screen.getByRole('button', { name: '完整' }));
    expect(screen.getByLabelText('当前地址')).toHaveTextContent('/rp/manage?version=v0.2&scope=all');
    expect(screen.getByRole('combobox', { name: '工作区版本' })).toHaveTextContent('v0.2');
    const historical = releases.find((release) => release.id === 'v0.2')!;
    expect(flattenMenuPages(workspaceMenus(menus, 'manage', 'all', historical)).map((page) => page.path)).toEqual(['/manage']);
    fireEvent.click(screen.getByRole('button', { name: '差异' }));
    expect(screen.getByLabelText('当前地址')).toHaveTextContent('/rp/manage?version=v0.2&scope=version');
});

it('全局首页与指南不携带版本，指南文章在主菜单下组织', () => {
    renderWithProviders(<WorkspaceSwitcher />, { route: '/rp' });
    expect(screen.getByRole('combobox', { name: '工作区版本' })).toHaveTextContent(`${currentVersion}（当前）`);
    expect(screen.getByRole('button', { name: '完整' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('link', { name: '使用指南' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '版本改动' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '协作首页' })).toHaveAttribute('href', '/');
    const pages = flattenMenuPages(workspaceMenus(menus, 'collaboration', 'all', currentRelease, true));
    expect(pages.some((page) => page.path === '/rp/versions')).toBe(false);
    expect(pages.map((page) => page.path)).toEqual(['/rp', '/rp/demo']);
    expect(readingPath('/rp', '?version=v0.8&scope=all')).toBe('/');
});

it('首页按完整/差异、版本、端排列，选范围与版本时首页不跳转', () => {
    const assign = stubLocationAssign();
    renderWithProviders(<><WorkspaceSwitcher /><Location /></>, { route: '/rp' });
    const nav = screen.getByRole('navigation', { name: '工作区切换' });
    expect([...nav.children].map((node) => node.getAttribute('aria-label') || node.textContent)).toEqual(['协作首页', '查看范围', '工作区版本', '查看端']);
    fireEvent.click(screen.getByRole('button', { name: '差异' }));
    fireEvent.click(screen.getByRole('combobox', { name: '工作区版本' }));
    fireEvent.click(screen.getByRole('option', { name: /v0\.2$/ }));
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText('当前地址')).toHaveTextContent(/^\/rp$/);
    fireEvent.click(screen.getByRole('button', { name: '手机端' }));
    expect(assign).toHaveBeenCalledWith('/versions/v0.2/rp/mobile?scope=version');
    fireEvent.click(screen.getByRole('button', { name: '完整' }));
    fireEvent.click(screen.getByRole('button', { name: '管理端' }));
    expect(assign).toHaveBeenLastCalledWith('/versions/v0.2/rp/manage?scope=all');
});

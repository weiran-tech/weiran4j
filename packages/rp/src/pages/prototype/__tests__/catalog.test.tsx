import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/helpers';
import PrototypeCatalogPage from '../PrototypeCatalogPage';

afterEach(() => vi.unstubAllGlobals());
it('演示按端和模块分组，未改动页面可直接打开，不混入协作工作台', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
    renderWithProviders(<PrototypeCatalogPage />, { route: '/rp/demo?scope=all' });
    expect(screen.getByRole('heading', { name: '原型演示' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '账户管理 ↗' })).toHaveAttribute('href', expect.stringContaining('/versions/v0.8/manage/biz/accounts'));
    expect(screen.queryByRole('link', { name: '版本协作 ↗' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '手机端' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: '账户管理 ↗' })).not.toBeInTheDocument());
    expect(screen.queryByLabelText('模块')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /完整管理端原型/ })).toHaveAttribute('href', expect.stringContaining('scope=all'));
    expect(screen.getByRole('link', { name: /完整手机端原型/ })).toHaveAttribute('href', expect.stringContaining('scope=all'));
    expect(screen.getByRole('link', { name: '手机订单列表 ↗' })).toHaveAttribute('href', expect.stringContaining('#/orders'));
});

it('在目录内打开页面改动说明抽屉，不离开原型演示', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
    renderWithProviders(<PrototypeCatalogPage />, { route: '/rp/demo?scope=all' });
    expect(screen.queryByRole('heading', { name: '业务规则' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看 手机订单列表 改动说明' }));
    expect(await screen.findByRole('heading', { name: '手机订单按页面定位改动' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '业务规则' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新增改动' })).not.toBeInTheDocument();
});

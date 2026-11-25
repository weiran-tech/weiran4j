import { screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/helpers';
import { releases } from '@/prototype/catalog';
import DashboardPage from '../DashboardPage';
import VersionListPage from '@/pages/prototype/VersionListPage';
afterEach(() => vi.unstubAllGlobals());
it('独立清单展示全部版本，每个详情链接进入自己的版本路径', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json({ syncedAt: null, versions: {} }))));
    renderWithProviders(<VersionListPage />, { route: '/versions' });
    expect(await screen.findByRole('region', { name: '全部版本' })).toBeInTheDocument();
    for (const release of releases) {
        const card = screen.getByRole('article', { name: `${release.id} 版本` });
        expect(within(card).getByRole('link', { name: `查看 ${release.id} 详情` })).toHaveAttribute('href', `/versions/${release.id}/rp/versions`);
    }

});

it('首页只提供版本清单入口', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('link', { name: '查看版本清单 →' })).toHaveAttribute('href', '/versions');
    expect(screen.queryByRole('region', { name: '全部版本' })).not.toBeInTheDocument();
});

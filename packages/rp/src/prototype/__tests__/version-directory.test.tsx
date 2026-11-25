import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/helpers';
import ManageGuidePage from '@/pages/prototype/ManageGuidePage';
import { currentRelease, currentVersion, releases } from '../catalog';
import { VersionPageDirectory } from '../VersionPageDirectory';

afterEach(() => vi.unstubAllGlobals());
it('历史目录的完整双端及页面只读取对应快照，并关联改动说明', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([{ version: 'v0.2', base: '/releases/v0.2/', commit: 'a'.repeat(40), builtAt: '2026-11-23' }]))));
    renderWithProviders(<VersionPageDirectory release={releases.find((item) => item.id === 'v0.2')!} />, { route: '/rp/versions?version=v0.2&scenario=failure' });
    const directory = screen.getByRole('region', { name: '版本页面目录' });
    const link = await within(directory).findByRole('link', { name: /查看 v0.2 完整管理端原型/ });
    expect(link.getAttribute('href')).toContain('/releases/v0.2/dashboard?scope=all&version=v0.2');
    expect(within(directory).getByRole('link', { name: /完整手机端原型/ }).getAttribute('href')).toContain('/releases/v0.2/mobile/?scope=all&version=v0.2&scenario=failure#/orders');
    for (const page of within(directory).getAllByRole('link', { name: '打开此版页面 ↗' })) expect(page.getAttribute('href')).toMatch(/^\/releases\/v0.2\//);
    expect(within(directory).getAllByRole('link', { name: '查看改动说明' })[0]!.getAttribute('href')).toContain('/versions/v0.2/rp/versions?');
});
it('缺少历史快照时不提供当前完整原型，也不列当前业务菜单', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
    renderWithProviders(<ManageGuidePage />, { route: '/manage?version=v0.2&scope=all' });
    await waitFor(() => expect(screen.getByText('管理端完整原型：此版本尚未归档')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /查看 v0.2 完整管理端原型/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /完整业务目录/ })).not.toBeInTheDocument();
    expect(screen.getByText(/历史完整目录保留在对应快照中/)).toBeInTheDocument();
});
it('目录按端和模块去重页面；删除项打开基线页面并保留说明', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([{ version: 'v0.2', base: '/releases/v0.2/', commit: 'a'.repeat(40), builtAt: '2026-11-23' }]))));
    const removed = { ...currentRelease.changes.find((change) => change.platform === 'manage')!, type: 'remove', pageId: 'removed-page', pageTitle: '已移除业务页', previousPage: '/old-page', nextPage: null, page: '/old-page' };
    renderWithProviders(<VersionPageDirectory technical release={{ ...currentRelease, changes: [removed, { ...removed, id: 'CHG-999' }] }} />, { route: `/rp/versions?version=${currentVersion}` });
    expect(screen.getAllByRole('link', { name: '已移除业务页' })).toHaveLength(1);
    expect(screen.getByText(/CHG-999/)).toBeInTheDocument();
    expect((await screen.findByRole('link', { name: '打开删除前页面 ↗' })).getAttribute('href')).toContain('/releases/v0.2/old-page');
});

it('本版没有页面调整时完整目录仍展示继承页面，工作链接不带 version 参数', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([]))));
    renderWithProviders(<VersionPageDirectory release={{ ...currentRelease, changes: [] }} platform="manage" />, { route: '/rp/versions?scope=all' });
    expect(screen.getByRole('heading', { name: `${currentVersion} · 完整页面目录` })).toBeInTheDocument();
    expect(screen.getByText('账户管理', { selector: 'strong' })).toBeInTheDocument();
    const links = await screen.findAllByRole('link', { name: '打开此版页面 ↗' });
    expect(links.some((link) => link.getAttribute('href')?.startsWith(`/versions/${currentVersion}/manage/biz/accounts?`))).toBe(true);
    for (const link of links) expect(link.getAttribute('href')).not.toContain('version=');
    expect(screen.queryByRole('link', { name: '查看改动说明' })).not.toBeInTheDocument();
});

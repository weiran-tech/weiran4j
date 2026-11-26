import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { renderWithProviders } from '@/test/helpers';
import VersionsPage from '../VersionsPage';
import VersionEditorPage from '../VersionEditorPage';
import VersionListPage from '../VersionListPage';
import { addReview, updateReview, VERSION_STORAGE_KEY } from '@/mocks/prototype';
import { useLocation } from 'react-router-dom';

beforeEach(() => { localStorage.clear(); vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json([])))); });
afterEach(() => vi.unstubAllGlobals());

it('网页不创建版本，旧编辑入口转入指南且不清理草稿', () => {
    const first = renderWithProviders(<VersionListPage />);
    expect(screen.queryByText('创建版本')).not.toBeInTheDocument(); first.unmount();
    localStorage.setItem('prototype_editor_draft_v2', '历史草稿');
    function LocationProbe() { const location = useLocation(); return <output>{location.pathname}</output>; }
    renderWithProviders(<><VersionEditorPage /><LocationProbe /></>, { route: '/rp/editor?create=1' });
    expect(screen.getByText('/help/versions')).toBeInTheDocument();
    expect(localStorage.getItem('prototype_editor_draft_v2')).toBe('历史草稿');
});
it('旧交接与归档入口回到原型目录且保留历史存储', () => {
    localStorage.setItem('prototype_handoff_v0.8', '历史交接');
    renderWithProviders(<VersionsPage />, { route: '/rp/versions?tab=delivery&edit=1' });
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: /编辑交接|版本归档|保存草稿/ })).not.toBeInTheDocument();
    expect(localStorage.getItem('prototype_handoff_v0.8')).toBe('历史交接');
});
it('进行中版本可新增并编辑评审，其他版本不混入记录', () => {
    renderWithProviders(<VersionsPage />, { route: '/rp/versions?tab=review' });
    fireEvent.change(screen.getByLabelText('记录人'), { target: { value: '产品' } });
    fireEvent.change(screen.getByLabelText('评审意见'), { target: { value: '失败场景需保留金额' } });
    fireEvent.click(screen.getByRole('button', { name: '保存评审备注' }));
    expect(screen.getByText('失败场景需保留金额')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑评审记录' }));
    const fields = screen.getAllByLabelText('评审意见');
    fireEvent.change(fields.at(-1)!, { target: { value: '已复核失败场景' } });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
    expect(screen.getByText('已复核失败场景')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(VERSION_STORAGE_KEY)!) as { notes: Record<string, unknown[]> };
    expect(Object.keys(saved.notes)).toEqual(['v0.8']);
    expect(saved.notes['v0.8']).toHaveLength(1);
});
it('已完结版本评审只读，直接调用适配器也不能写入', () => {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify({ notes: { 'v0.2': [{ id: 'old', versionId: 'v0.2', pageId: '', author: '历史产品', text: '保留旧意见', date: '2026-11-23' }] } }));
    renderWithProviders(<VersionsPage />, { route: '/rp/versions?version=v0.2&tab=review' });
    expect(screen.getByText('保留旧意见')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存评审备注' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑评审记录' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出 JSON' })).toBeEnabled();
    expect(() => addReview('v0.2', { author: '测试', text: '篡改', pageId: '' })).toThrow(/进行中/);
    expect(() => updateReview('v0.2', 'old', { author: '测试', text: '篡改', pageId: '' })).toThrow(/进行中/);
});
it('拒绝不属于版本的页面和 CHG，存储损坏不覆盖原文', () => {
    expect(() => addReview('v0.8', { author: '测试', text: '意见', pageId: 'unknown' })).toThrow(/页面/);
    expect(() => addReview('v0.8', { author: '测试', text: '意见', pageId: 'mobile-orders', platform: 'mobile', changeId: 'CHG-003' })).toThrow(/匹配/);
    localStorage.setItem(VERSION_STORAGE_KEY, '{bad');
    expect(() => addReview('v0.8', { author: '测试', text: '意见', pageId: '' })).toThrow(/损坏/);
    expect(localStorage.getItem(VERSION_STORAGE_KEY)).toBe('{bad');
});

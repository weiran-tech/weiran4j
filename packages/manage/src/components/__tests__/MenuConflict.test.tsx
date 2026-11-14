import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { MenuFormModal } from '@/pages/system/menus/MenuFormModal';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import type { MenuNode } from '@/types/api';

const original: MenuNode = { id: 55, version: 4, parentId: 0, type: 'directory', title: '原目录', path: null, component: null, icon: null, permission: null, sort: 0, visible: true, keepAlive: false, isExternal: false, status: 'enabled', children: [] };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('菜单草稿冻结版本，冲突保留输入，取消/失败重载不替换，成功才更新字段和版本', async () => {
    let failReload = true;
    const latest = { ...original, version: 9, title: '远端目录' };
    const { calls } = mockFetch({
        'PUT /api-backend/system/menu/update/55': () => Response.json({ code: 100007, message: '版本冲突' }, { status: 409 }),
        'GET /api-backend/system/menu/list': () => failReload ? Response.json({ code: 100005, message: 'failed' }, { status: 500 }) : [latest],
    });
    function Harness() { const [record, setRecord] = useState(original); return <><button onClick={() => setRecord(latest)}>后台刷新</button><MenuFormModal target={{ mode: 'edit', record }} tree={[record]} onClose={() => {}} /></>; }
    renderWithProviders(<Harness />);
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '本地草稿' } });
    fireEvent.click(screen.getByText('后台刷新'));
    const dialog = screen.getByRole('dialog', { name: '编辑菜单' });
    fireEvent.click(within(dialog).getByText('确定', { selector: '.semi-button-content' }).closest('button')!);
    await screen.findByText(/当前输入已保留/);
    expect(calls.find(c => c.method === 'PUT')?.body).toMatchObject({ version: 4, title: '本地草稿' });
    expect(screen.getByLabelText('名称')).toHaveValue('本地草稿');
    expect(within(dialog).getByText('确定', { selector: '.semi-button-content' }).closest('button')).toBeDisabled();
    fireEvent.click(screen.getByText('重新加载最新数据'));
    fireEvent.click(screen.getByText('保留输入', { selector: '.semi-button-content' }).closest('button')!);
    expect(screen.getByLabelText('名称')).toHaveValue('本地草稿');
    fireEvent.click(screen.getByText('重新加载最新数据'));
    await act(async () => { await Promise.resolve(); fireEvent.click(screen.getByText('重新加载', { selector: '.semi-button-content' }).closest('button')!); });
    await screen.findByText(/重新加载失败/); expect(screen.getByLabelText('名称')).toHaveValue('本地草稿');
    failReload = false; fireEvent.click(screen.getByText('重新加载最新数据'));
    await act(async () => { await Promise.resolve(); fireEvent.click(screen.getByText('重新加载', { selector: '.semi-button-content' }).closest('button')!); });
    await waitFor(() => expect(screen.getByLabelText('名称')).toHaveValue('远端目录'));
    const reloadedDialog = screen.getByRole('dialog', { name: '编辑菜单' });
    expect(within(reloadedDialog).getByText('确定', { selector: '.semi-button-content' }).closest('button')).toBeEnabled();
    // Semi Modal 对同一确定按钮设有 100ms leading 防抖。
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 320)); });
    fireEvent.click(within(reloadedDialog).getByText('确定', { selector: '.semi-button-content' }).closest('button')!);
    await waitFor(() => expect(calls.filter(c => c.method === 'PUT')).toHaveLength(2));
    expect(calls.filter(c => c.method === 'PUT')[1]?.body).toMatchObject({ version: 9, title: '远端目录' });
});

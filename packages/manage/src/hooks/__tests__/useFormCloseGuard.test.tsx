import { Modal } from '@douyinfe/semi-ui';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { UserFormModal } from '@/pages/system/users/UserFormModal';
import { RegionFormModal } from '@/pages/system/regions/RegionFormModal';

const cases = [
    { kind: 'user', title: '新增用户', field: '昵称', initial: '', changed: '新用户', path: '/api-backend/system/user/create' },
    { kind: 'region', title: '新增地区', field: '地区名称', initial: '', changed: '新地区', path: '/api-backend/region/area/create' },
] as const;

function setup(kind: 'user' | 'region') {
    const onClose = vi.fn();
    const { fn } = mockFetch({
        'GET /api-backend/system/role/listOptions': [],
        'GET /api-backend/system/dict/listItemsByCode/sys_user_gender': [],
    });
    renderWithProviders(kind === 'user'
        ? <UserFormModal record={null} onClose={onClose} />
        : <RegionFormModal target={{ mode: 'create', parent: null }} tree={[]} onClose={onClose} />);
    return { onClose, fn };
}

function fillValidForm(dialog: HTMLElement, kind: 'user' | 'region') {
    const form = within(dialog);
    if (kind === 'user') {
        fireEvent.change(form.getByLabelText('用户名'), { target: { value: 'newuser' } });
        fireEvent.change(form.getByLabelText('昵称'), { target: { value: '新用户' } });
        fireEvent.change(form.getByLabelText('初始密码'), { target: { value: 'secret123' } });
    } else {
        fireEvent.change(form.getByLabelText('区划代码'), { target: { value: '120000' } });
        fireEvent.change(form.getByLabelText('地区名称'), { target: { value: '新地区' } });
    }
}

describe.each(cases)('$title 关闭保护', ({ kind, title, field, initial, changed, path }) => {
    afterEach(() => { Modal.destroyAll(); vi.unstubAllGlobals(); });

    it.each([false, true])('未修改或恢复初值后直接关闭（恢复初值=%s）', async (restore) => {
        const { onClose } = setup(kind);
        const dialog = await screen.findByRole('dialog', { name: title });
        if (restore) {
            const input = within(dialog).getByLabelText(field);
            await act(async () => { fireEvent.change(input, { target: { value: changed } }); await Promise.resolve(); });
            await act(async () => { fireEvent.change(input, { target: { value: initial } }); await Promise.resolve(); });
        }
        fireEvent.click(within(dialog).getByText('取消').closest('button')!);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('放弃修改？')).not.toBeInTheDocument();
    });

    it('有修改时可继续编辑保留输入，确认放弃才关闭', async () => {
        const { onClose } = setup(kind);
        const dialog = await screen.findByRole('dialog', { name: title });
        const input = within(dialog).getByLabelText(field);
        fireEvent.change(input, { target: { value: changed } });
        fireEvent.click(within(dialog).getByText('取消').closest('button')!);
        await screen.findByText('放弃修改？');
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('继续编辑').closest('button')!);
        await waitFor(() => expect(screen.queryByText('放弃修改？')).not.toBeInTheDocument());
        expect(input).toHaveValue(changed);
        fireEvent.click(within(dialog).getByRole('button', { name: 'close' }));
        await screen.findByText('放弃修改？');
        fireEvent.click(screen.getByText('放弃修改', { selector: '.semi-button-content' }).closest('button')!);
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('保存进行中阻止关闭和重复保存，成功直接关闭', async () => {
        const { onClose, fn } = setup(kind);
        const original = fn.getMockImplementation()!;
        let finish!: (response: Response) => void;
        const response = new Promise<Response>((resolve) => { finish = resolve; });
        fn.mockImplementation((input, init) => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).endsWith(path) ? response : original(input, init));
        const dialog = await screen.findByRole('dialog', { name: title });
        fillValidForm(dialog, kind);
        const ok = within(dialog).getByText('确定').closest('button')!;
        fireEvent.click(ok);
        await waitFor(() => expect(fn.mock.calls.some(([url]) => (typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).endsWith(path))).toBe(true));
        expect(ok).toBeDisabled();
        const cancel = within(dialog).getByText('取消').closest('button')!;
        expect(cancel).toBeDisabled();
        fireEvent.click(cancel);
        fireEvent.click(ok);
        fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 });
        expect(onClose).not.toHaveBeenCalled();
        expect(fn.mock.calls.filter(([url]) => (typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).endsWith(path))).toHaveLength(1);
        await act(async () => { finish(Response.json({ code: 0, message: 'ok', data: { id: 3 } })); await response; });
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(screen.queryByText('放弃修改？')).not.toBeInTheDocument();
    });

    it('保存失败保留输入，恢复取消及放弃确认', async () => {
        const { onClose, fn } = setup(kind);
        const original = fn.getMockImplementation()!;
        fn.mockImplementation((input, init) => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).endsWith(path)
            ? Promise.resolve(Response.json({ code: 100003, message: '内容重复' }, { status: 409 }))
            : original(input, init));
        const dialog = await screen.findByRole('dialog', { name: title });
        fillValidForm(dialog, kind);
        fireEvent.click(within(dialog).getByText('确定').closest('button')!);
        await waitFor(() => expect(fn.mock.calls.some(([url]) => (typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).endsWith(path))).toBe(true));
        const cancel = within(dialog).getByText('取消').closest('button')!;
        await waitFor(() => expect(cancel).not.toBeDisabled());
        expect(within(dialog).getByLabelText(field)).toHaveValue(changed);
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(cancel);
        expect(await screen.findByText('放弃修改？')).toBeInTheDocument();
        fireEvent.click(screen.getByText('继续编辑').closest('button')!);
        await waitFor(() => expect(screen.queryByText('放弃修改？')).not.toBeInTheDocument());
    });
});

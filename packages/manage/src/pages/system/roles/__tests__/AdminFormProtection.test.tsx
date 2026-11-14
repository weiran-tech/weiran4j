import { Modal } from '@douyinfe/semi-ui';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { RoleFormModal } from '../RoleFormModal';
import { MenuFormModal } from '../../menus/MenuFormModal';
import { DictFormModal, DictItemFormModal } from '../../dicts/DictFormModals';

const cases = [
    { kind: 'role', title: '新增角色', field: '角色名称', initial: '', changed: '新角色', path: '/api-backend/system/role/create' },
    { kind: 'menu', title: '新增菜单', field: '名称', initial: '', changed: '新菜单', path: '/api-backend/system/menu/create' },
    { kind: 'dict', title: '新增字典', field: '字典名称', initial: '', changed: '新字典', path: '/api-backend/system/dict/create' },
    { kind: 'item', title: '新增字典项', field: '标签', initial: '', changed: '新字典项', path: '/api-backend/system/dict/createItem/1' },
] as const;
type Kind = typeof cases[number]['kind'];
function setup(kind: Kind) {
    const onClose = vi.fn();
    const { fn } = mockFetch({});
    renderWithProviders(kind === 'role' ? <RoleFormModal record={null} onClose={onClose} />
        : kind === 'menu' ? <MenuFormModal target={{ mode: 'create', parent: null }} tree={[]} onClose={onClose} />
        : kind === 'dict' ? <DictFormModal record={null} onClose={onClose} />
        : <DictItemFormModal dictId={1} record={null} onClose={onClose} />);
    return { onClose, fn };
}
function fillValidForm(dialog: HTMLElement, kind: Kind) {
    const form = within(dialog);
    const fields = kind === 'role' ? { '角色名称': '新角色', '角色编码': 'new_role' }
        : kind === 'menu' ? { '名称': '新菜单', '路由路径': '/new-menu' }
        : kind === 'dict' ? { '字典名称': '新字典', '字典编码': 'new_dict' }
        : { '标签': '新字典项', '值': 'new_item' };
    for (const [label, value] of Object.entries(fields)) fireEvent.change(form.getByLabelText(label), { target: { value } });
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

    it('有修改时 Esc 也要求确认', async () => {
        const { onClose } = setup(kind);
        const dialog = await screen.findByRole('dialog', { name: title });
        fireEvent.change(within(dialog).getByLabelText(field), { target: { value: changed } });
        fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
        expect(await screen.findByText('放弃修改？')).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
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
        // 同一事件循环再点一次，覆盖校验尚未完成时的同步互斥。
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

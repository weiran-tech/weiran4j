import { Modal } from '@douyinfe/semi-ui';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import SecuritySettingsPage from '../SecuritySettingsPage';

const security = { passwordMinLength: 8, passwordMaxLength: 64, requireLower: true, requireUpper: false, requireDigit: true, requireSymbol: false, mfaEnabled: false, mfaRememberDays: 7, revision: 1 };
const record = { id: 42, configKey: 'system.user.enable_phone_login', configValue: 'false', configType: 'boolean', groupKey: 'user', fieldType: 'switch', fieldOptions: null, required: true, description: '启用手机号+短信验证码登录', isBuiltin: true };
const cases = [
    { heading: '密码策略', title: '修改密码策略', path: '/api-backend/system/security/updatePasswordRules', field: '密码最小长度' },
    { heading: '多因素认证', title: '修改多因素认证', path: '/api-backend/system/security/updateMfa', field: '启用' },
    { heading: '登录方式', title: '修改登录方式', path: '/api-backend/system/config/update/42', field: '启用手机号+短信验证码登录' },
];
async function setup(heading: string, title: string, path: string) {
    const mock = mockFetch({ 'GET /api-backend/system/security/get': security, 'GET /api-backend/system/config/listAll': [record], [`PUT ${path}`]: null });
    renderWithProviders(<SecuritySettingsPage />);
    const section = (await screen.findByRole('heading', { name: heading })).closest('section')!;
    await waitFor(() => expect(within(section).getByRole('button', { name: '修改' })).toBeEnabled());
    fireEvent.click(within(section).getByRole('button', { name: '修改' }));
    const sheet = screen.getByText(title, { exact: true }).closest<HTMLElement>('.semi-sidesheet')!;
    return { ...mock, sheet };
}
function edit(sheet: HTMLElement, field: string) {
    if (field === '密码最小长度') fireEvent.change(within(sheet).getByLabelText(field), { target: { value: '12' } });
    else fireEvent.click(within(sheet).getByRole('checkbox', { name: field }));
}
afterEach(() => { act(() => Modal.destroyAll()); vi.unstubAllGlobals(); });

async function expectClosed(sheet: HTMLElement) {
    const inner = sheet.querySelector('.semi-sidesheet-inner')!;
    await waitFor(() => expect(inner).toHaveClass('semi-sidesheet-animation-content_hide_right'));
}

describe.each(cases)('$title 关闭保护', ({ heading, title, path, field }) => {
    it('未修改时直接关闭', async () => {
        const { sheet } = await setup(heading, title, path);
        fireEvent.click(within(sheet).getByRole('button', { name: '取消' }));
        await expectClosed(sheet);
        expect(screen.queryByText('放弃修改？')).not.toBeInTheDocument();
    });
    it('取消和 Esc 都要求确认，继续编辑保留草稿，确认放弃后关闭', async () => {
        const { sheet } = await setup(heading, title, path);
        edit(sheet, field);
        fireEvent.click(within(sheet).getByRole('button', { name: '取消' }));
        await screen.findByText('放弃修改？');
        fireEvent.click(screen.getByText('继续编辑').closest('button')!);
        await waitFor(() => expect(screen.queryByText('放弃修改？')).not.toBeInTheDocument());
        if (field === '密码最小长度') expect(within(sheet).getByLabelText(field)).toHaveValue('12');
        else expect(within(sheet).getByRole('checkbox', { name: field })).toBeChecked();
        fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
        await screen.findByText('放弃修改？');
        fireEvent.click(screen.getByText('放弃修改', { selector: '.semi-button-content' }).closest('button')!);
        await expectClosed(sheet);
    });
    it.each([true, false])('保存中阻止取消、Esc 和重复提交，保存成功=%s', async success => {
        const { sheet, fn } = await setup(heading, title, path);
        const original = fn.getMockImplementation()!;
        let finish!: (response: Response) => void;
        const response = new Promise<Response>(resolve => { finish = resolve; });
        fn.mockImplementation((input, init) => init?.method === 'PUT' ? response : original(input, init));
        edit(sheet, field);
        const save = within(sheet).getByRole('button', { name: '保存' });
        fireEvent.click(save);
        fireEvent.click(save);
        await waitFor(() => expect(fn.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1));
        expect(save).toBeDisabled();
        expect(within(sheet).getByRole('button', { name: '取消' })).toBeDisabled();
        fireEvent.click(within(sheet).getByRole('button', { name: '取消' }));
        fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
        expect(screen.getByText(title, { exact: true })).toBeInTheDocument();
        expect(screen.queryByText('放弃修改？')).not.toBeInTheDocument();
        await act(async () => { finish(Response.json({ code: success ? 0 : 100002, message: success ? 'ok' : '保存失败', data: null }, { status: success ? 200 : 500 })); await response; });
        if (success) await expectClosed(sheet);
        else {
            await waitFor(() => expect(save).toBeEnabled());
            if (field === '密码最小长度') expect(within(sheet).getByLabelText(field)).toHaveValue('12');
            else expect(within(sheet).getByRole('checkbox', { name: field })).toBeChecked();
            fireEvent.click(within(sheet).getByRole('button', { name: '取消' }));
            expect(await screen.findByText('放弃修改？')).toBeInTheDocument();
        }
    });
});

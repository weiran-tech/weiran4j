import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders, stubLocationAssign } from '@/test/helpers';
import { signIn } from '@/test/session';
import type { CurrentUserView, ProvidersView, UserIdentityView } from '@/types/api';
import ProfilePage from '../ProfilePage';

const me: CurrentUserView = {
    id: 2,
    username: 'alice',
    nickname: '爱丽丝',
    phone: null,
    avatar: null,
    gender: null,
    roles: ['viewer'],
    permissions: [],
    hasPassword: true,
};

const providers: ProvidersView = {
    passwordLoginEnabled: true,
    providers: [
        { id: 'keycloak', type: 'oidc', name: '统一身份' },
        { id: 'cas', type: 'cas', name: '校园 CAS' },
    ],
};

const keycloakIdentity: UserIdentityView = {
    id: 11,
    provider: 'keycloak',
    providerName: '统一身份',
    externalId: 'f3a1-sub',
    displayName: 'Alice W',
    createdAt: '2026-10-06 09:00:00',
};

function SearchProbe() {
    return <div data-testid="search">{useLocation().search}</div>;
}

function routes(overrides: Record<string, unknown> = {}) {
    return {
        'GET /api-backend/system/auth/getCurrentUser': me,
        'GET /api-backend/system/dict/listItemsByCode/sys_user_gender': [],
        'GET /api-backend/n/system/auth/listProviders': providers,
        'GET /api-backend/system/auth/listCurrentIdentities': [keycloakIdentity],
        ...overrides,
    };
}

function renderProfile(route = '/profile') {
    signIn(2);
    return renderWithProviders(
        <Routes>
            <Route
                path="/profile"
                element={
                    <>
                        <ProfilePage />
                        <SearchProbe />
                    </>
                }
            />
        </Routes>,
        { route, permissions: [] },
    );
}

describe('ProfilePage 外部账号', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('列出已绑定身份，只给未绑定的提供方显示「绑定」按钮', async () => {
        mockFetch(routes());
        renderProfile();

        expect(await screen.findByText('f3a1-sub')).toBeInTheDocument();
        expect(screen.getByText('Alice W')).toBeInTheDocument();
        expect(screen.getByText('2026-10-06 09:00:00')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '绑定 校园 CAS' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '绑定 统一身份' })).not.toBeInTheDocument();
    });

    it('点「绑定」整页跳到 authorize，mode=bind、回到 /profile', async () => {
        const assign = stubLocationAssign();
        mockFetch(routes({ 'GET /api-backend/system/auth/listCurrentIdentities': [] }));
        renderProfile();

        fireEvent.click(await screen.findByRole('button', { name: '绑定 统一身份' }));
        expect(assign).toHaveBeenCalledWith('/api-backend/system/auth/authorizeSso/keycloak?redirect=%2Fprofile&mode=bind');
    });

    it('解绑：确认后调 DELETE /api-backend/system/auth/deleteCurrentIdentity/{id}', async () => {
        const { calls } = mockFetch(routes({ 'DELETE /api-backend/system/auth/deleteCurrentIdentity/11': null }));
        renderProfile();

        fireEvent.click(await screen.findByRole('button', { name: '解绑' }));
        const pop = await screen.findByText('确定解绑该外部账号？');
        fireEvent.click(within(pop.closest('.semi-popconfirm') as HTMLElement).getByRole('button', { name: '确定' }));
        await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api-backend/system/auth/deleteCurrentIdentity/11')).toBe(true));
    });

    it('?bound=<id> 显示成功提示并清掉参数', async () => {
        mockFetch(routes());
        renderProfile('/profile?bound=keycloak');
        expect(await screen.findByText('已绑定 统一身份')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
    });

    it('?ssoError=<code> 显示错误提示并清掉参数', async () => {
        mockFetch(routes());
        renderProfile('/profile?ssoError=100004');
        expect(await screen.findByText('该外部账号已绑定其他用户')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
    });

    it('没有启用的提供方时不显示卡片', async () => {
        mockFetch(routes({ 'GET /api-backend/n/system/auth/listProviders': { passwordLoginEnabled: true, providers: [] } }));
        renderProfile();
        expect(await screen.findByText('基本设置', { selector: '.page-container__title' })).toBeInTheDocument();
        expect(screen.queryByText('外部账号')).not.toBeInTheDocument();
    });

    it('hasPassword=false：密码行显示未设置且没有修改入口', async () => {
        mockFetch(routes({ 'GET /api-backend/system/auth/getCurrentUser': { ...me, hasPassword: false } }));
        renderProfile();
        expect(await screen.findByText('登录密码')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '修改登录密码' })).not.toBeInTheDocument();
    });

    it('hasPassword=true：修改密码表单在弹窗中打开', async () => {
        mockFetch(routes());
        renderProfile();
        fireEvent.click(await screen.findByRole('button', { name: '修改登录密码' }));
        expect(screen.getByText('修改登录密码', { selector: '.semi-modal-title' })).toBeInTheDocument();
        expect(screen.getByText('原密码')).toBeInTheDocument();
    });

    it('本人修改用户名后刷新个人信息', async () => {
        let currentUser = me;
        const { calls } = mockFetch(routes({
            'GET /api-backend/system/auth/getCurrentUser': () => currentUser,
            'PUT /api-backend/system/auth/updateUsername': () => {
                currentUser = { ...me, username: '9_alice' };
                return null;
            },
        }));
        renderProfile();

        fireEvent.click(await screen.findByRole('button', { name: '修改用户名' }));
        fireEvent.change(screen.getByLabelText('新用户名'), { target: { value: '9_alice' } });
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'confirm' }));

        await waitFor(() => expect(calls.find((call) => call.path === '/api-backend/system/auth/updateUsername')).toMatchObject({
            method: 'PUT',
            body: { username: '9_alice' },
        }));
        expect(await screen.findByText('9_alice')).toBeInTheDocument();
    });

    it('本人修改用户名时拒绝大写、点和横线', async () => {
        const { calls } = mockFetch(routes());
        renderProfile();
        fireEvent.click(await screen.findByRole('button', { name: '修改用户名' }));

        for (const invalid of ['Alice', 'alice.name', 'alice-name']) {
            fireEvent.change(screen.getByLabelText('新用户名'), { target: { value: invalid } });
            fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'confirm' }));
        }
        expect(calls.some((call) => call.path === '/api-backend/system/auth/updateUsername')).toBe(false);
    });

    it('头像从头像操作打开，选色时预览更新', async () => {
        mockFetch(routes());
        renderProfile();
        fireEvent.click(await screen.findByRole('button', { name: '修改头像' }));
        const preview = screen.getByText('预览头像').previousElementSibling as HTMLElement;
        expect(preview).toHaveStyle({ backgroundColor: '#0064FA' });
        fireEvent.click(screen.getByRole('button', { name: '选择背景色 #00A870' }));
        expect(preview).toHaveStyle({ backgroundColor: '#00A870' });
    });

    it('安全手机号通过弹窗发码，验证码成功发送后才能提交', async () => {
        const { calls } = mockFetch(routes({ 'POST /api-backend/system/auth/sendBindPhoneCode': null }));
        renderProfile();
        fireEvent.click(await screen.findByRole('button', { name: '修改安全手机号' }));
        expect(screen.queryByLabelText('短信验证码')).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('新手机号'), { target: { value: '13800000001' } });
        fireEvent.click(screen.getByRole('button', { name: '发送验证码' }));
        await waitFor(() => expect(calls.some((call) => call.path === '/api-backend/system/auth/sendBindPhoneCode')).toBe(true));
        expect(await screen.findByLabelText('短信验证码')).toBeInTheDocument();
    });
});

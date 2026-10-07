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
    email: null,
    phone: null,
    avatar: null,
    gender: null,
    departmentId: null,
    departmentName: null,
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
        'GET /api/auth/me': me,
        'GET /api/dicts/code/sys_user_gender/items': [],
        'GET /api/auth/providers': providers,
        'GET /api/auth/identities': [keycloakIdentity],
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
        mockFetch(routes({ 'GET /api/auth/identities': [] }));
        renderProfile();

        fireEvent.click(await screen.findByRole('button', { name: '绑定 统一身份' }));
        expect(assign).toHaveBeenCalledWith('/api/auth/sso/keycloak/authorize?redirect=%2Fprofile&mode=bind');
    });

    it('解绑：确认后调 DELETE /api/auth/identities/{id}', async () => {
        const { calls } = mockFetch(routes({ 'DELETE /api/auth/identities/11': null }));
        renderProfile();

        fireEvent.click(await screen.findByRole('button', { name: '解绑' }));
        const pop = await screen.findByText('确定解绑该外部账号？');
        fireEvent.click(within(pop.closest('.semi-popconfirm') as HTMLElement).getByRole('button', { name: '确定' }));
        await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/auth/identities/11')).toBe(true));
    });

    it('?bound=<id> 显示成功提示并清掉参数', async () => {
        mockFetch(routes());
        renderProfile('/profile?bound=keycloak');
        expect(await screen.findByText('已绑定 统一身份')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
    });

    it('?ssoError=<code> 显示错误提示并清掉参数', async () => {
        mockFetch(routes());
        renderProfile('/profile?ssoError=40901');
        expect(await screen.findByText('该外部账号已绑定其他用户')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
    });

    it('没有启用的提供方时不显示卡片', async () => {
        mockFetch(routes({ 'GET /api/auth/providers': { passwordLoginEnabled: true, providers: [] } }));
        renderProfile();
        expect(await screen.findByText('修改密码', { selector: '.page-container__title' })).toBeInTheDocument();
        expect(screen.queryByText('外部账号')).not.toBeInTheDocument();
    });

    it('hasPassword=false：修改密码区只显示提示，没有密码表单', async () => {
        mockFetch(routes({ 'GET /api/auth/me': { ...me, hasPassword: false } }));
        renderProfile();
        expect(await screen.findByText('未设置本地密码，可请管理员重置后再使用密码登录')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '修改密码' })).not.toBeInTheDocument();
    });

    it('hasPassword=true：显示修改密码表单', async () => {
        mockFetch(routes());
        renderProfile();
        expect(await screen.findByRole('button', { name: '修改密码' })).toBeInTheDocument();
        expect(screen.queryByText('未设置本地密码，可请管理员重置后再使用密码登录')).not.toBeInTheDocument();
    });
});

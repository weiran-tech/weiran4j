import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, page, renderWithProviders } from '@/test/helpers';
import type { UserIdentityView, UserView } from '@/types/api';
import UsersPage from '../UsersPage';
import { UserIdentitiesModal } from '../UserIdentitiesModal';

const alice: UserView = {
    id: 2,
    username: 'alice',
    nickname: '爱丽丝',
    email: null,
    phone: null,
    avatar: null,
    gender: null,
    departmentId: null,
    departmentName: null,
    status: 'enabled',
    isBuiltin: false,
    roleIds: [],
    roleNames: [],
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: '2026-09-01 00:00:00',
    updatedAt: '2026-09-01 00:00:00',
};

const identity: UserIdentityView = {
    id: 31,
    provider: 'keycloak',
    providerName: '统一身份',
    externalId: 'alice-sub',
    displayName: null,
    createdAt: '2026-10-06 09:00:00',
};

const providersRoute = {
    'GET /api/auth/providers': { passwordLoginEnabled: true, providers: [{ id: 'keycloak', type: 'oidc', name: '统一身份' }] },
};

describe('UserIdentitiesModal', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('列出该用户的外部身份；只剩一个时解绑确认提示可能无法登录', async () => {
        const { calls } = mockFetch({
            ...providersRoute,
            'GET /api/users/2/identities': [identity],
            'DELETE /api/users/2/identities/31': null,
        });
        renderWithProviders(<UserIdentitiesModal user={alice} onClose={() => undefined} />);

        expect(await screen.findByText('alice-sub')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '解绑' }));
        const pop = await screen.findByText('这是该用户唯一的外部身份，解绑后该用户可能无法登录');
        fireEvent.click(within(pop.closest('.semi-popconfirm') as HTMLElement).getByRole('button', { name: '确定' }));
        await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/users/2/identities/31')).toBe(true));
    });

    it('手工绑定：必填校验后 POST {provider, externalId, displayName}', async () => {
        const { calls } = mockFetch({
            ...providersRoute,
            'GET /api/users/2/identities': [],
            'POST /api/users/2/identities': { id: 32 },
        });
        renderWithProviders(<UserIdentitiesModal user={alice} onClose={() => undefined} />);

        fireEvent.click(await screen.findByRole('button', { name: '绑定' }));
        expect(await screen.findByText('请选择提供方')).toBeInTheDocument();
        expect(screen.getByText('请输入外部用户标识')).toBeInTheDocument();
        expect(calls.some((c) => c.method === 'POST')).toBe(false);

        // Semi Select 在外层 .semi-select 上响应点击展开
        fireEvent.click(document.querySelector('.semi-select') as HTMLElement);
        fireEvent.click(await screen.findByText('统一身份', { selector: '.semi-select-option *' }));
        fireEvent.change(screen.getByPlaceholderText('OIDC 的 sub / CAS 用户名'), { target: { value: ' alice-sub ' } });
        fireEvent.change(screen.getByPlaceholderText('可选'), { target: { value: 'Alice' } });
        fireEvent.click(screen.getByRole('button', { name: '绑定' }));

        await waitFor(() =>
            expect(calls.find((c) => c.method === 'POST')).toMatchObject({
                path: '/api/users/2/identities',
                body: { provider: 'keycloak', externalId: 'alice-sub', displayName: 'Alice' },
            }),
        );
    });
});

describe('UsersPage「外部身份」行操作', () => {
    afterEach(() => vi.unstubAllGlobals());

    const listRoutes = {
        'GET /api/users': page([alice], 1),
        'GET /api/dicts/code/sys_user_gender/items': [],
        'GET /api/dicts/code/sys_common_status/items': [],
        'GET /api/departments': [],
        'GET /api/roles/options': [],
    };

    it('有 system:user:identity 时显示，点击打开弹窗', async () => {
        mockFetch({ ...listRoutes, ...providersRoute, 'GET /api/users/2/identities': [identity] });
        renderWithProviders(<UsersPage />, { permissions: ['system:user:identity'] });

        fireEvent.click(await screen.findByRole('button', { name: '外部身份' }));
        expect(await screen.findByText('外部身份：alice')).toBeInTheDocument();
        expect(await screen.findByText('alice-sub')).toBeInTheDocument();
    });

    it('没有 system:user:identity 时不显示', async () => {
        mockFetch(listRoutes);
        renderWithProviders(<UsersPage />, { permissions: ['system:user:update'] });

        expect(await screen.findByText('alice')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '外部身份' })).not.toBeInTheDocument();
    });
});

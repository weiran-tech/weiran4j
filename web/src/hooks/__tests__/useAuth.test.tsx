import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders, stubLocationAssign } from '@/test/helpers';
import { signIn } from '@/test/session';
import { getSession } from '@/utils/session';
import { useAuth } from '../useAuth';

function LogoutButton() {
    const { logout } = useAuth();
    return (
        <button type="button" onClick={() => void logout()}>
            退出
        </button>
    );
}

async function clickLogout() {
    signIn();
    renderWithProviders(<LogoutButton />);
    fireEvent.click(screen.getByRole('button', { name: '退出' }));
    await waitFor(() => expect(getSession()).toBeNull());
}

describe('useAuth.logout', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('响应带 ssoLogoutUrl：清本地会话后整页跳到提供方登出地址', async () => {
        const assign = stubLocationAssign();
        mockFetch({ 'POST /api/auth/logout': { ssoLogoutUrl: 'https://sso.example.com/logout?post_logout_redirect_uri=x' }, 'GET /api/auth/me': null });
        await clickLogout();
        expect(assign).toHaveBeenCalledWith('https://sso.example.com/logout?post_logout_redirect_uri=x');
    });

    it('ssoLogoutUrl 为 null：只清本地，不跳转', async () => {
        const assign = stubLocationAssign();
        mockFetch({ 'POST /api/auth/logout': { ssoLogoutUrl: null }, 'GET /api/auth/me': null });
        await clickLogout();
        expect(assign).not.toHaveBeenCalled();
    });

    it('登出接口失败：照样清本地，不跳转', async () => {
        const assign = stubLocationAssign();
        mockFetch({ 'POST /api/auth/logout': () => Response.json({ code: 50000, message: '服务异常', data: null }, { status: 500 }), 'GET /api/auth/me': null });
        await clickLogout();
        expect(assign).not.toHaveBeenCalled();
    });
});

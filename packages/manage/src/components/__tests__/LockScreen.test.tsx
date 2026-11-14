import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { LockScreen } from '../LockScreen';

describe('LockScreen', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('有本地密码：显示密码框与「解锁」', () => {
        mockFetch({});
        renderWithProviders(<LockScreen user={{ username: 'alice', hasPassword: true }} onUnlocked={() => undefined} onReLogin={() => undefined} />);
        expect(screen.getByLabelText('登录密码')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '解锁' })).toBeInTheDocument();
    });

    it('hasPassword=false：不显示密码框，只能「重新登录」', () => {
        mockFetch({});
        const onReLogin = vi.fn();
        renderWithProviders(<LockScreen user={{ username: 'alice', hasPassword: false }} onUnlocked={() => undefined} onReLogin={onReLogin} />);
        expect(screen.queryByLabelText('登录密码')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '解锁' })).not.toBeInTheDocument();
        expect(screen.getByText('当前账号未设置本地密码，请重新登录后继续')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '重新登录' }));
        expect(onReLogin).toHaveBeenCalledTimes(1);
    });
});

it('429 保留会话和锁屏，主动重试成功才解锁', async () => {
    const { waitFor } = await import('@testing-library/react');
    const { signIn } = await import('@/test/session');
    const { getSession } = await import('@/utils/session');
    signIn(2, 'csrf');
    let limited = true;
    const { calls } = mockFetch({ 'POST /api-backend/system/auth/verifyPassword': () => limited ? Response.json({ code: 110108, message: '请求过于频繁，请稍后重试', data: null }, { status: 429 }) : null });
    const unlocked = vi.fn();
    renderWithProviders(<LockScreen user={{ username: 'alice', hasPassword: true }} onUnlocked={unlocked} onReLogin={() => undefined} />);
    fireEvent.change(screen.getByLabelText('登录密码'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: '解锁' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('请求过于频繁');
    expect(getSession()).toBe('2.csrf');
    expect(unlocked).not.toHaveBeenCalled();
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
    limited = false;
    fireEvent.change(screen.getByLabelText('登录密码'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: '解锁' }));
    await waitFor(() => expect(unlocked).toHaveBeenCalledTimes(1));
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(2);
});

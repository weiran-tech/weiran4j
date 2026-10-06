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

import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/helpers';
import type { UserView } from '@/types/api';
import { SetUserAccountFieldModal } from '../SetUserAccountFieldModal';

const user: UserView = {
    id: 2,
    username: 'alice',
    nickname: '爱丽丝',
    phone: '13800000000',
    avatar: null,
    gender: 'female',
    status: 'enabled',
    isBuiltin: false,
    roleIds: [],
    roleNames: [],
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: '2026-09-01 00:00:00',
    updatedAt: '2026-09-01 00:00:00',
};

describe('SetUserAccountFieldModal', () => {
    it('切换到手机号时同步更新输入框提示和当前值', () => {
        renderWithProviders(<SetUserAccountFieldModal user={user} onClose={vi.fn()} />);

        expect(screen.getByPlaceholderText('请输入用户名')).toHaveValue('alice');
        fireEvent.click(screen.getByText('手机号'));
        expect(screen.getByPlaceholderText('请输入手机号')).toHaveValue('13800000000');
    });
});

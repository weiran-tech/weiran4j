import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../LoginPage';

describe('LoginPage', () => {
    it('renders the Semi-based login form', () => {
        const queryClient = new QueryClient();
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <LoginPage />
                </MemoryRouter>
            </QueryClientProvider>,
        );

        expect(screen.getByText('weiran4j 登录')).toBeInTheDocument();
        expect(screen.getByText('通行证')).toBeInTheDocument();
        expect(screen.getByText('密码')).toBeInTheDocument();
        expect(screen.getByText('登录空间')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    });
});

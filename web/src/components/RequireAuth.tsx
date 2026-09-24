import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { fetchCurrentAccount, hasToken } from '../lib/auth';

/**
 * 路由守卫。
 *
 * 判定依据是 `/api/v1/auth/me` 的结果，而不是「本地有没有令牌」——
 * 本地令牌可能已过期、已被改密失效、甚至是手工塞进去的。
 * 令牌只用来决定「要不要发这个请求」，能不能进由后端说了算。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
    const { data, isPending, isError } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: fetchCurrentAccount,
        enabled: hasToken(),
    });

    if (!hasToken() || isError) {
        return <Navigate to="/login" replace />;
    }
    if (isPending) {
        return <div style={{ padding: 24 }}>加载中…</div>;
    }
    return data ? <>{children}</> : <Navigate to="/login" replace />;
}

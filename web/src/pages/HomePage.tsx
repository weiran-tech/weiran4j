import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentAccount, hasPermission, logout } from '../lib/auth';

/**
 * 首页。
 *
 * 骨架期它的作用是把「登录闭环真的通了」显示出来：当前账号、角色、权限一览，
 * 以及一个按权限显隐的示例入口。后续业务页面替换掉这里的内容。
 */
export function HomePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: account } = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchCurrentAccount });

    function onLogout() {
        logout();
        queryClient.clear();
        void navigate('/login', { replace: true });
    }

    if (!account) {
        return null;
    }

    return (
        <div style={{ maxWidth: 720, margin: '48px auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: 20 }}>
                    {account.displayName}
                    <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>
                        #{account.accountId} · {account.accountType}
                    </span>
                </h1>
                <button type="button" onClick={onLogout}>
                    退出登录
                </button>
            </div>

            <section style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 15 }}>角色</h2>
                <p style={{ color: '#444' }}>{account.roles.join('、') || '（无）'}</p>
            </section>

            <section style={{ marginTop: 16 }}>
                <h2 style={{ fontSize: 15 }}>权限</h2>
                <ul style={{ color: '#444' }}>
                    {account.permissions.length === 0 && <li>（无）</li>}
                    {account.permissions.map((permission) => (
                        <li key={permission}>{permission}</li>
                    ))}
                </ul>
            </section>

            {/* 按权限显隐只是隐藏入口，真正的拦截始终在后端 */}
            {hasPermission(account, 'weiran-system:account.index') && (
                <section style={{ marginTop: 16 }}>
                    <button type="button">账号管理（示例入口）</button>
                </section>
            )}
        </div>
    );
}

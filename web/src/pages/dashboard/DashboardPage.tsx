import { Avatar, Descriptions, Tag } from '@douyinfe/semi-ui';
import dayjs from 'dayjs';
import { DictTag } from '@/components/DictTag';
import { PageContainer } from '@/components/PageContainer';
import { config } from '@/config';
import { useAuth } from '@/hooks/useAuth';
import './DashboardPage.css';

function greeting(): string {
    const h = dayjs().hour();
    if (h < 6) return '夜深了';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
}

export default function DashboardPage() {
    const { user } = useAuth();
    if (!user) return null;

    const name = user.nickname || user.username;
    const isSuper = user.permissions.includes('*');
    const stats = [
        { label: '所属部门', value: user.departmentName || '—' },
        { label: '角色', value: user.roles.length },
        { label: '权限', value: isSuper ? '全部' : user.permissions.length },
    ];

    return (
        <>
            <section className="dashboard-hero">
                <Avatar size="large" className="dashboard-hero__avatar" {...(user.avatar ? { src: user.avatar } : {})}>
                    {name.slice(0, 1)}
                </Avatar>
                <div>
                    <div className="dashboard-hero__title">
                        {greeting()}，{name}
                    </div>
                    <div className="dashboard-hero__desc">欢迎使用 {config.appTitle}</div>
                </div>
            </section>
            <div className="dashboard-stats">
                {stats.map((s) => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-card__value">{s.value}</div>
                        <div className="stat-card__label">{s.label}</div>
                    </div>
                ))}
            </div>
            <PageContainer title="当前用户">
                <Descriptions
                    align="left"
                    data={[
                        { key: '用户名', value: user.username },
                        { key: '昵称', value: user.nickname || '—' },
                        { key: '部门', value: user.departmentName || '—' },
                        { key: '性别', value: <DictTag dictCode="sys_user_gender" value={user.gender} /> },
                        { key: '邮箱', value: user.email || '—' },
                        { key: '手机', value: user.phone || '—' },
                        {
                            key: '角色',
                            value: user.roles.length
                                ? user.roles.map((r) => (
                                      <Tag key={r} size="small" style={{ marginRight: 4 }}>
                                          {r}
                                      </Tag>
                                  ))
                                : '—',
                        },
                        {
                            key: '权限',
                            value: isSuper ? '全部权限（超级管理员）' : `${user.permissions.length} 项`,
                        },
                    ]}
                />
            </PageContainer>
        </>
    );
}

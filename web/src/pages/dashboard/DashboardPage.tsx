import { Avatar, Descriptions, Tag, Typography } from '@douyinfe/semi-ui';
import dayjs from 'dayjs';
import { PageContainer } from '@/components/PageContainer';
import { DictTag } from '@/components/DictTag';
import { config } from '@/config';
import { useAuth } from '@/hooks/useAuth';

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

    return (
        <>
            <PageContainer>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar size="large" color="blue" {...(user.avatar ? { src: user.avatar } : {})}>
                        {(user.nickname || user.username).slice(0, 1)}
                    </Avatar>
                    <div>
                        <Typography.Title heading={4} style={{ margin: 0 }}>
                            {greeting()}，{user.nickname || user.username}
                        </Typography.Title>
                        <Typography.Text type="tertiary">欢迎使用 {config.appTitle}</Typography.Text>
                    </div>
                </div>
            </PageContainer>
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
                            value: user.permissions.includes('*') ? '全部权限（超级管理员）' : `${user.permissions.length} 项`,
                        },
                    ]}
                />
            </PageContainer>
        </>
    );
}

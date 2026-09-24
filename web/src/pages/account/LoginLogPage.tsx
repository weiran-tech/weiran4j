import { Table, Button } from '@douyinfe/semi-ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchLoginLogs } from '../../lib/account';

/**
 * 登录日志只读页面，挂在账号管理下。
 *
 * 复用 `pam_account.logined_at`/`login_ip`，不是独立流水表，结果至多一条——
 * 仍走列表组件展示是为了与其它列表页保持一致的视觉形态，不是暗示有分页数据。
 */
export function LoginLogPage() {
    const params = useParams<{ id: string }>();
    const navigate = useNavigate();
    const accountId = Number(params.id);

    const { data, isPending } = useQuery({
        queryKey: ['accounts', accountId, 'login-logs'],
        queryFn: () => fetchLoginLogs(accountId),
        enabled: Number.isFinite(accountId),
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>登录日志</h2>
                <Button onClick={() => void navigate('/accounts')}>返回账号列表</Button>
            </div>
            <Table
                loading={isPending}
                dataSource={data?.items ?? []}
                rowKey={() => 'login-log'}
                pagination={false}
                columns={[
                    { title: '最近登录时间', dataIndex: 'loginedAt', render: (value: string | null) => value ?? '（从未登录）' },
                    { title: '来源 IP', dataIndex: 'loginIp', render: (value: string | null) => value ?? '（无）' },
                ]}
            />
        </div>
    );
}

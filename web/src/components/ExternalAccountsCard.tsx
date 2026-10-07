import { Banner, Button, Popconfirm, Space, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/PageContainer';
import { ssoAuthorizeUrl, ssoErrorMessage, useMyIdentities, useProviders, useUnbindMyIdentity } from '@/hooks/queries/identities';
import type { UserIdentityView } from '@/types/api';

/** 绑定流程结束后回到的页面：后端 bind 模式固定 302 到 `/profile?bound=<id>` 或 `/profile?ssoError=<code>` */
const PROFILE_PATH = '/profile';

type Notice = { type: 'success' | 'danger'; text: string };

/**
 * 个人中心「外部账号」卡片（D-015）：列出本人已绑定的外部身份并可解绑；每个尚未绑定的提供方一个「绑定」按钮，
 * 整页跳到 `/api/auth/sso/{id}/authorize?mode=bind`。读 URL 上的 `bound` / `ssoError` 给出结果提示后清掉参数。
 * 没有启用任何提供方时整张卡片不渲染。
 */
export function ExternalAccountsCard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: providersView } = useProviders();
    const { data: identities, isFetching } = useMyIdentities();
    const unbind = useUnbindMyIdentity();
    const providers = providersView?.providers ?? [];

    // 绑定回跳是整页加载，挂载时读一次即可；提供方名称在渲染时再查（providers 可能还没加载完）
    const [result] = useState(() => ({ bound: searchParams.get('bound'), ssoError: searchParams.get('ssoError') }));
    useEffect(() => {
        if (!searchParams.has('bound') && !searchParams.has('ssoError')) return;
        const next = new URLSearchParams(searchParams);
        next.delete('bound');
        next.delete('ssoError');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    if (!providers.length) return null;

    let notice: Notice | null = null;
    if (result.ssoError) notice = { type: 'danger', text: ssoErrorMessage(result.ssoError) };
    else if (result.bound) {
        const name = providers.find((p) => p.id === result.bound)?.name ?? result.bound;
        notice = { type: 'success', text: `已绑定 ${name}` };
    }

    const boundProviders = new Set((identities ?? []).map((i) => i.provider));
    const unbound = providers.filter((p) => !boundProviders.has(p.id));

    const columns: ColumnProps<UserIdentityView>[] = [
        { title: '提供方', dataIndex: 'providerName', width: 120 },
        { title: '外部标识', dataIndex: 'externalId' },
        { title: '显示名', dataIndex: 'displayName', width: 120, render: (v: string | null) => v || '—' },
        { title: '绑定时间', dataIndex: 'createdAt', width: 158 },
        {
            title: '操作',
            dataIndex: 'actions',
            width: 72,
            render: (_: unknown, record: UserIdentityView) => (
                <Popconfirm
                    title="确定解绑该外部账号？"
                    content={`解绑后不能再用 ${record.providerName} 登录本账号`}
                    onConfirm={() => unbind.mutate(record.id, { onSuccess: () => Toast.success('已解绑') })}
                >
                    <Button theme="borderless" size="small" type="danger">
                        解绑
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <PageContainer title="外部账号">
            {notice && <Banner type={notice.type} description={notice.text} closeIcon={null} style={{ marginBottom: 12 }} />}
            <Table<UserIdentityView>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={identities ?? []}
                loading={isFetching}
                pagination={false}
                empty="尚未绑定外部账号"
            />
            {unbound.length > 0 && (
                <Space wrap style={{ marginTop: 12 }}>
                    {unbound.map((p) => (
                        <Button key={p.id} onClick={() => window.location.assign(ssoAuthorizeUrl(p.id, { redirect: PROFILE_PATH, mode: 'bind' }))}>
                            绑定 {p.name}
                        </Button>
                    ))}
                </Space>
            )}
        </PageContainer>
    );
}

import { Button, Form, Modal, Popconfirm, Table, Toast, Typography } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useRef } from 'react';
import { useBindUserIdentity, useProviders, useUnbindUserIdentity, useUserIdentities } from '@/hooks/queries/identities';
import type { UserIdentityView, UserView } from '@/types/api';

interface BindForm {
    provider: string;
    externalId: string;
    displayName?: string;
}

interface Props {
    user: UserView;
    onClose: () => void;
}

/**
 * 管理员查看 / 绑定 / 解绑某用户的外部身份（权限 `system:user:identity`，契约 §6.2）。
 * 外部用户标识要与提供方回传的一致（OIDC 的 `sub`、CAS 的用户名），绑定后该用户即可用对应提供方登录。
 */
export function UserIdentitiesModal({ user, onClose }: Props) {
    const { data: identities, isFetching } = useUserIdentities(user.id);
    const { data: providersView } = useProviders();
    const bind = useBindUserIdentity(user.id);
    const unbind = useUnbindUserIdentity(user.id);
    const api = useRef<FormApi<BindForm> | null>(null);
    const list = identities ?? [];

    // onSubmit 只在表单校验通过后调用
    const submit = async (v: BindForm) => {
        const displayName = v.displayName?.trim();
        await bind.mutateAsync({ provider: v.provider, externalId: v.externalId.trim(), ...(displayName ? { displayName } : {}) });
        Toast.success('已绑定');
        api.current?.reset();
    };

    const columns: ColumnProps<UserIdentityView>[] = [
        { title: '提供方', dataIndex: 'providerName', width: 110 },
        { title: '外部标识', dataIndex: 'externalId' },
        { title: '显示名', dataIndex: 'displayName', width: 110, render: (v: string | null) => v || '—' },
        { title: '绑定时间', dataIndex: 'createdAt', width: 158 },
        {
            title: '操作',
            dataIndex: 'actions',
            width: 72,
            render: (_: unknown, record: UserIdentityView) => (
                <Popconfirm
                    title="确定解绑该外部身份？"
                    // 管理员可以解绑最后一个（后端不拦），没有本地密码的用户随之无法登录
                    content={list.length <= 1 ? '这是该用户唯一的外部身份，解绑后该用户可能无法登录' : `解绑后不能再用 ${record.providerName} 登录`}
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
        <Modal visible title={`外部身份：${user.username}`} onCancel={onClose} footer={null} width={720} maskClosable={false}>
            <Table<UserIdentityView>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={list}
                loading={isFetching}
                pagination={false}
                empty="尚未绑定外部身份"
            />
            <Typography.Title heading={6} style={{ margin: '20px 0 8px' }}>
                手工绑定
            </Typography.Title>
            <Form<BindForm>
                layout="horizontal"
                getFormApi={(a) => {
                    api.current = a;
                }}
                onSubmit={(v) => void submit(v).catch(() => undefined)}
            >
                <Form.Select
                    field="provider"
                    label="提供方"
                    placeholder="请选择"
                    style={{ width: 140 }}
                    optionList={(providersView?.providers ?? []).map((p) => ({ value: p.id, label: p.name }))}
                    rules={[{ required: true, message: '请选择提供方' }]}
                />
                <Form.Input
                    field="externalId"
                    label="外部用户标识"
                    placeholder="OIDC 的 sub / CAS 用户名"
                    maxLength={191}
                    rules={[{ required: true, whitespace: true, message: '请输入外部用户标识' }]}
                />
                <Form.Input field="displayName" label="显示名" placeholder="可选" maxLength={64} />
                <Button htmlType="submit" type="primary" theme="solid" loading={bind.isPending} style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
                    绑定
                </Button>
            </Form>
        </Modal>
    );
}

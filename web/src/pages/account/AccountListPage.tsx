import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Toast } from '@douyinfe/semi-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    listAccounts,
    createAccount,
    updateAccount,
    enableAccount,
    disableAccount,
    resetAccountPassword,
    type AccountView,
    type UpdateAccountPayload,
} from '../../lib/account';

const ACCOUNT_QUERY_KEY = ['accounts', 'list'];

/** 账号管理页面：列表（含筛选） + 新增/编辑弹层表单 + 启禁用开关 + 密码重置交互。 */
export function AccountListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [keyword, setKeyword] = useState('');
    const { data, isPending } = useQuery({
        queryKey: [...ACCOUNT_QUERY_KEY, keyword],
        queryFn: () => listAccounts(keyword ? { page: 1, size: 20, keyword } : { page: 1, size: 20 }),
    });

    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<AccountView | null>(null);
    const [resettingId, setResettingId] = useState<number | null>(null);

    const createMutation = useMutation({
        mutationFn: createAccount,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
            setCreating(false);
        },
        onError: () => Toast.error('新增失败：该账号标识已被占用'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateAccountPayload }) =>
            updateAccount(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
            setEditing(null);
        },
    });

    const toggleEnabledMutation = useMutation({
        mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => (enabled ? enableAccount(id) : disableAccount(id)),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY }),
    });

    const resetPasswordMutation = useMutation({
        mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => resetAccountPassword(id, newPassword),
        onSuccess: () => {
            Toast.success('密码重置成功');
            setResettingId(null);
        },
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>账号管理</h2>
                <Button theme="solid" onClick={() => setCreating(true)}>
                    新增账号
                </Button>
            </div>

            <Input
                placeholder="按用户名/手机号/邮箱搜索"
                value={keyword}
                onChange={setKeyword}
                style={{ width: 280, marginBottom: 16 }}
            />

            <Table
                loading={isPending}
                dataSource={data?.items ?? []}
                rowKey="id"
                pagination={false}
                columns={[
                    { title: '用户名', dataIndex: 'username' },
                    { title: '手机号', dataIndex: 'mobile' },
                    { title: '邮箱', dataIndex: 'email' },
                    { title: '账号类型', dataIndex: 'accountType' },
                    {
                        title: '状态',
                        dataIndex: 'enabled',
                        render: (enabled: boolean, record: AccountView) => (
                            <Switch
                                checked={enabled}
                                onChange={(checked) => toggleEnabledMutation.mutate({ id: record.id, enabled: checked })}
                            />
                        ),
                    },
                    {
                        title: '操作',
                        render: (_: unknown, record: AccountView) => (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="small" onClick={() => setEditing(record)}>
                                    编辑
                                </Button>
                                <Button size="small" onClick={() => setResettingId(record.id)}>
                                    重置密码
                                </Button>
                                <Button size="small" onClick={() => void navigate(`/accounts/${record.id}/login-logs`)}>
                                    登录日志
                                </Button>
                            </div>
                        ),
                    },
                ]}
            />

            {creating && (
                <Modal title="新增账号" visible onCancel={() => setCreating(false)} footer={null}>
                    <Form
                        onSubmit={(values: {
                            username: string;
                            password: string;
                            mobile?: string;
                            email?: string;
                            accountType?: string;
                        }) =>
                            createMutation.mutate({
                                username: values.username,
                                password: values.password,
                                mobile: values.mobile,
                                email: values.email,
                                accountType: values.accountType ?? 'backend',
                            })
                        }
                    >
                        <Form.Input field="username" label="用户名" rules={[{ required: true, message: '必填' }]} />
                        <Form.Input field="password" label="密码" mode="password" rules={[{ required: true, message: '必填' }]} />
                        <Form.Input field="mobile" label="手机号" />
                        <Form.Input field="email" label="邮箱" />
                        <Form.Select field="accountType" label="账号类型" initValue="backend">
                            <Form.Select.Option value="backend">后台</Form.Select.Option>
                            <Form.Select.Option value="user">前台</Form.Select.Option>
                        </Form.Select>
                        <Button htmlType="submit" theme="solid" loading={createMutation.isPending}>
                            提交
                        </Button>
                    </Form>
                </Modal>
            )}

            {editing && (
                <Modal title="编辑账号" visible onCancel={() => setEditing(null)} footer={null}>
                    <Form
                        initValues={{ mobile: editing.mobile ?? '', email: editing.email ?? '' }}
                        onSubmit={(values: { mobile?: string; email?: string }) =>
                            updateMutation.mutate({ id: editing.id, payload: { mobile: values.mobile, email: values.email } })
                        }
                    >
                        <Form.Input field="mobile" label="手机号" />
                        <Form.Input field="email" label="邮箱" />
                        <Button htmlType="submit" theme="solid" loading={updateMutation.isPending}>
                            保存
                        </Button>
                    </Form>
                </Modal>
            )}

            {resettingId !== null && (
                <Modal title="重置密码" visible onCancel={() => setResettingId(null)} footer={null}>
                    <Form
                        onSubmit={(values: { newPassword: string }) =>
                            resetPasswordMutation.mutate({ id: resettingId, newPassword: values.newPassword })
                        }
                    >
                        <Form.Input
                            field="newPassword"
                            label="新密码"
                            mode="password"
                            rules={[{ required: true, message: '必填' }]}
                        />
                        <Button htmlType="submit" theme="solid" loading={resetPasswordMutation.isPending}>
                            提交
                        </Button>
                    </Form>
                </Modal>
            )}
        </div>
    );
}

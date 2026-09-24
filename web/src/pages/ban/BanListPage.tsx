import { useState } from 'react';
import { Table, Button, Modal, Form, Popconfirm } from '@douyinfe/semi-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listBans, createBan, updateBan, deleteBan, type BanView, type UpdateBanPayload } from '../../lib/ban';

const BAN_QUERY_KEY = ['bans', 'list'];

/** 封禁管理页面：列表 + 新增/编辑弹层表单 + 删除。删除即视为解除该条封禁。 */
export function BanListPage() {
    const queryClient = useQueryClient();
    const { data, isPending } = useQuery({
        queryKey: BAN_QUERY_KEY,
        queryFn: () => listBans({ page: 1, size: 20 }),
    });

    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<BanView | null>(null);

    const createMutation = useMutation({
        mutationFn: createBan,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BAN_QUERY_KEY });
            setCreating(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateBanPayload }) => updateBan(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BAN_QUERY_KEY });
            setEditing(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteBan,
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: BAN_QUERY_KEY }),
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>风险拦截</h2>
                <Button theme="solid" onClick={() => setCreating(true)}>
                    新增封禁
                </Button>
            </div>

            <Table
                loading={isPending}
                dataSource={data?.items ?? []}
                rowKey="id"
                pagination={false}
                columns={[
                    { title: '账号类型', dataIndex: 'accountType' },
                    { title: '类型', dataIndex: 'type' },
                    { title: '值', dataIndex: 'value' },
                    { title: '备注', dataIndex: 'note' },
                    { title: '创建时间', dataIndex: 'createdAt' },
                    {
                        title: '操作',
                        render: (_: unknown, record: BanView) => (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="small" onClick={() => setEditing(record)}>
                                    编辑
                                </Button>
                                <Popconfirm title="确认解除该封禁？" onConfirm={() => deleteMutation.mutate(record.id)}>
                                    <Button size="small" type="danger">
                                        删除
                                    </Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            {creating && (
                <Modal title="新增封禁" visible onCancel={() => setCreating(false)} footer={null}>
                    <Form
                        onSubmit={(values: {
                            accountType?: string;
                            type?: string;
                            value: string;
                            ipStart?: number;
                            ipEnd?: number;
                            note?: string;
                        }) =>
                            createMutation.mutate({
                                accountType: values.accountType ?? 'backend',
                                type: values.type ?? 'ip',
                                value: values.value,
                                ipStart: Number(values.ipStart ?? 0),
                                ipEnd: Number(values.ipEnd ?? 0),
                                note: values.note,
                            })
                        }
                    >
                        <Form.Select field="accountType" label="账号类型" initValue="backend">
                            <Form.Select.Option value="backend">后台</Form.Select.Option>
                            <Form.Select.Option value="user">前台</Form.Select.Option>
                        </Form.Select>
                        <Form.Select field="type" label="封禁类型" initValue="ip">
                            <Form.Select.Option value="ip">IP</Form.Select.Option>
                            <Form.Select.Option value="device">设备</Form.Select.Option>
                        </Form.Select>
                        <Form.Input field="value" label="封禁值" rules={[{ required: true, message: '必填' }]} />
                        <Form.InputNumber field="ipStart" label="IP 段起始值" initValue={0} />
                        <Form.InputNumber field="ipEnd" label="IP 段结束值" initValue={0} />
                        <Form.Input field="note" label="备注" />
                        <Button htmlType="submit" theme="solid" loading={createMutation.isPending}>
                            提交
                        </Button>
                    </Form>
                </Modal>
            )}

            {editing && (
                <Modal title="编辑封禁" visible onCancel={() => setEditing(null)} footer={null}>
                    <Form
                        initValues={{
                            value: editing.value,
                            ipStart: editing.ipStart,
                            ipEnd: editing.ipEnd,
                            note: editing.note ?? '',
                        }}
                        onSubmit={(values: { value: string; ipStart?: number; ipEnd?: number; note?: string }) =>
                            updateMutation.mutate({
                                id: editing.id,
                                payload: {
                                    value: values.value,
                                    ipStart: Number(values.ipStart ?? 0),
                                    ipEnd: Number(values.ipEnd ?? 0),
                                    note: values.note,
                                },
                            })
                        }
                    >
                        <Form.Input field="value" label="封禁值" rules={[{ required: true, message: '必填' }]} />
                        <Form.InputNumber field="ipStart" label="IP 段起始值" />
                        <Form.InputNumber field="ipEnd" label="IP 段结束值" />
                        <Form.Input field="note" label="备注" />
                        <Button htmlType="submit" theme="solid" loading={updateMutation.isPending}>
                            保存
                        </Button>
                    </Form>
                </Modal>
            )}
        </div>
    );
}

import { useState } from 'react';
import { Table, Button, Modal, Form, Tag, Popconfirm, Tree, Toast } from '@douyinfe/semi-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    fetchRoleDetail,
    assignRolePermissions,
    listAllPermissions,
    type RoleView,
} from '../../lib/role';

const ROLE_QUERY_KEY = ['roles', 'list'];

/**
 * 角色管理页面：列表 + 新增/编辑弹层表单 + 删除 + 权限树分配。
 *
 * 每步操作成功后都 `invalidateQueries` 让列表重新拉取，不在前端手工拼接更新后的数据——
 * 后端是唯一真相源，前端缓存只是它的投影。
 */
export function RoleListPage() {
    const queryClient = useQueryClient();
    const { data, isPending } = useQuery({
        queryKey: ROLE_QUERY_KEY,
        queryFn: () => listRoles({ page: 1, size: 20 }),
    });

    const [editing, setEditing] = useState<RoleView | null>(null);
    const [creating, setCreating] = useState(false);
    const [assigningRoleId, setAssigningRoleId] = useState<number | null>(null);

    const createMutation = useMutation({
        mutationFn: createRole,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEY });
            setCreating(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: { title: string; description: string; enabled: boolean } }) =>
            updateRole(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEY });
            setEditing(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEY }),
        onError: () => Toast.error('删除失败：系统内置角色不允许删除，或角色不存在'),
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>角色管理</h2>
                <Button theme="solid" onClick={() => setCreating(true)}>
                    新增角色
                </Button>
            </div>

            <Table
                loading={isPending}
                dataSource={data?.items ?? []}
                rowKey="id"
                pagination={false}
                columns={[
                    { title: '角色标识', dataIndex: 'name' },
                    { title: '显示名', dataIndex: 'title' },
                    { title: '账号类型', dataIndex: 'accountType' },
                    {
                        title: '状态',
                        dataIndex: 'enabled',
                        render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'grey'}>{enabled ? '启用' : '禁用'}</Tag>,
                    },
                    {
                        title: '系统内置',
                        dataIndex: 'system',
                        render: (system: boolean) => (system ? <Tag color="orange">是</Tag> : '否'),
                    },
                    {
                        title: '操作',
                        render: (_: unknown, record: RoleView) => (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="small" onClick={() => setEditing(record)}>
                                    编辑
                                </Button>
                                <Button size="small" onClick={() => setAssigningRoleId(record.id)}>
                                    分配权限
                                </Button>
                                <Popconfirm
                                    title="确认删除该角色？"
                                    disabled={record.system}
                                    onConfirm={() => deleteMutation.mutate(record.id)}
                                >
                                    <Button size="small" type="danger" disabled={record.system}>
                                        删除
                                    </Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            {creating && (
                <Modal
                    title="新增角色"
                    visible
                    onCancel={() => setCreating(false)}
                    footer={null}
                >
                    <Form
                        onSubmit={(values: {
                            name: string;
                            title: string;
                            description?: string;
                            accountType?: string;
                        }) =>
                            createMutation.mutate({
                                name: values.name,
                                title: values.title,
                                description: values.description ?? '',
                                accountType: values.accountType ?? 'backend',
                            })
                        }
                    >
                        <Form.Input field="name" label="角色标识" rules={[{ required: true, message: '必填' }]} />
                        <Form.Input field="title" label="显示名" rules={[{ required: true, message: '必填' }]} />
                        <Form.Input field="description" label="描述" />
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
                <Modal title="编辑角色" visible onCancel={() => setEditing(null)} footer={null}>
                    <Form
                        initValues={{ title: editing.title, description: editing.description, enabled: editing.enabled }}
                        onSubmit={(values: { title: string; description?: string; enabled?: boolean }) =>
                            updateMutation.mutate({
                                id: editing.id,
                                payload: {
                                    title: values.title,
                                    description: values.description ?? '',
                                    enabled: values.enabled ?? true,
                                },
                            })
                        }
                    >
                        <Form.Input field="title" label="显示名" rules={[{ required: true, message: '必填' }]} />
                        <Form.Input field="description" label="描述" />
                        <Form.Switch field="enabled" label="启用" />
                        <Button htmlType="submit" theme="solid" loading={updateMutation.isPending}>
                            保存
                        </Button>
                    </Form>
                </Modal>
            )}

            {assigningRoleId !== null && (
                <PermissionAssignModal roleId={assigningRoleId} onClose={() => setAssigningRoleId(null)} />
            )}
        </div>
    );
}

function PermissionAssignModal({ roleId, onClose }: { roleId: number; onClose: () => void }) {
    const queryClient = useQueryClient();
    const { data: detail } = useQuery({
        queryKey: ['roles', 'detail', roleId],
        queryFn: () => fetchRoleDetail(roleId),
    });
    const { data: permissions } = useQuery({
        queryKey: ['permissions', 'all'],
        queryFn: listAllPermissions,
    });
    const [selected, setSelected] = useState<number[] | null>(null);

    const assignMutation = useMutation({
        mutationFn: (permissionIds: number[]) => assignRolePermissions(roleId, permissionIds),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEY });
            void queryClient.invalidateQueries({ queryKey: ['roles', 'detail', roleId] });
            onClose();
        },
    });

    const checkedKeys = selected ?? detail?.permissionIds.map(String) ?? [];
    const treeData = (permissions ?? []).map((permission) => ({
        key: String(permission.id),
        label: `${permission.title}（${permission.name}）`,
    }));

    return (
        <Modal title="分配权限" visible onCancel={onClose} onOk={() => assignMutation.mutate((selected ?? []).map(Number))} okButtonProps={{ loading: assignMutation.isPending }}>
            <Tree
                treeData={treeData}
                multiple
                checkable
                checkedKeys={checkedKeys}
                onChange={(keys) => setSelected((keys as string[]).map(Number))}
            />
        </Modal>
    );
}

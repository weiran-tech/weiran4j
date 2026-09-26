import { Button, Form, Input, Modal, Popconfirm, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar } from '@/components/SearchToolbar';
import { useConfigList, useDeleteConfig, useSaveConfig } from '@/hooks/queries/configs';
import { usePermission } from '@/hooks/usePermission';
import type { ConfigType, ConfigView } from '@/types/api';

interface ConfigForm {
    configKey: string;
    configValue: string;
    configType: ConfigType;
    description: string;
}

const TYPE_OPTIONS = [
    { label: '字符串 string', value: 'string' },
    { label: '数字 number', value: 'number' },
    { label: '布尔 boolean', value: 'boolean' },
    { label: 'JSON', value: 'json' },
];

/** 与后端同规则的前置校验（契约 §6.8），返回错误文案或 null */
export function validateConfigValue(type: ConfigType, value: string): string | null {
    const v = value ?? '';
    if (type === 'number' && (v.trim() === '' || Number.isNaN(Number(v)))) return '请输入合法数字';
    if (type === 'boolean' && v !== 'true' && v !== 'false') return '布尔值只能是 true 或 false';
    if (type === 'json') {
        try {
            JSON.parse(v);
        } catch {
            return 'JSON 格式不正确';
        }
    }
    return null;
}

function ConfigFormModal({ record, onClose }: { record: ConfigView | null; onClose: () => void }) {
    const isEdit = record !== null;
    const api = useRef<FormApi<ConfigForm> | null>(null);
    const save = useSaveConfig();

    const submit = async () => {
        const v = await api.current?.validate();
        if (!v) return;
        await save.mutateAsync({
            id: record?.id,
            body: { configKey: v.configKey.trim(), configValue: v.configValue ?? '', configType: v.configType, description: v.description || null },
        });
        Toast.success(isEdit ? '已保存' : '已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑配置' : '新增配置'}
            width={600}
            onCancel={onClose}
            onOk={() => submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Form<ConfigForm>
                getFormApi={(a) => {
                    api.current = a;
                }}
                initValues={{
                    configKey: record?.configKey ?? '',
                    configValue: record?.configValue ?? '',
                    configType: record?.configType ?? 'string',
                    description: record?.description ?? '',
                }}
                labelPosition="left"
                labelWidth={90}
            >
                <Form.Input
                    field="configKey"
                    label="配置键"
                    maxLength={128}
                    disabled={record?.isBuiltin ?? false}
                    placeholder="如 sys.site.title"
                    rules={[{ required: true, message: '请输入配置键' }]}
                />
                <Form.Select field="configType" label="类型" optionList={TYPE_OPTIONS} style={{ width: '100%' }} />
                <Form.TextArea
                    field="configValue"
                    label="配置值"
                    rows={4}
                    maxLength={4096}
                    rules={[
                        {
                            validator: (_r: unknown, value: unknown) =>
                                validateConfigValue(api.current?.getValue('configType') ?? 'string', typeof value === 'string' ? value : '') === null,
                            message: '配置值与类型不匹配（number 需为数字，boolean 需为 true/false，json 需可解析）',
                        },
                    ]}
                />
                <Form.TextArea field="description" label="描述" rows={2} maxLength={256} />
            </Form>
        </Modal>
    );
}

export default function ConfigsPage() {
    const { hasAnyPermission } = usePermission();
    const [draft, setDraft] = useState('');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [editing, setEditing] = useState<ConfigView | null | undefined>(undefined);
    const { data, isFetching } = useConfigList({ page, pageSize, ...(keyword ? { keyword } : {}) });
    const deleteConfig = useDeleteConfig();

    const columns: ColumnProps<ConfigView>[] = [
        {
            title: '配置键',
            dataIndex: 'configKey',
            width: 220,
            render: (v: string, r: ConfigView) => (
                <Space spacing={4}>
                    <Typography.Text copyable>{v}</Typography.Text>
                    {r.isBuiltin && (
                        <Tag size="small" color="blue">
                            内置
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: '配置值',
            dataIndex: 'configValue',
            render: (v: string) => <Typography.Text ellipsis={{ showTooltip: true }} style={{ maxWidth: 320 }}>{v}</Typography.Text>,
        },
        { title: '类型', dataIndex: 'configType', width: 80 },
        { title: '描述', dataIndex: 'description', render: (v: string | null) => v || '—' },
        { title: '更新时间', dataIndex: 'updatedAt', width: 164 },
    ];

    if (hasAnyPermission('system:config:update', 'system:config:delete')) {
        columns.push({
            title: '操作',
            dataIndex: 'actions',
            fixed: 'right',
            width: 120,
            render: (_: unknown, record: ConfigView) => (
                <Space spacing={4}>
                    <Permission code="system:config:update">
                        <Button theme="borderless" size="small" onClick={() => setEditing(record)}>
                            编辑
                        </Button>
                    </Permission>
                    <Permission code="system:config:delete">
                        <Popconfirm title="确定删除该配置？" onConfirm={() => deleteConfig.mutate(record.id, { onSuccess: () => Toast.success('已删除') })}>
                            <Button theme="borderless" type="danger" size="small" disabled={record.isBuiltin}>
                                删除
                            </Button>
                        </Popconfirm>
                    </Permission>
                </Space>
            ),
        });
    }

    const search = () => {
        setKeyword(draft.trim());
        setPage(1);
    };

    return (
        <PageContainer>
            <SearchToolbar
                onSearch={search}
                onReset={() => {
                    setDraft('');
                    setKeyword('');
                    setPage(1);
                }}
                actions={
                    <Permission code="system:config:create">
                        <Button type="primary" theme="solid" icon={<Plus size={14} />} onClick={() => setEditing(null)}>
                            新增配置
                        </Button>
                    </Permission>
                }
            >
                <Input placeholder="配置键 / 描述" value={draft} onChange={setDraft} onEnterPress={search} showClear style={{ width: 220 }} />
            </SearchToolbar>
            <Table<ConfigView>
                rowKey="id"
                columns={columns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                scroll={{ x: 1000 }}
                pagination={{
                    currentPage: page,
                    pageSize,
                    total: data?.total ?? 0,
                    showSizeChanger: true,
                    showTotal: true,
                    onChange: (p, s) => {
                        setPage(p);
                        setPageSize(s);
                    },
                }}
            />
            {editing !== undefined && <ConfigFormModal record={editing} onClose={() => setEditing(undefined)} />}
        </PageContainer>
    );
}

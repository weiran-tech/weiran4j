import { Button, Form, Input, Modal, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useRef, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useConfigList, useDeleteConfig, useSaveConfig } from '@/hooks/queries/configs';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
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
            body: {
                configKey: v.configKey.trim(),
                configValue: v.configValue ?? '',
                configType: v.configType,
                description: v.description || null,
            },
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
                                validateConfigValue(
                                    api.current?.getValue('configType') ?? 'string',
                                    typeof value === 'string' ? value : '',
                                ) === null,
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
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [editing, setEditing] = useState<ConfigView | null | undefined>(undefined);
    const { data, isFetching, refetch } = useConfigList({ page, pageSize, ...(keyword ? { keyword } : {}) });
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
            render: (v: string) => (
                <Typography.Text ellipsis={{ showTooltip: true }} style={{ maxWidth: 320 }}>
                    {v}
                </Typography.Text>
            ),
        },
        { title: '类型', dataIndex: 'configType', width: 80 },
        { title: '描述', dataIndex: 'description', render: (v: string | null) => v || '—' },
        { title: '更新时间', dataIndex: 'updatedAt', width: 164 },
    ];

    const configActions = (record: ConfigView): TableAction[] => [
        { key: 'edit', label: '编辑', permission: 'system:config:update', onClick: () => setEditing(record) },
        {
            key: 'delete',
            label: '删除',
            permission: 'system:config:delete',
            danger: true,
            disabled: record.isBuiltin,
            confirm: { title: '确定删除该配置？' },
            onClick: () => deleteConfig.mutate(record.id, { onSuccess: () => Toast.success('已删除') }),
        },
    ];
    if (hasAnyPermission('system:config:update', 'system:config:delete')) {
        columns.push({ title: '操作', dataIndex: 'actions', fixed: 'right', width: 120 });
    }

    const search = () => {
        setKeyword(draft.trim());
        setPage(1);
    };

    const reset = () => {
        setDraft('');
        setKeyword('');
        setPage(1);
    };
    const conditions: SearchCondition[] = keyword ? [{ key: 'keyword', label: '关键字', value: keyword, onRemove: reset }] : [];

    const { columns: settledColumns, columnSettings } = useColumnSettings('system/configs', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, configActions);

    return (
        <PageContainer>
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                conditions={conditions}
                leading={
                    <Permission code="system:config:create">
                        <Button type="primary" theme="solid" onClick={() => setEditing(null)}>
                            新增配置
                        </Button>
                    </Permission>
                }
            >
                <Input
                    placeholder="配置键 / 描述"
                    value={draft}
                    onChange={setDraft}
                    onEnterPress={search}
                    showClear
                    style={{ width: 220 }}
                />
            </SearchToolbar>
            <Table<ConfigView>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns) }}
                pagination={{
                    currentPage: page,
                    pageSize,
                    pageSizeOpts,
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

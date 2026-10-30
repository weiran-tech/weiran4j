import { Button, Dropdown, Empty, Form, Modal, Pagination, Space, Tag, Toast, Tooltip } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { parseConfigFieldOptions, SystemConfigGroupForm } from '@/components/SystemConfigGroupForm';
import { NavListItem, NavListPanel } from '@/components/NavListPanel';
import { Permission } from '@/components/Permission';
import {
    useConfigAll,
    useConfigGroups,
    useCreateConfigGroup,
    useDeleteConfig,
    useDeleteConfigGroup,
    useSaveConfig,
    useUpdateConfigGroup,
} from '@/hooks/queries/configs';
import { usePermission } from '@/hooks/usePermission';
import { useTableDefaults } from '@/hooks/useTableDefaults';
import type { ConfigFieldType, ConfigGroupView, ConfigSaveRequest, ConfigView } from '@/types/api';

interface ConfigMetadataForm {
    configKey: string;
    configValue: string;
    groupKey: string;
    fieldType: ConfigFieldType;
    fieldOptions: string;
    required: boolean;
    description: string;
}

type ConfigDomain = 'config_system' | 'config_sms';

const FIELD_OPTIONS = [
    { label: '单行输入', value: 'input' },
    { label: '多行文本', value: 'textarea' },
    { label: '数字', value: 'number' },
    { label: '开关', value: 'switch' },
    { label: '下拉选择', value: 'select' },
    { label: 'JSON', value: 'json' },
    { label: '多文件上传', value: 'files' },
    { label: '单文件上传', value: 'file' },
    { label: '富文本', value: 'richtext' },
];

function configType(fieldType: ConfigFieldType): ConfigSaveRequest['configType'] {
    if (fieldType === 'number') return 'number';
    if (fieldType === 'switch') return 'boolean';
    if (fieldType === 'json' || fieldType === 'files') return 'json';
    return 'string';
}

function ConfigMetadataModal({
    record,
    domain,
    defaultGroup,
    groups,
    canDelete,
    onDelete,
    onClose,
}: {
    record: ConfigView | null;
    domain: ConfigDomain;
    defaultGroup?: { key: string; label: string } | undefined;
    groups: Array<{ key: string; label: string }>;
    canDelete: boolean;
    onDelete: (record: ConfigView) => void;
    onClose: () => void;
}) {
    const api = useRef<FormApi<ConfigMetadataForm> | null>(null);
    const save = useSaveConfig();
    const isEdit = record !== null;

    const submit = async () => {
        const value = await api.current?.validate();
        if (!value) return;
        const type = configType(value.fieldType);
        const body: ConfigSaveRequest = {
            configKey: value.configKey.trim(),
            configValue: value.fieldType === 'files' && !value.configValue?.trim() ? '[]' : value.configValue ?? '',
            configType: type,
            groupKey: value.groupKey.trim(),
            fieldType: value.fieldType,
            fieldOptions: value.fieldType === 'select' ? value.fieldOptions.trim() || null : null,
            required: value.required,
            description: value.description.trim() || null,
        };
        await save.mutateAsync({ id: record?.id, body });
        Toast.success(isEdit ? '配置项已更新' : '配置项已创建');
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑配置项' : '新增配置项'}
            width={640}
            onCancel={onClose}
            footer={
                <div className="config-metadata-modal__footer">
                    {record ? (
                        <Button
                            type="danger"
                            theme="borderless"
                            disabled={!canDelete || record.isBuiltin}
                            onClick={() => { onClose(); onDelete(record); }}
                        >
                            删除配置项
                        </Button>
                    ) : <span />}
                    <Space>
                        <Button onClick={onClose}>取消</Button>
                        <Button type="primary" theme="solid" loading={save.isPending} onClick={() => submit().catch(() => undefined)}>
                            {isEdit ? '保存' : '新增'}
                        </Button>
                    </Space>
                </div>
            }
            maskClosable={false}
        >
            <Form<ConfigMetadataForm>
                getFormApi={(formApi) => {
                    api.current = formApi;
                }}
                initValues={{
                    configKey: record?.configKey ?? `${domain === 'config_sms' ? 'sms' : 'system'}.${defaultGroup?.key ?? 'general'}.`,
                    configValue: record?.configValue ?? '',
                    groupKey: record?.groupKey ?? defaultGroup?.key ?? 'general',
                    fieldType: record?.fieldType ?? 'input',
                    fieldOptions: record?.fieldOptions ?? '',
                    required: record?.required ?? false,
                    description: record?.description ?? '',
                }}
                labelPosition="left"
                labelWidth={110}
            >
                <Form.Input
                    field="configKey"
                    label="配置键"
                    maxLength={128}
                    disabled={record?.isBuiltin ?? false}
                    rules={[
                        { required: true, message: '请输入配置键' },
                        {
                            validator: (_rule: unknown, value: unknown) => {
                                const key = typeof value === 'string' ? value.trim() : '';
                                const groupKey = api.current?.getValue('groupKey');
                                if (record && key === record.configKey && groupKey === record.groupKey) return true;
                                const parts = key.split('.');
                                return parts.length === 3
                                    && parts[0] === (domain === 'config_sms' ? 'sms' : 'system')
                                    && parts[1] === groupKey
                                    && /^[a-z][a-z0-9_-]*$/.test(parts[2] ?? '');
                            },
                            message: '配置键须为 {范围}.{分组}.{配置项}，且分组与所选配置分组一致',
                        },
                    ]}
                />
                <Form.Select
                    field="groupKey"
                    label="配置分组"
                    optionList={groups.map((group) => ({ label: group.label, value: group.key }))}
                    style={{ width: '100%' }}
                    rules={[{ required: true, message: '请选择分组' }]}
                />
                <Form.Select field="fieldType" label="表单字段" optionList={FIELD_OPTIONS} style={{ width: '100%' }} />
                <Form.TextArea
                    field="fieldOptions"
                    label="下拉选项 JSON（仅下拉选择使用）"
                    rows={3}
                    placeholder={'[{"label":"选项一","value":"one"}]'}
                    rules={[
                        {
                            validator: (_rule: unknown, value: unknown) => {
                                if (api.current?.getValue('fieldType') !== 'select' || !value) return true;
                                return parseConfigFieldOptions(typeof value === 'string' ? value : '').length > 0;
                            },
                            message: '请输入有效的选项数组 JSON',
                        },
                    ]}
                />
                <Form.Input
                    field="configValue"
                    label="初始值 / 当前值"
                    maxLength={65535}
                />
                <Form.Checkbox field="required" label="必填" />
                <Form.TextArea field="description" label="说明" rows={2} maxLength={256} />
            </Form>
        </Modal>
    );
}

function ConfigGroupModal({
    record,
    domain,
    onClose,
    onCreated,
}: {
    record: ConfigGroupView | null;
    domain: ConfigDomain;
    onClose: () => void;
    onCreated: (key: string) => void;
}) {
    const api = useRef<FormApi<{ key: string; label: string }> | null>(null);
    const createGroup = useCreateConfigGroup();
    const updateGroup = useUpdateConfigGroup();
    const isEdit = record !== null;

    const submit = async () => {
        const value = await api.current?.validate();
        if (!value) return;
        const key = record?.key ?? value.key.trim();
        if (record) {
            await updateGroup.mutateAsync({ key, body: { label: value.label.trim() }, groupKey: domain });
            Toast.success('配置分组已更新');
        } else {
            await createGroup.mutateAsync({ key, label: value.label.trim(), ...(domain === 'config_sms' ? { groupKey: domain } : {}) });
            Toast.success('配置分组已创建');
        }
        onCreated(key);
        onClose();
    };

    return (
        <Modal
            visible
            title={isEdit ? '编辑配置分组' : '新增配置分组'}
            okText={isEdit ? '保存' : '新增'}
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: createGroup.isPending || updateGroup.isPending }}
            maskClosable={false}
        >
            <Form<{ key: string; label: string }>
                getFormApi={(formApi) => {
                    api.current = formApi;
                }}
                initValues={{ key: record?.key ?? '', label: record?.label ?? '' }}
                labelPosition="left"
                labelWidth={100}
            >
                <Form.Input
                    field="key"
                    label="分组编码"
                    maxLength={64}
                    disabled={isEdit}
                    rules={[
                        { required: true, message: '请输入分组编码' },
                        { pattern: /^[a-z][a-z0-9_-]*$/, message: '以小写字母开头，只能包含小写字母、数字、下划线和连字符' },
                    ]}
                />
                <Form.Input field="label" label="分组名称" maxLength={64} rules={[{ required: true, message: '请输入分组名称' }]} />
            </Form>
        </Modal>
    );
}

export default function ConfigsPage({ domain = 'config_system' }: { domain?: ConfigDomain }) {
    const { hasAnyPermission } = usePermission();
    const { data } = useConfigAll();
    const { data: groupCatalog = [], isFetching: isFetchingGroups, refetch: refetchGroups } = useConfigGroups();
    const domainGroups = groupCatalog.filter((group) => group.groupKey === domain);
    const deleteConfig = useDeleteConfig();
    const deleteConfigGroup = useDeleteConfigGroup();
    const [editing, setEditing] = useState<ConfigView | null | undefined>(undefined);
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ConfigGroupView | null | undefined>(undefined);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [showConfigSettings, setShowConfigSettings] = useState(false);
    const [groupDraft, setGroupDraft] = useState('');
    const [groupKeyword, setGroupKeyword] = useState('');
    const [page, setPage] = useState(1);
    const { pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const canEdit = hasAnyPermission('system:config:update');
    const canDelete = hasAnyPermission('system:config:delete');
    const canCreate = hasAnyPermission('system:config:create');
    const filteredGroups = domainGroups.filter((group) => `${group.label} ${group.key}`.toLowerCase().includes(groupKeyword.toLowerCase()));
    const pageCount = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const pageGroups = filteredGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const selectedGroup = pageGroups.find((group) => group.key === activeGroup) ?? pageGroups[0] ?? null;
    const selectedRecords = selectedGroup
        ? (data ?? []).filter((record) => record.groupKey === selectedGroup.key && record.configKey.startsWith(domain === 'config_sms' ? 'sms.' : 'system.'))
        : [];

    const searchGroups = () => {
        setGroupKeyword(groupDraft.trim());
        setPage(1);
    };

    const removeConfig = (record: ConfigView) => {
        Modal.confirm({
            title: '确定删除该配置项？',
            content: record.configKey,
            onOk: () => deleteConfig.mutateAsync(record.id).then(() => Toast.success('配置项已删除')),
        });
    };

    const removeConfigGroup = (group: ConfigGroupView) => {
        Modal.confirm({
            title: `确定删除配置分组「${group.label}」？`,
            content: '仅空的自定义分组可以删除',
            okText: '删除',
            okButtonProps: { type: 'danger', theme: 'solid' },
            onOk: () =>
                deleteConfigGroup.mutateAsync({ key: group.key, groupKey: domain }).then(() => {
                    setActiveGroup(null);
                    Toast.success('配置分组已删除');
                }),
        });
    };

    return (
        <div className="config-groups-layout">
            <div className="config-groups-layout__master">
                <NavListPanel
                    title="配置分组"
                    headerExtra={
                        <>
                            {canEdit && (
                                <Tooltip content={showConfigSettings ? '关闭设置' : '显示设置'}>
                                    <Button
                                        theme="borderless"
                                        size="small"
                                        aria-label={showConfigSettings ? '关闭设置' : '显示设置'}
                                        icon={showConfigSettings ? <EyeOff size={14} /> : <Eye size={14} />}
                                        onClick={() => setShowConfigSettings((visible) => !visible)}
                                    />
                                </Tooltip>
                            )}
                            <Tooltip content="刷新配置分组">
                                <Button
                                    theme="borderless"
                                    size="small"
                                    aria-label="刷新配置分组"
                                    icon={<RefreshCw size={14} />}
                                    loading={isFetchingGroups}
                                    onClick={() => void refetchGroups()}
                                />
                            </Tooltip>
                            {canCreate && (
                                <Tooltip content="新增分组">
                                    <Button
                                        theme="borderless"
                                        size="small"
                                        aria-label="新增分组"
                                        icon={<Plus size={14} />}
                                        onClick={() => setCreatingGroup(true)}
                                    />
                                </Tooltip>
                            )}
                        </>
                    }
                    search={{
                        value: groupDraft,
                        onChange: setGroupDraft,
                        placeholder: '名称 / 编码',
                        onEnterPress: searchGroups,
                    }}
                    loading={isFetchingGroups && domainGroups.length === 0}
                    emptyText={groupKeyword ? '没有匹配的配置分组' : '暂无配置分组'}
                    footer={
                        <Pagination
                            size="small"
                            total={filteredGroups.length}
                            currentPage={currentPage}
                            pageSize={pageSize}
                            pageSizeOpts={pageSizeOpts}
                            showSizeChanger
                            onPageChange={setPage}
                            onPageSizeChange={(size) => {
                                setPage(1);
                                setPageSize(size);
                            }}
                        />
                    }
                    dataSource={pageGroups}
                    renderItem={(group) => (
                        <NavListItem
                            key={group.key}
                            active={selectedGroup?.key === group.key}
                            onClick={() => setActiveGroup(group.key)}
                            primary={group.label}
                            secondary={group.key}
                            meta={
                                <>
                                    <span>{group.createdAt ?? ''}</span>
                                    {group.isBuiltin && <Tag size="small" color="blue">内置</Tag>}
                                </>
                            }
                            {...((canEdit || canDelete) && {
                                extra: (
                                    <Dropdown
                                        trigger="click"
                                        position="bottomRight"
                                        clickToHide
                                        render={
                                            <Dropdown.Menu>
                                                {canEdit && (
                                                    <Dropdown.Item icon={<Pencil size={14} />} onClick={() => setEditingGroup(group)}>
                                                        编辑
                                                    </Dropdown.Item>
                                                )}
                                                {canDelete && (
                                                    <Dropdown.Item
                                                        type="danger"
                                                        icon={<Trash2 size={14} />}
                                                        disabled={!group.canDelete}
                                                        onClick={() => removeConfigGroup(group)}
                                                    >
                                                        {group.canDelete
                                                            ? '删除'
                                                            : group.isBuiltin
                                                              ? '内置分组不可删除'
                                                              : '分组下仍有配置项不可删除'}
                                                    </Dropdown.Item>
                                                )}
                                            </Dropdown.Menu>
                                        }
                                    >
                                        <Button theme="borderless" size="small" aria-label={`${group.label}的操作`} icon={<MoreHorizontal size={14} />} />
                                    </Dropdown>
                                ),
                            })}
                        />
                    )}
                />
            </div>
            <PageContainer
                title={
                    selectedGroup?.label ?? (domain === 'config_sms' ? '短信配置' : '系统配置')
                }
                extra={
                    <Permission code="system:config:create">
                        <Button type="primary" theme="solid" icon={<Plus size={16} />} onClick={() => setEditing(null)}>
                            新增配置项
                        </Button>
                    </Permission>
                }
            >
            <Space vertical align="start" style={{ width: '100%' }} spacing={16}>
                {!selectedGroup ? (
                    <Empty title="暂无配置分组" description="请使用左侧分组菜单新增配置分组" style={{ padding: 48 }} />
                ) : (
                    <SystemConfigGroupForm
                        key={`${selectedGroup.key}-${selectedRecords.map((record) => record.id).join('-')}`}
                        records={selectedRecords}
                        canEdit={canEdit}
                        showSettings={showConfigSettings}
                        onEdit={(record) => setEditing(record)}
                    />
                )}
            </Space>
            </PageContainer>
            {editing !== undefined && (
                <ConfigMetadataModal
                    record={editing}
                    domain={domain}
                    defaultGroup={selectedGroup ?? undefined}
                    groups={domainGroups}
                    canDelete={canDelete}
                    onDelete={removeConfig}
                    onClose={() => setEditing(undefined)}
                />
            )}
            {creatingGroup && (
                <ConfigGroupModal
                    record={null}
                    domain={domain}
                    onClose={() => setCreatingGroup(false)}
                    onCreated={(key) => {
                        setGroupDraft('');
                        setGroupKeyword('');
                        const createdIndex = domainGroups.findIndex((group) => group.key === key);
                        setPage(Math.ceil(((createdIndex >= 0 ? createdIndex : domainGroups.length) + 1) / pageSize));
                        setActiveGroup(key);
                    }}
                />
            )}
            {editingGroup && (
                <ConfigGroupModal
                    record={editingGroup}
                    domain={domain}
                    onClose={() => setEditingGroup(undefined)}
                    onCreated={(key) => {
                        setGroupKeyword('');
                        setActiveGroup(key);
                    }}
                />
            )}
        </div>
    );
}
